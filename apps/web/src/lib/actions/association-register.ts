"use server";

import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { ensureStudentProfile } from "@/lib/student-provisioning";
import { sendAssociationDecisionEmail, sendAdminNewSignupNotification } from "@/lib/email";
import { ROLE_PERMISSION_TEMPLATES } from "@mira/domain";
import { revalidatePath } from "next/cache";

/* eslint-disable @typescript-eslint/no-explicit-any */

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

async function uniqueSlug(supabase: any, base: string): Promise<string> {
  let slug = base;
  let i = 2;
  while (true) {
    const { data } = await supabase
      .from("association_profiles")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return slug;
    slug = `${base}-${i++}`;
  }
}

async function waitForProfile(supabase: any, authUserId: string): Promise<string | null> {
  for (let i = 0; i < 8; i++) {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", authUserId)
      .maybeSingle();
    if (data?.id) return data.id as string;
    await new Promise((r) => setTimeout(r, 300));
  }
  return null;
}

/**
 * Crea la pagina associazione (pending) + la membership da presidente per un profilo già
 * esistente. L'associazione eredita l'università del presidente: gli studenti vedono e si
 * candidano solo alle associazioni della propria università (vedi i controlli in
 * student/associazioni/page.tsx, associations/[slug]/apply/page.tsx e applications.ts).
 */
async function createAssociationForProfile(
  supabase: any,
  profileId: string,
  contactEmail: string | null | undefined,
  university: string,
  input: { associationName: string; category: string; websiteUrl: string; description: string },
  presidentName?: string | null
) {
  const baseSlug = toSlug(input.associationName) || "associazione";
  const slug = await uniqueSlug(supabase, baseSlug);

  const { data: association, error: assocErr } = await supabase
    .from("association_profiles")
    .insert({
      name: input.associationName,
      slug,
      category: input.category || null,
      short_description: input.description || null,
      website_url: input.websiteUrl || null,
      contact_email: contactEmail,
      university,
      official: false,
      verification_status: "pending_verification",
      created_by_user_id: profileId,
    })
    .select("id, slug, name")
    .single();

  if (assocErr) {
    console.error("association_profiles insert error:", assocErr);
    return { error: "Errore nella creazione della pagina associazione." as const };
  }

  // Chi crea la pagina nasce amministratore con accesso completo: non esiste piu' un
  // ruolo "presidente" separato. Chi ha creato l'associazione resta comunque tracciato
  // in association_profiles.created_by_user_id.
  const permissions: Record<string, boolean> = {};
  for (const perm of ROLE_PERMISSION_TEMPLATES.association_admin!) {
    permissions[perm] = true;
  }

  await supabase.from("association_memberships").insert({
    association_id: association.id,
    user_id: profileId,
    role: "association_admin",
    permissions,
    status: "active",
    joined_at: new Date().toISOString(),
  });

  // Avvisa l'admin della nuova candidatura associazione. Best-effort: non deve mai far
  // fallire la registrazione se l'email non parte.
  await sendAdminNewSignupNotification({
    kind: "association",
    name: input.associationName,
    email: contactEmail ?? "—",
    detail: [presidentName ? `Referente: ${presidentName}` : null, university || null]
      .filter(Boolean)
      .join(" · ") || null,
  }).catch(() => {});

  return { success: true as const, slug: association.slug as string, name: association.name as string };
}

/**
 * Crea in un solo passaggio server-side: utente auth (già confermato — l'associazione
 * passa comunque per una revisione manuale del MIRA admin entro 24h, non serve anche il
 * click di conferma email), profilo studente (stessi dati del signup normale, così il
 * presidente può costruire la sua MiraCard da subito) e la pagina associazione in
 * attesa di verifica. Non dipende da una sessione: il vecchio flusso (signUp lato client
 * seguito da una server action che leggeva la sessione) falliva sempre con "Sessione non
 * valida" perché la conferma email è obbligatoria su questo progetto Supabase, quindi
 * auth.signUp() non restituisce mai una sessione al primo giro.
 */
