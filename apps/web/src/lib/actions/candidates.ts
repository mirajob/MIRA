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
    membership?.role === "association_admin" ||
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
    membership?.role === "association_admin" ||
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
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  const { data: application } = await (supabase.from("applications") as any)
    .select("id, association_id, application_cycle_id, student_user_id, selected_role_preferences, application_answers(answer_text, application_questions(question_text, question_type))")
    .eq("id", applicationId)
    .single();

  if (!application) return { error: "Candidatura non trovata" };

  // Callable either by the system right after the applicant submits (the
  // applicant is obviously not a board member of the association they're
  // applying to), or later by a board member retrying a missing evaluation.
  const isApplicant = application.student_user_id === ctx.profile.id;
  if (!isApplicant && !ctx.isMiraAdmin) {
    const { data: membership } = await supabase
      .from("association_memberships")
      .select("role")
      .eq("association_id", application.association_id)
      .eq("user_id", ctx.profile.id)
      .eq("status", "active")
      .maybeSingle();
    if (!membership) return { error: "Non hai i permessi" };
  }

  const { data: studentProfile } = await (supabase.from("student_profiles") as any)
    .select("id")
    .eq("user_id", application.student_user_id)
    .single();

  // Solo blocchi approved — esplicito perché il service client bypassa RLS.
  const { data: blockRows } = studentProfile
    ? await (supabase.from("card_blocks") as any)
        .select("block_type, prose_content")
        .eq("student_profile_id", studentProfile.id)
        .eq("status", "approved")
    : { data: [] };

  const blocks = new Map<string, any>((blockRows ?? []).map((b: any) => [b.block_type, b.prose_content]));

  const { data: association } = await (supabase.from("association_profiles") as any)
    .select("name, category, short_description, long_description")
    .eq("id", application.association_id)
    .single();

  const { data: cycle } = await (supabase.from("application_cycles") as any)
    .select("title, description, available_roles, evaluation_criteria")
    .eq("id", application.application_cycle_id)
    .maybeSingle();

  const answers = (application.application_answers ?? [])
    .map((a: any) => `Q: ${a.application_questions?.question_text}\nA: ${a.answer_text}`)
    .join("\n\n");

  const positions = (cycle?.available_roles ?? []) as Array<{ name: string; description?: string; requirements?: string }>;
  const selectedPosition = (application.selected_role_preferences ?? [])[0] || "generica";

  const positionsText = positions.map((p) =>
    `- ${p.name}${p.description ? `: ${p.description}` : ""}${p.requirements ? ` [REQUISITI: ${p.requirements}]` : ""}`
  ).join("\n");

  const header = blocks.get("header") ?? {};
  const disponibilita = blocks.get("disponibilita") ?? {};
  const formazione = (blocks.get("formazione")?.items ?? []) as Array<{ esame: string; voto: string }>;
  const esperienze = (blocks.get("esperienze")?.items ?? []) as Array<{ titolo: string; organizzazione: string; descrizione: string }>;
  const competenze = (blocks.get("competenze")?.items ?? []) as Array<{ testo: string; evidenza_ref?: string }>;
  // Card rework 2026-07: il Profilo personale vive sulla riga "autodescrizione";
  // "interessi" resta solo come dato legacy dei profili pre-rework.
  const profiloPersonale = blocks.get("autodescrizione")?.testo ?? "";
  const interessiLegacy = blocks.get("interessi")?.testo ?? "";
  const pianoCarriera = blocks.get("piano_carriera") ?? {};

  const disponibilitaText = disponibilita.attiva === false
    ? `non in cerca al momento${disponibilita.periodo ? ` (${disponibilita.periodo})` : ""}`
    : [disponibilita.cosa_cerca, disponibilita.ambito, disponibilita.periodo, disponibilita.durata, disponibilita.dove].filter(Boolean).join(", ") || "non specificata";

  const cardContext = `CARD DELLO STUDENTE (solo blocchi approvati dallo studente):
Corso: ${header.corso || "?"} (${header.livello || "?"}, anno ${header.anno || "?"})
Disponibilità: ${disponibilitaText}
Esami: ${formazione.map((e) => `${e.esame} (${e.voto})`).join(", ") || "nessuno approvato"}
Esperienze: ${esperienze.map((e) => `${e.titolo || e.organizzazione}: ${e.descrizione}`).join("\n") || "nessuna approvata"}
Competenze: ${competenze.map((c) => `${c.testo}${c.evidenza_ref ? ` (${c.evidenza_ref})` : ""}`).join("; ") || "nessuna approvata"}
Profilo personale: ${profiloPersonale || "non specificato"}${interessiLegacy ? `\nInteressi (profilo pre-rework): ${interessiLegacy}` : ""}
Piano e direzione: ${pianoCarriera.testo || "non specificato"} (${pianoCarriera.stato || "?"})`;

  const evalCriteria = (cycle?.evaluation_criteria as Record<string, any>)?.general_requirements || "";

  const prompt = `Genera il layer "Per questa candidatura" per l'associazione ${association?.name}. Questo layer NON è un giudizio permanente sullo studente: è specifico per QUESTA candidatura e questo ciclo.

ASSOCIAZIONE: ${association?.name} (${association?.category})
${association?.short_description || ""}
${association?.long_description || ""}
${evalCriteria ? `\nCRITERI DI VALUTAZIONE DELL'ASSOCIAZIONE:\n${evalCriteria}` : ""}

