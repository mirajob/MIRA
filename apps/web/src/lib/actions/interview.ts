"use server";

import { chatCompletion } from "@mira/ai";
import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { sendInterviewInvite } from "@/lib/email";
import { revalidatePath } from "next/cache";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function generateInterviewMessage(
  candidateName: string,
  associationName: string,
  presidentName: string
) {
  const message = await chatCompletion(
    [
      {
        role: "system",
        content: `Scrivi un breve messaggio di invito a colloquio da parte di ${presidentName} di ${associationName} per ${candidateName}.
Tono: professionale ma amichevole, universitario.
Struttura: 2-3 frasi di intro, poi "Prenota il tuo slot al link qui sotto:" (il presidente aggiungerà il link dopo), poi chiusura.
NON aggiungere link placeholder. Scrivi SOLO il corpo del messaggio, senza oggetto.`,
      },
      { role: "user", content: "Genera il messaggio." },
    ],
    { temperature: 0.7, maxTokens: 300 }
  );
  return { message };
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