export async function registerAssociationPresident(input: {
  associationName: string;
  category: string;
  websiteUrl: string;
  description: string;
  presidentName: string;
  email: string;
  password: string;
  university: string;
  degreeLevel: string;
}) {
  const email = input.email.trim().toLowerCase();
  const supabase = await createServiceClient();

  // Un tentativo precedente (col vecchio bug "Sessione non valida") può aver già creato
  // l'utente auth senza completare associazione/profilo studente: recupera quell'account
  // invece di bloccare il retry con "email già registrata". Va fatto SOLO per account mai
  // confermati — altrimenti chiunque potrebbe rubare un account MIRA reale digitando la sua
  // email in questo form pubblico e sovrascrivendone silenziosamente la password.
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, auth_user_id")
    .eq("email", email)
    .maybeSingle();

  let authUserId: string;
  let profileId: string;

  if (existingProfile) {
    const { data: existingMembership } = await supabase
      .from("association_memberships")
      .select("id")
      .eq("user_id", (existingProfile as any).id)
      .maybeSingle();

    const { data: existingAuthUser } = await supabase.auth.admin.getUserById(
      (existingProfile as any).auth_user_id
    );
    const neverConfirmed = !existingAuthUser?.user?.email_confirmed_at;

    if (existingMembership || !neverConfirmed) {
      return { error: "Esiste già un account con questa email. Accedi per candidare una nuova associazione." };
    }

    const { error: updateErr } = await supabase.auth.admin.updateUserById(
      (existingProfile as any).auth_user_id,
      { password: input.password, email_confirm: true }
    );
    if (updateErr) return { error: "Errore nel recupero dell'account esistente. Riprova." };

    authUserId = (existingProfile as any).auth_user_id;
    profileId = (existingProfile as any).id;
  } else {
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        full_name: input.presidentName,
        signup_source: "association",
      },
    });

    if (createErr || !created?.user) {
      const alreadyRegistered = createErr?.message?.toLowerCase().includes("already registered")
        || createErr?.message?.toLowerCase().includes("already been registered");
      return {
        error: alreadyRegistered
          ? "Esiste già un account con questa email."
          : "Errore nella creazione dell'account. Riprova.",
      };
    }

    authUserId = created.user.id;
    const foundProfileId = await waitForProfile(supabase, authUserId);
    if (!foundProfileId) {
      await supabase.auth.admin.deleteUser(authUserId).catch(() => {});
      return { error: "Profilo non trovato dopo la registrazione. Riprova." };
    }
    profileId = foundProfileId;
  }

  await ensureStudentProfile(supabase, profileId, email, {
    university: input.university,
    degreeLevel: input.degreeLevel,
  });

  const result = await createAssociationForProfile(supabase, profileId, email, input.university, input, input.presidentName);
  if (result.error) {
    await supabase.auth.admin.deleteUser(authUserId).catch(() => {});
  }
  return result;
}

/**
 * Per chi ha già un account MIRA (studente o presidente di un'altra associazione) e vuole
 * candidare la sua associazione senza rifare la registrazione: niente campi di
 * credenziali, si usa il profilo della sessione già autenticata.
 */
export async function attachAssociationToCurrentUser(input: {
  associationName: string;
  category: string;
  websiteUrl: string;
  description: string;
}) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  await ensureStudentProfile(supabase, ctx.profile.id, ctx.user.email);

  const { data: studentProfile } = await supabase
    .from("student_profiles")
    .select("university")
    .eq("user_id", ctx.profile.id)
    .maybeSingle();

  return createAssociationForProfile(
    supabase,
    ctx.profile.id,
    ctx.user.email,
    (studentProfile as any)?.university ?? "",
    input,
    (ctx.profile as any)?.full_name ?? null
  );
}

export async function approveAssociation(associationId: string) {
  const ctx = await getUserContext();
  if (!ctx.isMiraAdmin) return { error: "Non autorizzato." };

  const supabase = await createServiceClient();

  const { data: association } = await supabase
    .from("association_profiles")
    .select("name, contact_email")
    .eq("id", associationId)
    .maybeSingle();

  const { error } = await supabase
    .from("association_profiles")
    .update({
      verification_status: "verified",
      official: true,
      approved_by_user_id: ctx.profile.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", associationId);

  if (error) return { error: error.message };

  if ((association as any)?.contact_email) {
    await sendAssociationDecisionEmail({
      email: (association as any).contact_email,
      associationName: (association as any).name,
      approved: true,
    });
  }

  revalidatePath("/admin/associations");
  return { success: true };
}

export async function rejectAssociation(associationId: string, reason: string) {
  const ctx = await getUserContext();
  if (!ctx.isMiraAdmin) return { error: "Non autorizzato." };

  const supabase = await createServiceClient();

  const { data: association } = await supabase
    .from("association_profiles")
    .select("name, contact_email")
    .eq("id", associationId)
    .maybeSingle();

  const { error } = await supabase
    .from("association_profiles")
    .update({ verification_status: "rejected", rejected_reason: reason || null })
    .eq("id", associationId);

  if (error) return { error: error.message };

  if ((association as any)?.contact_email) {
    await sendAssociationDecisionEmail({
      email: (association as any).contact_email,
      associationName: (association as any).name,
      approved: false,
      reason,
    });
  }

  revalidatePath("/admin/associations");
  return { success: true };
}
