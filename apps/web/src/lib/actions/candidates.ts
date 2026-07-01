"use server";

import { chatCompletion } from "@mira/ai";
import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";

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

  // Auto-membership on acceptance (email is handled by the composer in interview.ts)
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
    .select("profile_summary, degree_program, degree_level, current_year, interests, goals, experiences, transcript_summary, availability, privacy_settings")
    .eq("user_id", application.student_user_id)
    .single();

  const { data: association } = await (supabase.from("association_profiles") as any)
    .select("name, category, short_description, long_description")
    .eq("id", application.association_id)
    .single();

  const { data: cycle } = await (supabase.from("application_cycles") as any)
    .select("title, description, available_roles, evaluation_criteria")
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

  // Build rich student context
  const avail = student?.availability as Record<string, any> ?? {};
  const ct = avail.career_targets ?? {};
  const cp = avail.career_plan ?? {};
  const ws = avail.work_style ?? {};
  const pd = avail.previous_degree ?? {};
  const pi = avail.personal_interests ?? [];
  const ts = student?.transcript_summary;
  const privacy = (student?.privacy_settings as Record<string, boolean>) ?? {};
  const gradesShared = privacy.show_grades_to_associations === true;

  const degreeProgram = student?.degree_program || ts?.degree_program || null;
  const degreeLevel = student?.degree_level || null;

  let studentContext = `PROFILO COMPLETO CANDIDATO:
Riassunto: ${student?.profile_summary || "Non disponibile"}
Corso di laurea: ${degreeProgram || "non specificato"} — ${degreeLevel || "livello non specificato"}
NOTA PROGRAMMA: I programmi Bocconi come CLEAM (Economics and Management), BIEM (International Economics and Management), BIEMF (Economics and Finance), BAI (Business Analytics), BESS (Economics and Social Sciences) indicano la specializzazione dello studente. Tieni conto di questa specializzazione nella valutazione.
Anno: ${student?.current_year || "?"}
${gradesShared && ts?.weighted_average ? `Media ponderata: ${ts.weighted_average}/30` : ""}
${ts?.total_credits ? `Crediti: ${ts.total_credits} CFU` : ""}

INTERESSI: ${(student?.interests ?? []).join(", ") || "non specificati"}
OBIETTIVI: ${(student?.goals ?? []).join(", ") || "non specificati"}
ESPERIENZE: ${(student?.experiences ?? []).join("\n- ") || "nessuna"}
INTERESSI PERSONALI: ${pi.join(", ") || "non specificati"}

TARGET CARRIERA: ruoli=${(ct.roles ?? []).join(", ")}, settori=${(ct.sectors ?? []).join(", ")}, aziende=${(ct.companies ?? []).join(", ")}, geografie=${(ct.geography ?? []).join(", ")}
PIANO CARRIERA: breve termine=${cp.short_term || "?"}, medio termine=${cp.medium_term || "?"}, exchange=${cp.exchange_interest || "?"}, magistrale=${cp.masters_interest || "?"}, chiarezza=${cp.clarity_level || "?"}
STILE LAVORO: leadership=${ws.leadership || "?"}, teamwork=${ws.teamwork_preference || "?"}, stile=${ws.style || "?"}, comunicazione=${ws.communication || "?"}, punti forza=${(ws.strengths ?? []).join(", ")}, da migliorare=${(ws.improvements ?? []).join(", ")}`;

  if (pd.university) {
    studentContext += `\nPERCORSO PRECEDENTE: ${pd.university}, ${pd.program || "?"}, voto ${pd.grade || "?"}, tesi: ${pd.thesis_topic || "?"}`;
  }

  if (ts?.courses?.length) {
    // Include all course names so AI can detect language of instruction
    const allCourseNames = ts.courses.map((c: any) => c.course_name).join(", ");
    studentContext += `\nCORSI UNIVERSITARI (tutti): ${allCourseNames}`;
    studentContext += `\nNOTA LINGUA: I corsi universitari a Bocconi sono tenuti principalmente in inglese. Se i nomi dei corsi sono in inglese, lo studente studia in lingua inglese.`;

    if (gradesShared) {
      const topCourses = ts.courses.filter((c: any) => c.grade_numeric >= 28).slice(0, 5);
      if (topCourses.length) {
        studentContext += `\nVOTI MIGLIORI: ${topCourses.map((c: any) => `${c.course_name} (${c.grade})`).join(", ")}`;
      }
    }
  }

  const evalCriteria = (cycle?.evaluation_criteria as Record<string, any>)?.general_requirements || "";

  const prompt = `Genera una SCHEDA CANDIDATO NARRATIVA per l'associazione ${association?.name}.

ASSOCIAZIONE: ${association?.name} (${association?.category})
${association?.short_description || ""}
${association?.long_description || ""}
${evalCriteria ? `\nCRITERI DI VALUTAZIONE DELL'ASSOCIAZIONE:\n${evalCriteria}` : ""}

POSIZIONE SCELTA DAL CANDIDATO: ${selectedPosition}
POSIZIONI DISPONIBILI:
${positionsText || "Nessuna posizione specifica — candidatura generica"}

${studentContext}

RISPOSTE CANDIDATURA:
${answers || "Nessuna risposta specifica"}

