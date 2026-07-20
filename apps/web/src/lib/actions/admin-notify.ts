"use server";

import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { sendAdminNewSignupNotification, sendReminderEmail } from "@/lib/email";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Notifica all'admin la registrazione di un nuovo studente. Chiamata dal form di signup
 * subito dopo che l'account è stato creato. Best-effort: qualsiasi errore viene ingoiato,
 * la registrazione dello studente non deve mai dipendere dall'invio di questa email.
 */
export async function notifyAdminNewStudent(input: {
  fullName?: string | null;
  email: string;
  university?: string | null;
  degreeLevel?: string | null;
}) {
  try {
    await sendAdminNewSignupNotification({
      kind: "student",
      name: input.fullName ?? "",
      email: input.email,
      detail: [input.university || null, input.degreeLevel || null].filter(Boolean).join(" · ") || null,
    });
  } catch {
    // ignora: mai bloccare il signup
  }
  return { success: true };
}

/**
 * Invia allo studente il sollecito a completare la MIRA Card. Oggetto e testo arrivano
 * dalla bozza modificabile dell'admin; il link CTA è fisso.
 */
export async function remindStudentCard(input: { profileId: string; subject: string; message: string }) {
  const ctx = await getUserContext();
  if (!ctx.isMiraAdmin) return { error: "Non autorizzato." };
  if (!input.subject.trim() || !input.message.trim()) return { error: "Oggetto e testo sono obbligatori." };

  const supabase = await createServiceClient();
  const { data: profile } = await (supabase.from("profiles") as any)
    .select("email")
    .eq("id", input.profileId)
    .maybeSingle();

  if (!profile?.email) return { error: "Studente non trovato." };

  const result = await sendReminderEmail({
    email: profile.email,
    subject: input.subject,
    message: input.message,
    ctaLabel: "Completa la MIRA Card",
    ctaUrl: "https://mirajob.cloud/student/onboarding",
  });

  if (result.error) return { error: result.error };
  return { success: true };
}

/**
 * Invia al referente dell'associazione il sollecito a completare/pubblicare la pagina.
 * Oggetto e testo arrivano dalla bozza modificabile dell'admin; il link CTA è fisso sulla
 * gestione pagina dell'associazione.
 */
export async function remindAssociationPage(input: { associationId: string; subject: string; message: string }) {
  const ctx = await getUserContext();
  if (!ctx.isMiraAdmin) return { error: "Non autorizzato." };
  if (!input.subject.trim() || !input.message.trim()) return { error: "Oggetto e testo sono obbligatori." };

  const supabase = await createServiceClient();
  const { data: association } = await (supabase.from("association_profiles") as any)
    .select("slug, contact_email")
    .eq("id", input.associationId)
    .maybeSingle();

  if (!association) return { error: "Associazione non trovata." };

  // Preferisci l'email del presidente (membership) al contact_email della pagina.
  const { data: membership } = await (supabase.from("association_memberships") as any)
    .select("profiles!association_memberships_user_id_fkey(email)")
    .eq("association_id", input.associationId)
    .eq("role", "association_president")
    .maybeSingle();

  const email = (membership as any)?.profiles?.email ?? association.contact_email;
  if (!email) return { error: "Nessuna email di contatto per questa associazione." };

  const result = await sendReminderEmail({
    email,
    subject: input.subject,
    message: input.message,
    ctaLabel: "Gestisci la pagina",
    ctaUrl: `https://mirajob.cloud/association/${association.slug}/public-page`,
  });

  if (result.error) return { error: result.error };
  return { success: true };
}
