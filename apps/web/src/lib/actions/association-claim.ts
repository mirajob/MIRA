"use server";

import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { ROLE_PERMISSION_TEMPLATES } from "@mira/domain";
import { sendAdminNewSignupNotification } from "@/lib/email";
import { revalidatePath } from "next/cache";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Richieste di gestione di una pagina associazione seminata da MIRA.
 *
 * Sulla pagina non compare nessun recapito nostro: chi fa parte del board manda la
 * richiesta da qui e ne segue lo stato nella propria sezione Associazioni.
 * L'approvazione è sempre manuale — nessuno prende il controllo di una pagina
 * dichiarando semplicemente di averne diritto.
 */

/**
 * Invio della richiesta. Il doppio passaggio (compilazione + conferma) vive
 * nell'interfaccia; qui arriva solo l'invio confermato.
 */
export async function submitAssociationClaimRequest(input: {
  associationId: string;
  roleInAssociation: string;
  note?: string;
}) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  const { data: association } = await (supabase.from("association_profiles") as any)
    .select("id, name, claim_status")
    .eq("id", input.associationId)
    .maybeSingle();

  if (!association) return { error: "Associazione non trovata." };
  if (association.claim_status !== "seeded") {
    return { error: "Questa pagina è già gestita dall'associazione." };
  }
  if (!input.roleInAssociation.trim()) {
    return { error: "Indica il tuo ruolo nell'associazione." };
  }

  // Un secondo invio aggiorna la richiesta esistente invece di accodarne un'altra:
  // chi ha sbagliato qualcosa deve poter correggere senza creare doppioni da smaltire.
  const { error } = await (supabase.from("association_claim_requests") as any).upsert(
    {
      association_id: input.associationId,
      user_id: (ctx.profile as any).id,
      request_type: "claim",
      role_in_association: input.roleInAssociation.trim(),
      note: input.note?.trim() || null,
      status: "pending",
      rejected_reason: null,
      reviewed_by_user_id: null,
      reviewed_at: null,
    },
    { onConflict: "association_id,user_id" }
  );

  if (error) return { error: error.message };

  // La richiesta la deve valutare l'admin MIRA a mano: senza notifica resterebbe
  // ferma finché qualcuno non apre la coda per caso. Best-effort, come le altre.
  await sendAdminNewSignupNotification({
    kind: "claim_request",
    name: (ctx.profile as any).full_name ?? "",
    email: (ctx.profile as any).email ?? ctx.user.email ?? "",
    detail: [
      association.name,
      input.roleInAssociation.trim(),
      input.note?.trim() || null,
    ]
      .filter(Boolean)
      .join(" · "),
  }).catch(() => {});

  revalidatePath("/student/associazioni");
  revalidatePath("/admin/associations/seminate");
  return { success: true };
}

/**
 * Richiesta di ingresso in una pagina GIÀ gestita da qualcuno del board.
 *
 * Qui MIRA non c'entra: la richiesta arriva a chi la pagina la gestisce già, che la
 * approva dalla sua dashboard (tab Membri, stesse richieste del codice di invito).
 * Si entra come membro semplice, senza permessi: la nomina ad amministratore resta
 * un atto separato di chi è già dentro.
 */
