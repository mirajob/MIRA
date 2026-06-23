"use server";

import { chatCompletion } from "@mira/ai";
import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sendAcceptanceEmail } from "@/lib/email";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function changeCandidateStatus(
  applicationId: string,
  newStatus: string,
  note?: string
) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  const { data: application } = await supabase
    .from("applications")
    .select("id, status, association_id, student_user_id, association_profiles(slug)")
    .eq("id", applicationId)
    .single();

  if (!application) return { error: "Candidatura non trovata" };

  const { data: membership } = await supabase
    .from("association_memberships")
    .select("role, permissions")
    .eq("association_id", application.association_id)
    .eq("user_id", ctx.profile.id)
    .eq("status", "active")
    .maybeSingle();

  const canChange =
    ctx.isMiraAdmin ||
    membership?.role === "association_president" ||
    (membership?.permissions as Record<string, boolean>)?.change_candidate_status;

  if (!canChange) return { error: "Non hai i permessi" };

  await supabase
    .from("applications")
    .update({
      status: newStatus,
      last_status_change_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  await supabase.from("application_status_events").insert({
    application_id: applicationId,
    previous_status: application.status,
    new_status: newStatus,
    changed_by_user_id: ctx.profile.id,
    note: note || null,
    visible_to_candidate: true,
  });

  await supabase.from("audit_logs").insert({
    actor_user_id: ctx.profile.id,
    action: "candidate_status_changed",
    entity_type: "application",
    entity_id: applicationId,
    metadata: {
      previous_status: application.status,
      new_status: newStatus,
    },
  });

  // Auto-membership + email on acceptance
  if (newStatus === "accepted") {
    const studentUserId = (application as any).student_user_id as string;
    if (studentUserId) {
      const selectedPosition = (application as any).selected_role_preferences?.[0];
      const { data: existingMembership } = await (supabase.from("association_memberships") as any)
        .select("id")
        .eq("association_id", application.association_id)
        .eq("user_id", studentUserId)
        .maybeSingle();

      if (!existingMembership) {
        await (supabase.from("association_memberships") as any).insert({
          association_id: application.association_id,
          user_id: studentUserId,
          role: "association_member",
          title: selectedPosition && selectedPosition !== "generica" ? selectedPosition : null,
          status: "active",
          joined_at: new Date().toISOString(),
        });
      }

      // Send acceptance email
      const { data: candidateProfile } = await (supabase.from("profiles") as any)
        .select("full_name, email")
        .eq("id", studentUserId)
        .single();

      const assocSlug = (application.association_profiles as { slug: string })?.slug;
      const { data: assocData } = await (supabase.from("association_profiles") as any)
        .select("name")
        .eq("id", application.association_id)
        .single();

      if (candidateProfile?.email) {
        sendAcceptanceEmail({
          candidateEmail: candidateProfile.email,
          candidateName: candidateProfile.full_name || "candidato/a",
          associationName: assocData?.name || "l'associazione",
        }).catch((err) => console.error("Acceptance email error:", err));
      }
    }
  }

  const slug = (application.association_profiles as { slug: string })?.slug;
  revalidatePath(`/association/${slug}/candidates`);
  revalidatePath(`/association/${slug}/candidates/${applicationId}`);
  return { success: true };
}

export async function addCandidateNote(applicationId: string, noteText: string) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  const { data: application } = await supabase
    .from("applications")
    .select("association_id, association_profiles(slug)")
    .eq("id", applicationId)
    .single();

  if (!application) return { error: "Candidatura non trovata" };

  const { data: membership } = await supabase
    .from("association_memberships")
    .select("role, permissions")
    .eq("association_id", application.association_id)
    .eq("user_id", ctx.profile.id)
    .eq("status", "active")
    .maybeSingle();

  const canNote =
    ctx.isMiraAdmin ||
    membership?.role === "association_president" ||
    (membership?.permissions as Record<string, boolean>)?.add_internal_candidate_notes;

  if (!canNote) return { error: "Non hai i permessi" };

  await supabase.from("candidate_internal_notes").insert({
    application_id: applicationId,
    author_user_id: ctx.profile.id,
    note_text: noteText,
  });

  const slug = (application.association_profiles as { slug: string })?.slug;
  revalidatePath(`/association/${slug}/candidates/${applicationId}`);
  return { success: true };
}