Rispondi in JSON con questa struttura:
{
  "overall_fit_category": "strong_fit|good_fit|uncertain_fit|weak_fit",

  "candidate_synthesis": "Paragrafo narrativo di 4-5 frasi che descrive chi è questo candidato, cosa ha fatto, cosa cerca. Non usare tag o elenchi — scrivi come se stessi presentando la persona a qualcuno.",

  "association_fit": "Paragrafo: perché è o non è coerente con ${association?.name}. Confronta il profilo con i CRITERI DI VALUTAZIONE dell'associazione. Spiega i motivi, non dare solo un punteggio.",

  "fit_strengths": ["punto di forza specifico rispetto ai criteri di ${association?.name}"],
  "fit_gaps": ["area da approfondire specifica per ${association?.name}"],

  "position_recommendation": {
    "candidate_selected": "${selectedPosition}",
    "ai_recommended": "la posizione che l'AI ritiene più adatta tra quelle disponibili",
    "match": true/false,
    "explanation": "Se match=true: conferma perché il candidato ha scelto bene. Se match=false: spiega perché la posizione consigliata è più adatta del candidato, senza sminuire la scelta del candidato."
  },

  "key_evidence": [
    {"title": "nome esperienza/progetto", "description": "2-3 frasi che spiegano cosa ha fatto, perché è rilevante, cosa va approfondito. Distingui tra ciò che è certo (transcript) e ciò che è dichiarato."}
  ],

  "academic_competencies": [
    {"area": "nome area", "description": "1-2 frasi: cosa emerge dal transcript, cosa significa concretamente, per quali ruoli è utile. NON esagerare: un esame non equivale a una competenza pratica."}
  ],

  "practical_competencies": [
    {"area": "nome competenza", "description": "1-2 frasi: da quale esperienza emerge, cosa suggerisce, cosa va verificato."}
  ],

  "competencies_to_verify": "Paragrafo: quali competenze importanti per l'associazione non emergono ancora dal profilo. Non giudicante — una guida per il colloquio.",

  "attitude_description": "Paragrafo narrativo sullo stile di lavoro, attitudini, preferenze. NON etichette secche tipo 'leadership: alta'. Scrivi come emerge dalla conversazione: autonomia, iniziativa, creatività, preferenze di team, comunicazione, motivazioni.",

  "suggested_roles": "Se ci sono posizioni interne, suggerisci quali sarebbero più coerenti e perché. Altrimenti suggerisci quale tipo di attività interna sarebbe più adatta.",

  "interview_questions": ["domanda specifica basata sul profilo e sui gap — non domande generiche"],

  "application_quality": "Se le risposte alla candidatura sono povere o generiche, segnalalo. Se sono buone, dillo. Spiega cosa aggiungono o non aggiungono alla valutazione."
}

REGOLE:
- Scrivi in italiano, tono professionale ma leggibile
- Il FIT deve essere valutato rispetto ai CRITERI DI VALUTAZIONE dell'associazione, non in astratto
- La RACCOMANDAZIONE POSIZIONE deve confrontare cosa ha scelto il candidato vs cosa consigli tu. Se la candidatura è generica o c'è una sola posizione, match=true e spiega il fit
- NON mostrare confidence score, punteggi tecnici o logiche interne
- NON trasformare ogni esame in una competenza enorme
- Distingui tra competenze ACCADEMICHE (transcript) e PRATICHE (esperienze)
- Se mancano prove, scrivi "da approfondire", non "manca"
- Le esperienze dichiarate vanno presentate come "lo studente dichiara/racconta", non come fatti certi
- L'attitudine deve essere narrativa, non una tabella di punteggi`;

  const systemMsg = `Sei un sistema di valutazione candidature per associazioni universitarie. Genera schede candidato narrative, motivate e contestualizzate all'associazione specifica. Il fit va sempre valutato rispetto ai criteri di selezione indicati dall'associazione. Non inventare informazioni. Distingui tra dati certi (transcript), dichiarazioni dello studente e inferenze. Rispondi SOLO in JSON valido. IMPORTANTE: se i nomi dei corsi universitari sono in inglese, NON suggerire di "verificare le competenze in inglese" — lo studente studia già in inglese.`;

  try {
    const result = await chatCompletion(
      [
        { role: "system", content: systemMsg },
        { role: "user", content: prompt },
      ],
      { temperature: 0.3, maxTokens: 3000, jsonMode: true }
    );

    const evaluation = JSON.parse(result);

    await (supabase.from("candidate_ai_evaluations") as any).insert({
      application_id: applicationId,
      model_provider: "openai",
      model_name: "gpt-4o",
      evaluation_json: evaluation,
      overall_fit_category: evaluation.overall_fit_category,
      fit_summary: evaluation.association_fit,
      strengths: evaluation.fit_strengths,
      gaps: evaluation.fit_gaps,
      input_snapshot: {
        student_summary: student?.profile_summary,
        answers_count: (application.application_answers ?? []).length,
        evaluation_criteria: evalCriteria || null,
      },
    });

    return { success: true };
  } catch (err) {
    console.error("AI evaluation error:", err);
    return { error: "Errore nella valutazione AI" };
  }
}