export async function submitAssociationJoinRequest(input: {
  associationId: string;
  roleInAssociation: string;
}) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();
  const profileId = (ctx.profile as any).id as string;

  const { data: association } = await (supabase.from("association_profiles") as any)
    .select("id, claim_status")
    .eq("id", input.associationId)
    .maybeSingle();

  if (!association) return { error: "Associazione non trovata." };
  if (association.claim_status === "seeded") {
    return { error: "Questa pagina non è ancora gestita da nessuno: chiedi di prenderla in gestione." };
  }

  const { data: existing } = await (supabase.from("association_memberships") as any)
    .select("id, status")
    .eq("association_id", input.associationId)
    .eq("user_id", profileId)
    .maybeSingle();

  if (existing && existing.status !== "removed") {
    return existing.status === "active"
      ? { error: "Fai già parte di questa associazione." }
      : { error: "Hai già una richiesta in attesa." };
  }

  const pendingRow = {
    role: "association_member",
    title: input.roleInAssociation.trim() || null,
    permissions: {},
    status: "pending_approval",
    joined_at: null,
  };

  const { error } = existing
    ? await (supabase.from("association_memberships") as any).update(pendingRow).eq("id", existing.id)
    : await (supabase.from("association_memberships") as any).insert({
        association_id: input.associationId,
        user_id: profileId,
        ...pendingRow,
      });

  if (error) return { error: error.message };

  revalidatePath("/student/associazioni");
  return { success: true };
}

/**
 * Approvazione: la pagina passa all'associazione. Il richiedente diventa
 * amministratore con permessi pieni — è la prima membership della pagina, che
 * finché era seminata non ne aveva nessuna.
 */