export async function evaluateCandidate(applicationId: string) {
  const supabase = await createServiceClient();

  const { data: application } = await (supabase.from("applications") as any)
    .select("id, association_id, student_user_id, selected_role_preferences, application_answers(answer_text, application_questions(question_text, question_type))")
    .eq("id", applicationId)
    .single();

  if (!application) return { error: "Candidatura non trovata" };

  const { data: student } = await (supabase.from("student_profiles") as any)
    .select("profile_summary, degree_program, degree_level, current_year, interests, goals, experiences, transcript_summary")
    .eq("user_id", application.student_user_id)
    .single();

  const { data: association } = await (supabase.from("association_profiles") as any)
    .select("name, category, short_description, long_description")
    .eq("id", application.association_id)
    .single();

  const { data: cycle } = await (supabase.from("application_cycles") as any)
    .select("title, description, available_roles")
    .eq("association_id", application.association_id)
    .eq("status", "open")
    .maybeSingle();

  const answers = (application.application_answers ?? [])
    .map((a: any) => `Q: ${a.application_questions?.question_text}\nA: ${a.answer_text}`)
    .join("\n\n");

  const positions = (cycle?.available_roles ?? []) as Array<{ name: string; description?: string; requirements?: string }>;
  const selectedPosition = (application.selected_role_preferences ?? [])[0] || "generica";

  const positionsText = positions.map((p) =>
    `- ${p.name}${p.description ? `: ${p.description}` : ""}${p.requirements ? ` [REQUISITI: ${p.requirements}]` : ""}`
  ).join("\n");

  const prompt = `Valuta questo candidato per l'associazione ${association?.name}.

ASSOCIAZIONE: ${association?.name} (${association?.category})
${association?.short_description || ""}

POSIZIONE SCELTA DAL CANDIDATO: ${selectedPosition}

TUTTE LE POSIZIONI DISPONIBILI (con requisiti):
${positionsText || "Candidatura generica"}

PROFILO CANDIDATO:
${student?.profile_summary || "Nessun profilo disponibile"}
Corso: ${student?.degree_program || "?"} (${student?.degree_level || "?"})
Anno: ${student?.current_year || "?"}
Interessi: ${(student?.interests ?? []).join(", ") || "non specificati"}
Obiettivi: ${(student?.goals ?? []).join(", ") || "non specificati"}
Esperienze: ${(student?.experiences ?? []).join(", ") || "nessuna"}
${student?.transcript_summary?.weighted_average ? `Media: ${student.transcript_summary.weighted_average}/30` : ""}

RISPOSTE CANDIDATURA:
${answers || "Nessuna risposta"}

Rispondi in JSON con questa struttura:
{
  "selected_position": "${selectedPosition}",
  "overall_fit_category": "strong_fit|good_fit|uncertain_fit|weak_fit",
  "overall_fit_summary": "2-3 frasi sulla compatibilità GENERALE con l'associazione",
  "position_fit": {
    "${selectedPosition}": {
      "fit_category": "strong_fit|good_fit|uncertain_fit|weak_fit",
      "reason": "perché è o non è adatto per QUESTA posizione specifica"
    }
  },
  "alternative_positions": [
    {"name": "altra posizione", "fit_category": "...", "reason": "perché sarebbe adatto qui"}
  ],
  "confidence": "high|medium|low",
  "strengths": ["punto di forza 1", "punto di forza 2"],
  "gaps": ["gap 1", "gap 2"],
  "suggested_position": "la posizione migliore per questo candidato",
  "interview_questions": ["domanda 1", "domanda 2"]
}

IMPORTANTE:
- Valuta il fit sia per la posizione SCELTA sia per l'associazione in generale
- Se il candidato è weak per la posizione scelta ma strong per un'altra, segnalalo in alternative_positions
- overall_fit_category è il fit GENERALE per l'associazione, non per la singola posizione`;

  try {
    const result = await chatCompletion(
      [
        { role: "system", content: "Sei un valutatore AI per candidature universitarie. Valuta in modo oggettivo, basandoti su evidenze concrete del profilo e delle risposte. Non inventare. Rispondi SOLO in JSON." },
        { role: "user", content: prompt },
      ],
      { temperature: 0.2, maxTokens: 1024, jsonMode: true }
    );

    const evaluation = JSON.parse(result);

    await (supabase.from("candidate_ai_evaluations") as any).insert({
      application_id: applicationId,
      model_provider: "openai",
      model_name: "gpt-4o",
      evaluation_json: evaluation,
      overall_fit_category: evaluation.overall_fit_category,
      confidence: evaluation.confidence,
      fit_summary: evaluation.fit_summary,
      strengths: evaluation.strengths,
      gaps: evaluation.gaps,
      input_snapshot: { student_summary: student?.profile_summary, answers_count: (application.application_answers ?? []).length },
    });

    return { success: true };
  } catch (err) {
    console.error("AI evaluation error:", err);
    return { error: "Errore nella valutazione AI" };
  }
}
