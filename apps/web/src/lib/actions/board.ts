"use server";

import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";
function generateToken() {
  const array = new Uint8Array(32);
  require("crypto").randomFillSync(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}
import { INVITATION_EXPIRY_DAYS, ROLE_PERMISSION_TEMPLATES, ASSOCIATION_PERMISSIONS } from "@mira/domain";
import type { AssociationPermission } from "@mira/domain";
import { canManageMembers } from "@/lib/association-access";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ADMIN_ROLES = ["association_admin", "association_president"];

/**
 * Gli amministratori sono tutti uguali: nessuno e' intoccabile. L'unico limite e' che
 * non si puo' svuotare la stanza — se togliessimo l'ultimo amministratore, l'associazione
 * resterebbe senza nessuno che possa entrare nella dashboard e si sbloccherebbe solo a
 * mano da MIRA.
 *
 * Restituisce un messaggio d'errore se l'operazione lascerebbe zero amministratori,
 * altrimenti null.
 */
async function blocksLastAdmin(supabase: any, associationId: string, membershipId: string) {
  const { data: target } = await (supabase.from("association_memberships") as any)
    .select("role")
    .eq("id", membershipId)
    .maybeSingle();

  if (!target || !ADMIN_ROLES.includes(target.role)) return null;

  const { count } = await (supabase.from("association_memberships") as any)
    .select("id", { count: "exact", head: true })
    .eq("association_id", associationId)
    .eq("status", "active")
    .in("role", ADMIN_ROLES);

  return (count ?? 0) <= 1
    ? "Sei rimasto l'unico amministratore: nomina prima qualcun altro."
    : null;
}

async function revalidateBoard(supabase: any, associationId: string) {
  const { data } = await (supabase.from("association_profiles") as any)
    .select("slug")
    .eq("id", associationId)
    .maybeSingle();
  if (data?.slug) revalidatePath(`/association/${data.slug}/board`);
}

export async function inviteBoardMember(associationId: string, formData: FormData) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  const { data: membership } = await supabase
    .from("association_memberships")
    .select("role, permissions")
    .eq("association_id", associationId)
    .eq("user_id", ctx.profile.id)
    .eq("status", "active")
    .maybeSingle();

  const canInvite =
    ctx.isMiraAdmin ||
    membership?.role === "association_president" ||
    (membership?.permissions as Record<string, boolean>)?.invite_board_members;

  if (!canInvite) {
    return { error: "Non hai i permessi per invitare membri" };
  }

  const email = formData.get("email") as string;
  const role = formData.get("role") as string;

  if (!email || !role) {
    return { error: "Email e ruolo sono obbligatori" };
  }

  const { data: existing } = await supabase
    .from("invitations")
    .select("id")
    .eq("invited_email", email.toLowerCase())
    .eq("invitation_type", "association_board_member")
    .eq("association_id", associationId)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return { error: "Esiste già un invito attivo per questa email in questa associazione" };
  }

  const { data: existingMember } = await supabase
    .from("association_memberships")
    .select("id")
    .eq("association_id", associationId)
    .eq("status", "active")
    .eq("user_id", (
      await supabase.from("profiles").select("id").eq("email", email.toLowerCase()).maybeSingle()
    ).data?.id ?? "00000000-0000-0000-0000-000000000000")
    .maybeSingle();

  if (existingMember) {
    return { error: "Questo utente è già membro dell'associazione" };
  }

  const template = ROLE_PERMISSION_TEMPLATES[role] ?? [];
  const permissions: Record<string, boolean> = {};
  for (const perm of template) {
    permissions[perm] = true;
  }

  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

  const { data: association } = await supabase
    .from("association_profiles")
    .select("name, slug")
    .eq("id", associationId)
    .single();

  const { error } = await supabase.from("invitations").insert({
    invitation_type: "association_board_member",
    invited_email: email.toLowerCase(),
    invited_email_domain: email.split("@")[1],
    invitation_token: token,
    invited_by_user_id: ctx.profile.id,
    association_id: associationId,
    invited_role: role,
    invited_permissions: permissions,
    metadata: {
      association_name: association?.name,
      association_slug: association?.slug,
    },
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    return { error: `Errore: ${error.message}` };
  }

  await supabase.from("audit_logs").insert({
    actor_user_id: ctx.profile.id,
    action: "board_invitation_created",
    entity_type: "invitation",
    metadata: { invited_email: email, role, association_id: associationId },
  });

  revalidatePath(`/association/${association?.slug}/board`);
  return { success: true, token };
}