export async function approveAssociationClaimRequest(requestId: string) {
  const ctx = await getUserContext();
  if (!ctx.isMiraAdmin) return { error: "Non autorizzato." };

  const supabase = await createServiceClient();

  const { data: request } = await (supabase.from("association_claim_requests") as any)
    .select("id, association_id, user_id")
    .eq("id", requestId)
    .maybeSingle();

  if (!request) return { error: "Richiesta non trovata." };

  const permissions: Record<string, boolean> = {};
  for (const perm of ROLE_PERMISSION_TEMPLATES.association_admin!) {
    permissions[perm] = true;
  }

  const { error: membershipError } = await (supabase.from("association_memberships") as any)
    .upsert(
      {
        association_id: request.association_id,
        user_id: request.user_id,
        role: "association_admin",
        permissions,
        status: "active",
        joined_at: new Date().toISOString(),
        invited_by_user_id: (ctx.profile as any).id,
      },
      { onConflict: "association_id,user_id" }
    );

  if (membershipError) return { error: membershipError.message };

  // Il percorso guidato parte dalla costruzione della pagina pubblica, ma qui quella
  // pagina l'abbiamo già scritta e pubblicata noi: una richiesta di gestione può
  // nascere solo da una pagina pubblicata, perché le bozze le vede solo l'admin.
  // Quindi la prima tappa è sempre già fatta e si parte dalla seconda, i collaboratori.
  const { error: associationError } = await (supabase.from("association_profiles") as any)
    .update({
      claim_status: "claimed",
      created_by_user_id: request.user_id,
      approved_by_user_id: (ctx.profile as any).id,
      approved_at: new Date().toISOString(),
      onboarding_state: { step: 1, completed: false },
    })
    .eq("id", request.association_id);

  if (associationError) return { error: associationError.message };

  await (supabase.from("association_claim_requests") as any)
    .update({
      status: "approved",
      reviewed_by_user_id: (ctx.profile as any).id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  revalidatePath("/admin/associations/seminate");
  revalidatePath("/student/associazioni");
  return { success: true };
}

/**
 * Unisce una pagina appena creata alla pagina che MIRA aveva già scritto per la stessa
 * associazione. Decisione founder 2026-07-31: si tiene la NOSTRA e si cancella quella
 * nuova, perché la nostra ha i testi scritti a mano e uno slug già pubblico, mentre la
 * nuova ha giusto i due campi del form di registrazione.
 *
 * Chi aveva creato il doppione diventa amministratore della pagina che resta: è la
 * stessa cosa che chiedeva, ottenuta senza fargli rifare niente.
 */
export async function mergeDuplicateAssociation(input: { duplicateId: string; targetId: string }) {
  const ctx = await getUserContext();
  if (!ctx.isMiraAdmin) return { error: "Non autorizzato." };
  if (input.duplicateId === input.targetId) return { error: "Le due pagine coincidono." };

  const supabase = await createServiceClient();

  const { data: pages } = await (supabase.from("association_profiles") as any)
    .select("id, name, slug, claim_status, created_by_user_id, website_url, contact_email, short_description, category")
    .in("id", [input.duplicateId, input.targetId]);

  const duplicate = (pages ?? []).find((p: any) => p.id === input.duplicateId);
  const target = (pages ?? []).find((p: any) => p.id === input.targetId);
  if (!duplicate || !target) return { error: "Pagina non trovata." };

  const newOwnerId = duplicate.created_by_user_id as string | null;

  if (newOwnerId) {
    const permissions: Record<string, boolean> = {};
    for (const perm of ROLE_PERMISSION_TEMPLATES.association_admin!) permissions[perm] = true;

    const { error: membershipError } = await (supabase.from("association_memberships") as any).upsert(
      {
        association_id: target.id,
        user_id: newOwnerId,
        role: "association_admin",
        permissions,
        status: "active",
        joined_at: new Date().toISOString(),
        invited_by_user_id: (ctx.profile as any).id,
      },
      { onConflict: "association_id,user_id" }
    );
    if (membershipError) return { error: membershipError.message };
  }

  // Dalla pagina doppia si salva solo quello che sulla nostra manca: sito e recapito li
  // conosce il presidente meglio di noi, il resto della scheda l'abbiamo scritta noi.
  const { error: targetError } = await (supabase.from("association_profiles") as any)
    .update({
      claim_status: newOwnerId ? "claimed" : target.claim_status,
      created_by_user_id: target.created_by_user_id ?? newOwnerId,
      approved_by_user_id: (ctx.profile as any).id,
      approved_at: new Date().toISOString(),
      verification_status: "verified",
      official: true,
      website_url: target.website_url ?? duplicate.website_url ?? null,
      contact_email: target.contact_email ?? duplicate.contact_email ?? null,
      category: target.category ?? duplicate.category ?? null,
      ...(newOwnerId ? { onboarding_state: { step: 1, completed: false } } : {}),
    })
    .eq("id", target.id);

  if (targetError) return { error: targetError.message };

  // Le eventuali richieste di gestione aperte sulla pagina che resta sono state
  // soddisfatte da questa unione.
  if (newOwnerId) {
    await (supabase.from("association_claim_requests") as any)
      .update({
        status: "approved",
        reviewed_by_user_id: (ctx.profile as any).id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("association_id", target.id)
      .eq("user_id", newOwnerId)
      .eq("status", "pending");
  }

  const { error: deleteError } = await (supabase.from("association_profiles") as any)
    .delete()
    .eq("id", duplicate.id);
  if (deleteError) return { error: deleteError.message };

  revalidatePath("/admin/associations");
  revalidatePath("/admin/associations/seminate");
  revalidatePath("/student/associazioni");
  return { success: true, targetSlug: target.slug as string, targetName: target.name as string };
}

/** Toglie l'avviso di possibile doppione: le due pagine sono associazioni diverse. */
export async function dismissDuplicateLink(associationId: string) {
  const ctx = await getUserContext();
  if (!ctx.isMiraAdmin) return { error: "Non autorizzato." };

  const supabase = await createServiceClient();
  const { error } = await (supabase.from("association_profiles") as any)
    .update({ possible_duplicate_of: null })
    .eq("id", associationId);

  if (error) return { error: error.message };
  revalidatePath("/admin/associations");
  return { success: true };
}

export async function rejectAssociationClaimRequest(requestId: string, reason: string) {
  const ctx = await getUserContext();
  if (!ctx.isMiraAdmin) return { error: "Non autorizzato." };

  const supabase = await createServiceClient();

  const { error } = await (supabase.from("association_claim_requests") as any)
    .update({
      status: "rejected",
      rejected_reason: reason || null,
      reviewed_by_user_id: (ctx.profile as any).id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) return { error: error.message };

  revalidatePath("/admin/associations/seminate");
  revalidatePath("/student/associazioni");
  return { success: true };
}
