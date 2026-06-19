"use server";

import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";
function generateToken() {
  const array = new Uint8Array(32);
  require("crypto").randomFillSync(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}
import { INVITATION_EXPIRY_DAYS, ROLE_PERMISSION_TEMPLATES } from "@mira/domain";
import type { AssociationPermission } from "@mira/domain";

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
