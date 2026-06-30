"use server";

import { chatCompletion } from "@mira/ai";
import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { sendInterviewInvite } from "@/lib/email";
import { revalidatePath } from "next/cache";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function generateEmailDraft(
  type: "interview" | "accepted" | "rejected",
  candidateName: string,
  associationName: string,
) {
  const prompts: Record<string, string> = {
    interview: `Scrivi un breve messaggio di invito a colloquio da parte di ${associationName} per ${candidateName}. Tono professionale ma amichevole. Struttura: 2-3 frasi di intro, poi "Prenota il tuo slot al link qui sotto:" (il link verrà aggiunto dopo), poi chiusura. Scrivi SOLO il corpo del messaggio.`,
    accepted: `Scrivi un breve messaggio di accettazione per ${candidateName} in ${associationName}. Tono entusiasta ma professionale. Congratulati, di' che è stato selezionato, e invitalo a entrare nella community su MIRA. Scrivi SOLO il corpo del messaggio.`,
    rejected: `Scrivi un breve messaggio di ringraziamento per ${candidateName} che non è stato selezionato per ${associationName}. Tono rispettoso e incoraggiante. Ringrazia per la candidatura, di' che c'erano molti candidati validi, e augura buona fortuna. Scrivi SOLO il corpo del messaggio.`,
  };

  const message = await chatCompletion(
    [
      { role: "system", content: prompts[type] },
      { role: "user", content: "Genera il messaggio." },
    ],
    { temperature: 0.7, maxTokens: 300 }
  );
  return { message };
}

export async function sendStatusEmail(
  applicationId: string,
  newStatus: string,
  message: string,
  subject?: string,
) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();
  const profileId = (ctx.profile as any).id as string;

  const { data: application } = await (supabase.from("applications") as any)
    .select("id, status, association_id, student_user_id, association_profiles(name, slug)")
    .eq("id", applicationId)
    .single();

  if (!application) return { error: "Candidatura non trovata" };

  const { data: candidateProfile } = await (supabase.from("profiles") as any)
    .select("full_name, email")
    .eq("id", application.student_user_id)
    .single();

  if (!candidateProfile?.email) return { error: "Email candidato non trovata" };

  const assocName = application.association_profiles?.name || "Associazione";
  const emailSubject = subject || (
    newStatus === "accepted" ? `Complimenti! Sei stato accettato in ${assocName}`
    : newStatus === "rejected" ? `${assocName} — Esito candidatura`
    : `${assocName} — Aggiornamento candidatura`
  );

  const { error: emailError } = await (await import("@/lib/email")).sendInterviewInvite({
    candidateEmail: candidateProfile.email,
    candidateName: candidateProfile.full_name || "candidato/a",
    associationName: assocName,
    presidentName: ctx.profile.full_name || "Il board",
    message,
    subject: emailSubject,
  });

  if (emailError) return { error: `Errore invio email: ${emailError}` };

  const { changeCandidateStatus } = await import("./candidates");
  const result = await changeCandidateStatus(applicationId, newStatus, `Email inviata a ${candidateProfile.email}`);

  return result;
}

export async function sendInterviewEmail(
  applicationId: string,
  message: string
) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();
  const profileId = (ctx.profile as any).id as string;

  const { data: application } = await (supabase.from("applications") as any)
    .select("id, status, association_id, student_user_id, application_cycles(title), association_profiles(name, slug)")
    .eq("id", applicationId)
    .single();

  if (!application) return { error: "Candidatura non trovata" };

  const { data: candidateProfile } = await (supabase.from("profiles") as any)
    .select("full_name, email")
    .eq("id", application.student_user_id)
    .single();

  if (!candidateProfile?.email) return { error: "Email candidato non trovata" };

  const emailResult = await sendInterviewInvite({
    candidateEmail: candidateProfile.email,
    candidateName: candidateProfile.full_name || "candidato/a",
    associationName: application.association_profiles?.name || "Associazione",
    presidentName: ctx.profile.full_name || "Il board",
    message,
  });

  if (emailResult.error) return { error: `Errore invio email: ${emailResult.error}` };

  await (supabase.from("applications") as any)
    .update({
      status: "interview",
      last_status_change_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  await (supabase.from("application_status_events") as any).insert({
    application_id: applicationId,
    previous_status: application.status,
    new_status: "interview",
    changed_by_user_id: profileId,
    note: `Invito a colloquio inviato via email a ${candidateProfile.email}`,
    visible_to_candidate: true,
  });

  const slug = application.association_profiles?.slug;
  revalidatePath(`/association/${slug}/candidates`);
  revalidatePath(`/association/${slug}/candidates/${applicationId}`);
  revalidatePath(`/association/${slug}/interviews`);
  return { success: true };
}