export async function removeBoardMember(associationId: string, membershipId: string) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  // Modello WhatsApp: qualunque amministratore puo' rimuovere, non solo il presidente.
  if (!(await canManageMembers(supabase, associationId, ctx.profile.id, ctx.isMiraAdmin))) {
    return { error: "Non hai i permessi" };
  }

  const { data: target } = await supabase
    .from("association_memberships")
    .select("role, user_id")
    .eq("id", membershipId)
    .single();

  const blocked = await blocksLastAdmin(supabase, associationId, membershipId);
  if (blocked) return { error: blocked };

  await supabase
    .from("association_memberships")
    .update({ status: "removed" })
    .eq("id", membershipId);

  const { data: association } = await supabase
    .from("association_profiles")
    .select("slug")
    .eq("id", associationId)
    .single();

  await supabase.from("audit_logs").insert({
    actor_user_id: ctx.profile.id,
    action: "board_member_removed",
    entity_type: "association_membership",
    entity_id: membershipId,
    metadata: { removed_user_id: target?.user_id, association_id: associationId },
  });

  revalidatePath(`/association/${association?.slug}/board`);
  return { success: true };
}

export async function updateMemberPermissions(
  associationId: string,
  membershipId: string,
  permissions: Record<string, boolean>
) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  const { data: membership } = await supabase
    .from("association_memberships")
    .select("role, permissions")
    .eq("association_id", associationId)
    .eq("user_id", ctx.profile.id)
    .eq("status", "active")
    .maybeSingle();

  const canManage =
    ctx.isMiraAdmin ||
    membership?.role === "association_president" ||
    (membership?.permissions as Record<string, boolean>)?.manage_board_permissions;

  if (!canManage) {
    return { error: "Non hai i permessi" };
  }

  await supabase
    .from("association_memberships")
    .update({ permissions })
    .eq("id", membershipId);

  const { data: association } = await supabase
    .from("association_profiles")
    .select("slug")
    .eq("id", associationId)
    .single();

  await supabase.from("audit_logs").insert({
    actor_user_id: ctx.profile.id,
    action: "board_permissions_changed",
    entity_type: "association_membership",
    entity_id: membershipId,
    metadata: { new_permissions: permissions, association_id: associationId },
  });

  revalidatePath(`/association/${association?.slug}/board`);
  return { success: true };
}

export async function generateInviteCode(associationId: string) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  const { data: membership } = await (supabase.from("association_memberships") as any)
    .select("role")
    .eq("association_id", associationId)
    .eq("user_id", (ctx.profile as any).id)
    .eq("status", "active")
    .maybeSingle();

  if (!ctx.isMiraAdmin && membership?.role !== "association_president") {
    return { error: "Solo il presidente può generare codici invito" };
  }

  const { data: assoc } = await (supabase.from("association_profiles") as any)
    .select("slug")
    .eq("id", associationId)
    .single();

  const slug = assoc?.slug?.toUpperCase().slice(0, 4) ?? "MIRA";
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  const code = `${slug}-${rand}`;

  await (supabase.from("association_profiles") as any)
    .update({ invite_code: code })
    .eq("id", associationId);

  revalidatePath(`/association/${assoc?.slug}/board`);
  return { success: true, code };
}

export async function joinWithCode(code: string, roleTitle: string) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();
  const profileId = (ctx.profile as any).id as string;

  const { data: association } = await (supabase.from("association_profiles") as any)
    .select("id, name, slug")
    .eq("invite_code", code)
    .maybeSingle();

  if (!association) return { error: "Codice invito non valido" };

  const { data: existing } = await (supabase.from("association_memberships") as any)
    .select("id, status")
    .eq("association_id", association.id)
    .eq("user_id", profileId)
    .maybeSingle();

  // Chi e' stato rimosso deve poter rientrare col codice, come nei gruppi WhatsApp.
  // Prima il controllo ignorava lo stato: la riga "removed" restava li' e bloccava per
  // sempre il rientro con "Hai gia' una richiesta".
  if (existing && existing.status !== "removed") {
    return { error: "Hai già una richiesta in corso o sei già in questa associazione" };
  }

  const pendingRow = {
    role: "association_member",
    title: roleTitle || null,
    permissions: {},
    status: "pending_approval",
    joined_at: null,
  };

  if (existing) {
    await (supabase.from("association_memberships") as any)
      .update(pendingRow)
      .eq("id", existing.id);
  } else {
    await (supabase.from("association_memberships") as any).insert({
      association_id: association.id,
      user_id: profileId,
      ...pendingRow,
    });
  }

  return { success: true, associationName: association.name, slug: association.slug };
}

