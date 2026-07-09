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

/* eslint-disable @typescript-eslint/no-explicit-any */

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

  const { data: membership } = await supabase
    .from("association_memberships")
    .select("role, permissions")
    .eq("association_id", associationId)
    .eq("user_id", ctx.profile.id)
    .eq("status", "active")
    .maybeSingle();

  const canRemove =
    ctx.isMiraAdmin ||
    membership?.role === "association_president" ||
    (membership?.permissions as Record<string, boolean>)?.manage_board_permissions;

  if (!canRemove) {
    return { error: "Non hai i permessi" };
  }

  const { data: target } = await supabase
    .from("association_memberships")
    .select("role, user_id")
    .eq("id", membershipId)
    .single();

  if (target?.role === "association_president") {
    return { error: "Non puoi rimuovere il presidente" };
  }

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
    .select("id")
    .eq("association_id", association.id)
    .eq("user_id", profileId)
    .maybeSingle();

  if (existing) return { error: "Hai già una richiesta o sei già nel board di questa associazione" };

  await (supabase.from("association_memberships") as any).insert({
    association_id: association.id,
    user_id: profileId,
    role: "association_member",
    title: roleTitle || null,
    permissions: {},
    status: "pending_approval",
    joined_at: null,
  });

  return { success: true, associationName: association.name, slug: association.slug };
}

export async function approveBoardMember(associationId: string, membershipId: string) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  const { data: membership } = await (supabase.from("association_memberships") as any)
    .select("role")
    .eq("association_id", associationId)
    .eq("user_id", (ctx.profile as any).id)
    .eq("status", "active")
    .maybeSingle();

  if (!ctx.isMiraAdmin && membership?.role !== "association_president") {
    return { error: "Non hai i permessi" };
  }

  const template = ROLE_PERMISSION_TEMPLATES["association_admin"] ?? [];
  const permissions: Record<string, boolean> = {};
  for (const perm of template) {
    permissions[perm] = true;
  }

  await (supabase.from("association_memberships") as any)
    .update({
      status: "active",
      role: "association_admin",
      permissions,
      joined_at: new Date().toISOString(),
    })
    .eq("id", membershipId);

  const { data: assocData } = await (supabase.from("association_profiles") as any)
    .select("slug").eq("id", associationId).single();
  revalidatePath(`/association/${assocData?.slug}/board`);
  return { success: true };
}

export async function rejectBoardMember(associationId: string, membershipId: string) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  const { data: membership } = await (supabase.from("association_memberships") as any)
    .select("role")
    .eq("association_id", associationId)
    .eq("user_id", (ctx.profile as any).id)
    .eq("status", "active")
    .maybeSingle();

  if (!ctx.isMiraAdmin && membership?.role !== "association_president") {
    return { error: "Non hai i permessi" };
  }

  await (supabase.from("association_memberships") as any)
    .update({ status: "removed" })
    .eq("id", membershipId);

  const { data: assocData } = await (supabase.from("association_profiles") as any)
    .select("slug").eq("id", associationId).single();
  revalidatePath(`/association/${assocData?.slug}/board`);
  return { success: true };
}
