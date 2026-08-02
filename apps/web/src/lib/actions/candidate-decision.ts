"use server";

import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { ROLE_PERMISSION_TEMPLATES } from "@mira/domain";
import { sendReminderEmail } from "@/lib/email";
import { revalidatePath } from "next/cache";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Accettare o rifiutare un candidato.
 *
 * La differenza rispetto al cambio di stato generico è che qui succedono anche
 * le due cose che prima toccava fare a mano: l'email al candidato, con la bozza
 * che il board ha potuto correggere, e l'ingresso fra i membri di chi viene
 * accettato. Un accettato che resta fuori dalla lista membri è un lavoro in più
 * per il board e una porta chiusa in faccia al candidato.
 */

async function loadContext(applicationId: string) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  const { data: application } = await (supabase.from("applications") as any)
    .select(`
      id, status, association_id, student_user_id,
      association_profiles(name, slug),
      profiles!applications_student_user_id_fkey(full_name, email)
    `)
    .eq("id", applicationId)
    .maybeSingle();

  if (!application) return { error: "Candidatura non trovata." as const };

  const { data: membership } = await (supabase.from("association_memberships") as any)
    .select("role, permissions")
    .eq("association_id", application.association_id)
    .eq("user_id", (ctx.profile as any).id)
    .eq("status", "active")
    .maybeSingle();

  const allowed =
    ctx.isMiraAdmin ||
    membership?.role === "association_admin" ||
    membership?.role === "association_president" ||
    Boolean((membership?.permissions as Record<string, boolean> | null)?.change_candidate_status);

  if (!allowed) return { error: "Non hai i permessi." as const };

  return { ctx, supabase, application };
}

export async function decideCandidate(input: {
  applicationId: string;
  decision: "accepted" | "rejected";
  /** Testo dell'email, già corretto dal board. Vuoto = nessuna email. */
  message: string;
}) {
  const loaded = await loadContext(input.applicationId);
  if ("error" in loaded) return { error: loaded.error };
  const { ctx, supabase, application } = loaded;

  const previous = application.status;

  const { error } = await (supabase.from("applications") as any)
    .update({ status: input.decision, last_status_change_at: new Date().toISOString() })
    .eq("id", input.applicationId);

  if (error) return { error: error.message };

  await (supabase.from("application_status_events") as any).insert({
    application_id: input.applicationId,
    previous_status: previous,
    new_status: input.decision,
    changed_by_user_id: (ctx.profile as any).id,
    visible_to_candidate: true,
  });

  // Chi viene accettato entra fra i membri senza altri passaggi. Come membro
  // semplice: promuoverlo ad amministratore resta una decisione a parte.
  if (input.decision === "accepted") {
    await (supabase.from("association_memberships") as any).upsert(
      {
        association_id: application.association_id,
        user_id: application.student_user_id,
        role: "association_member",
        permissions: {},
        status: "active",
        joined_at: new Date().toISOString(),
        invited_by_user_id: (ctx.profile as any).id,
      },
      { onConflict: "association_id,user_id", ignoreDuplicates: true }
    );
  }

  const candidate = application.profiles;
  const associationName = application.association_profiles?.name ?? "";

  if (input.message.trim() && candidate?.email) {
    await sendReminderEmail({
      email: candidate.email,
      subject:
        input.decision === "accepted"
          ? `${associationName}: welcome aboard`
          : `${associationName}: update on your application`,
      message: input.message.trim(),
      ctaLabel: input.decision === "accepted" ? "Open MIRA" : "Open MIRA",
      ctaUrl: "https://mirajob.cloud/student/associazioni",
    }).catch(() => {});
  }

  await (supabase.from("notifications") as any).insert({
    user_id: application.student_user_id,
    type: "application_decision",
    title: input.decision === "accepted" ? "Sei stato accettato" : "Aggiornamento sulla candidatura",
    body: associationName,
    data: { application_id: input.applicationId },
  });

  const slug = application.association_profiles?.slug;
  revalidatePath(`/association/${slug}/candidates`);
  revalidatePath(`/association/${slug}/candidates/${input.applicationId}`);
  revalidatePath(`/association/${slug}/board`);
  return { success: true };
}

/**
 * La bozza dell'email, in inglese, che il board rilegge e corregge prima di
 * mandarla. Nessun testo parte senza che qualcuno l'abbia guardato.
 */
export async function buildDecisionDraft(input: {
  decision: "accepted" | "rejected";
  candidateName: string;
  associationName: string;
}) {
  const name = input.candidateName.split(/\s+/)[0] || "there";

  if (input.decision === "accepted") {
    return {
      message: `Hi ${name},

We are glad to tell you that your application to ${input.associationName} was successful. Welcome aboard.

We will be in touch shortly with the next steps and how to get started.

Best,
The ${input.associationName} team`,
    };
  }

  return {
    message: `Hi ${name},

Thank you for applying to ${input.associationName} and for the time you put into the process.

After careful consideration we have decided not to move forward with your application this time. This was a difficult call: we received strong applications and had limited spots.

We would be glad to see you apply again in a future round.

Best,
The ${input.associationName} team`,
  };
}
