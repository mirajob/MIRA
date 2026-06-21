"use server";

import { createServerClient, createServiceClient } from "@mira/supabase/server";
import { redirect } from "next/navigation";
import { ROLE_PERMISSION_TEMPLATES } from "@mira/domain";

export async function acceptInvitation(token: string) {
  // Use cookie-based client for auth, service client for DB writes
  const authClient = await createServerClient();
  const supabase = await createServiceClient();

  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    redirect(`/login?redirect=/invite/${token}`);
  }

  const { data: invitation } = await supabase
    .from("invitations")
    .select("*")
    .eq("invitation_token", token)
    .eq("status", "pending")
    .maybeSingle();

  if (!invitation) {
    return { error: "Invito non trovato o non più valido" };
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return { error: "Questo invito è scaduto" };
  }

  if (user.email?.toLowerCase() !== invitation.invited_email.toLowerCase()) {
    return { error: `Questo invito è riservato a ${invitation.invited_email}. Accedi con quell'email.` };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile) {
    return { error: "Profilo non trovato. Completa la registrazione." };
  }

  const metadata = invitation.metadata as Record<string, string>;

  if (invitation.invitation_type === "association_president") {
    return await acceptPresidentInvitation(supabase, invitation, profile.id, metadata);
  }

  if (invitation.invitation_type === "association_board_member") {
    return await acceptBoardInvitation(supabase, invitation, profile.id, metadata);
  }

  return { error: "Tipo di invito non supportato" };
}

async function acceptPresidentInvitation(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  invitation: Record<string, unknown>,
  profileId: string,
  metadata: Record<string, string>
) {
  const slug = metadata.association_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const { data: association, error: assocError } = await supabase
    .from("association_profiles")
    .insert({
      name: metadata.association_name,
      slug,
      category: metadata.category || null,
      website_url: metadata.website || null,
      official: true,
      created_by_user_id: profileId,
    })
    .select()
    .single();

  if (assocError) {
    if (assocError.code === "23505") {
      return { error: "Un'associazione con questo nome esiste già" };
    }
    return { error: `Errore: ${assocError.message}` };
  }

  const permissions: Record<string, boolean> = {};
  for (const perm of ROLE_PERMISSION_TEMPLATES.association_president) {
    permissions[perm] = true;
  }

  await supabase.from("association_memberships").insert({
    association_id: association.id,
    user_id: profileId,
    role: "association_president",
    permissions,
    status: "active",
    joined_at: new Date().toISOString(),
  });

  await finalizeInvitation(supabase, invitation, profileId, association.id, metadata);
  redirect(`/association/${slug}`);
}

async function acceptBoardInvitation(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  invitation: Record<string, unknown>,
  profileId: string,
  metadata: Record<string, string>
) {
  const associationId = invitation.association_id as string;
  if (!associationId) {
    return { error: "Invito non valido: associazione mancante" };
  }

  const role = (invitation.invited_role as string) ?? "association_member";
  const permissions = (invitation.invited_permissions as Record<string, boolean>) ?? {};

  await supabase.from("association_memberships").insert({
    association_id: associationId,
    user_id: profileId,
    role,
    permissions,
    status: "active",
    joined_at: new Date().toISOString(),
    invited_by_user_id: invitation.invited_by_user_id as string,
  });

  await finalizeInvitation(supabase, invitation, profileId, associationId, metadata);
  redirect(`/association/${metadata.association_slug}`);
}

async function finalizeInvitation(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  invitation: Record<string, unknown>,
  profileId: string,
  associationId: string,
  metadata: Record<string, string>
) {
  await supabase
    .from("invitations")
    .update({
      status: "accepted",
      accepted_by_user_id: profileId,
      accepted_at: new Date().toISOString(),
      association_id: associationId,
    })
    .eq("id", invitation.id as string);

  await supabase.from("audit_logs").insert({
    actor_user_id: profileId,
    action: "invitation_accepted",
    entity_type: "invitation",
    entity_id: invitation.id as string,
    metadata: {
      invitation_type: invitation.invitation_type,
      association_id: associationId,
      association_name: metadata.association_name,
    },
  });
}
