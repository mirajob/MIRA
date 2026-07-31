"use server";

import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { ROLE_PERMISSION_TEMPLATES } from "@mira/domain";
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
      user_id: ctx.profile.id,
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

  revalidatePath("/student/associazioni");
  revalidatePath("/admin/associations/seminate");
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
        invited_by_user_id: ctx.profile.id,
      },
      { onConflict: "association_id,user_id" }
    );

  if (membershipError) return { error: membershipError.message };

  const { error: associationError } = await (supabase.from("association_profiles") as any)
    .update({
      claim_status: "claimed",
      created_by_user_id: request.user_id,
      approved_by_user_id: ctx.profile.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", request.association_id);

  if (associationError) return { error: associationError.message };

  await (supabase.from("association_claim_requests") as any)
    .update({
      status: "approved",
      reviewed_by_user_id: ctx.profile.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  revalidatePath("/admin/associations/seminate");
  revalidatePath("/student/associazioni");
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
      reviewed_by_user_id: ctx.profile.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) return { error: error.message };

  revalidatePath("/admin/associations/seminate");
  revalidatePath("/student/associazioni");
  return { success: true };
}