/**
 * Approva una richiesta di ingresso: la persona entra come MEMBRO SEMPLICE.
 *
 * Prima questa funzione promuoveva chiunque entrasse col codice ad association_admin
 * con permessi pieni — cioe' accesso a candidature, transcript e valutazioni AI. Era il
 * ribaltamento del modello voluto: si entra come membro e basta, la nomina ad
 * amministratore e' un atto separato ed esplicito (promoteToAdmin).
 *
 * permissions vuoto => hasWorkspaceAccess() e' false => niente dashboard.
 */
export async function approveMember(associationId: string, membershipId: string) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  if (!(await canManageMembers(supabase, associationId, (ctx.profile as any).id, ctx.isMiraAdmin))) {
    return { error: "Non hai i permessi" };
  }

  await (supabase.from("association_memberships") as any)
    .update({
      status: "active",
      role: "association_member",
      permissions: {},
      joined_at: new Date().toISOString(),
    })
    .eq("id", membershipId);

  await (supabase.from("audit_logs") as any).insert({
    actor_user_id: (ctx.profile as any).id,
    action: "association_member_approved",
    entity_type: "association_membership",
    entity_id: membershipId,
    metadata: { association_id: associationId },
  });

  await revalidateBoard(supabase, associationId);
  return { success: true };
}

/** Nomina amministratore: da qui in poi vede la dashboard. */
export async function promoteToAdmin(associationId: string, membershipId: string) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  if (!(await canManageMembers(supabase, associationId, (ctx.profile as any).id, ctx.isMiraAdmin))) {
    return { error: "Non hai i permessi" };
  }

  const template = ROLE_PERMISSION_TEMPLATES["association_admin"] ?? [];
  const permissions: Record<string, boolean> = {};
  for (const perm of template) permissions[perm] = true;

  await (supabase.from("association_memberships") as any)
    .update({ role: "association_admin", permissions })
    .eq("id", membershipId)
    .eq("status", "active");

  await (supabase.from("audit_logs") as any).insert({
    actor_user_id: (ctx.profile as any).id,
    action: "association_admin_promoted",
    entity_type: "association_membership",
    entity_id: membershipId,
    metadata: { association_id: associationId },
  });

  await revalidateBoard(supabase, associationId);
  return { success: true };
}

/** Rimuove da amministratore: torna membro semplice, ma RESTA nell'associazione. */
export async function demoteToMember(associationId: string, membershipId: string) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  if (!(await canManageMembers(supabase, associationId, (ctx.profile as any).id, ctx.isMiraAdmin))) {
    return { error: "Non hai i permessi" };
  }

  const blocked = await blocksLastAdmin(supabase, associationId, membershipId);
  if (blocked) return { error: blocked };

  await (supabase.from("association_memberships") as any)
    .update({ role: "association_member", permissions: {} })
    .eq("id", membershipId);

  await (supabase.from("audit_logs") as any).insert({
    actor_user_id: (ctx.profile as any).id,
    action: "association_admin_demoted",
    entity_type: "association_membership",
    entity_id: membershipId,
    metadata: { association_id: associationId },
  });

  await revalidateBoard(supabase, associationId);
  return { success: true };
}

/** Rifiuta una richiesta di ingresso in attesa. */
export async function rejectMember(associationId: string, membershipId: string) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  if (!(await canManageMembers(supabase, associationId, (ctx.profile as any).id, ctx.isMiraAdmin))) {
    return { error: "Non hai i permessi" };
  }

  await (supabase.from("association_memberships") as any)
    .update({ status: "removed" })
    .eq("id", membershipId);

  await revalidateBoard(supabase, associationId);
  return { success: true };
}

/**
 * "Esci dall'associazione": lo fa il membro su se stesso, dal blocco nella sua pagina
 * Associazioni. Il presidente non puo' abbandonare (resterebbe un'associazione senza
 * creatore): deve prima passare la presidenza.
 */
export async function leaveAssociation(associationId: string) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();
  const profileId = (ctx.profile as any).id as string;

  const { data: membership } = await (supabase.from("association_memberships") as any)
    .select("id, role")
    .eq("association_id", associationId)
    .eq("user_id", profileId)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) return { error: "Non sei membro di questa associazione" };

  const blocked = await blocksLastAdmin(supabase, associationId, membership.id);
  if (blocked) return { error: blocked };

  await (supabase.from("association_memberships") as any)
    .update({ status: "removed" })
    .eq("id", membership.id);

  revalidatePath("/student/associazioni");
  return { success: true };
}