POSIZIONE SCELTA DAL CANDIDATO: ${selectedPosition}
POSIZIONI DISPONIBILI:
${positionsText || "Nessuna posizione specifica — candidatura generica"}

${cardContext}

RISPOSTE CANDIDATURA:
${answers || "Nessuna risposta specifica"}

Rispondi in JSON con questa struttura — la stessa valutazione in DUE lingue (il board può usare l'interfaccia in italiano o in inglese):
{
  "it": {
    "rilevanza": [
      {"claim": "affermazione su perché è rilevante per questa candidatura", "evidenza": "il fatto specifico della card da cui deriva (esame, esperienza, competenza — mai generico)"}
    ],
    "gap": ["cosa manca rispetto ai criteri di questo ciclo — SEZIONE OBBLIGATORIA, mai vuota. Se il matching non trova riscontri per un criterio, dillo esplicitamente invece di gonfiare la rilevanza."],
    "domande_colloquio": ["1-2 domande concrete derivate direttamente dai gap sopra"]
  },
  "en": { "rilevanza": [...], "gap": [...], "domande_colloquio": [...] }
}

REGOLE:
- Massimo 3 elementi in "rilevanza", ognuno con un riferimento esplicito a un fatto reale della card — mai un'affermazione senza evidenza
- "gap" non può mai essere vuoto: se non trovi lacune ovvie, indica cosa non è ancora emerso dalla card rispetto ai criteri
- Vietati aggettivi di carattere o inferenze psicologiche (niente "leadership", "resiliente", "intraprendente")
- Nessun punteggio, nessuna categoria di fit assoluta — solo fatti e gap rispetto A QUESTO ciclo
- "it" in italiano, "en" la stessa identica valutazione tradotta in inglese (stesse chiavi "rilevanza"/"gap"/"domande_colloquio", contenuto fedele)
- Tono di nota interna di un recruiter, non lettera di presentazione`;

  const systemMsg = `Sei MIRA. Generi un layer di valutazione per una specifica candidatura a una specifica associazione — mai un giudizio permanente sulla persona. Ogni affermazione deve citare un fatto della card. Non inventare informazioni. Vietate inferenze psicologiche o di carattere. Rispondi SOLO in JSON valido.`;

  try {
    const result = await chatCompletion(
      [
        { role: "system", content: systemMsg },
        { role: "user", content: prompt },
      ],
      // maxTokens raddoppiati: la valutazione ora esce in due lingue (it + en)
      { temperature: 0.3, maxTokens: 2400, jsonMode: true }
    );

    const evaluation = JSON.parse(result);
    // Colonne legacy (strengths/gaps) restano in italiano; il JSON completo ha entrambe le lingue.
    const primary = evaluation.it ?? evaluation;

    // La rigenerazione sostituisce, non accumula: la pagina legge la prima riga del join.
    await (supabase.from("candidate_ai_evaluations") as any)
      .delete()
      .eq("application_id", applicationId);

    await (supabase.from("candidate_ai_evaluations") as any).insert({
      application_id: applicationId,
      model_provider: "openai",
      model_name: "gpt-4o",
      evaluation_json: evaluation,
      fit_summary: null,
      strengths: (primary.rilevanza ?? []).map((r: any) => r.claim),
      gaps: primary.gap ?? [],
      input_snapshot: {
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
