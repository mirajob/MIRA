"use server";

import { createServerClient, createServiceClient } from "@mira/supabase/server";
import { redirect } from "next/navigation";
import { ROLE_PERMISSION_TEMPLATES } from "@mira/domain";
import { ensureStudentProfile } from "@/lib/student-provisioning";

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

async function uniqueSlug(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  table: "association_profiles" | "company_profiles",
  base: string
): Promise<string> {
  let slug = base;
  let i = 2;
  while (true) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from(table) as any).select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
    slug = `${base}-${i++}`;
  }
}

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
    return await acceptPresidentInvitation(supabase, invitation, profile.id, metadata, user.email);
  }

  if (invitation.invitation_type === "association_board_member") {
    return await acceptBoardInvitation(supabase, invitation, profile.id, metadata, user.email);
  }

  if (invitation.invitation_type === "company_admin") {
    return await acceptCompanyInvitation(supabase, invitation, profile.id, metadata);
  }

  return { error: "Tipo di invito non supportato" };
}

async function acceptPresidentInvitation(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  invitation: Record<string, unknown>,
  profileId: string,
  metadata: Record<string, string>,
  email: string | null | undefined
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
      verification_status: "verified",
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

  await ensureStudentProfile(supabase, profileId, email);
  await finalizeInvitation(supabase, invitation, profileId, { association_id: association.id, metadata });
  redirect("/student/associazioni");
}

async function acceptBoardInvitation(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  invitation: Record<string, unknown>,
  profileId: string,
  metadata: Record<string, string>,
  email: string | null | undefined
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

  await ensureStudentProfile(supabase, profileId, email);
  await finalizeInvitation(supabase, invitation, profileId, { association_id: associationId, metadata });
  redirect("/student/associazioni");
}

async function acceptCompanyInvitation(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  invitation: Record<string, unknown>,
  profileId: string,
  metadata: Record<string, string>
) {
  const baseSlug = toSlug(metadata.company_name) || "azienda";
  const slug = await uniqueSlug(supabase, "company_profiles", baseSlug);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: company, error: companyError } = await (supabase.from("company_profiles") as any)
    .insert({
      legal_name: metadata.company_name,
      display_name: metadata.company_name,
      slug,
      sector: metadata.sector || null,
      website_url: metadata.website || null,
      verification_status: "verified",
      verified_at: new Date().toISOString(),
      created_by_user_id: profileId,
    })
    .select("id, slug")
    .single();

  if (companyError) {
    return { error: `Errore: ${companyError.message}` };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("company_memberships") as any).insert({
    company_id: company.id,
    user_id: profileId,
    role: "admin",
    status: "active",
    joined_at: new Date().toISOString(),
    invited_by_user_id: invitation.invited_by_user_id as string,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("global_role_assignments") as any).insert({
    user_id: profileId,
    role: "company_user",
  });

  await finalizeInvitation(supabase, invitation, profileId, { metadata });
  redirect(`/company/${company.slug}`);
}

async function finalizeInvitation(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  invitation: Record<string, unknown>,
  profileId: string,
  extra: { association_id?: string; metadata: Record<string, string> }
) {
  await supabase
    .from("invitations")
    .update({
      status: "accepted",
      accepted_by_user_id: profileId,
      accepted_at: new Date().toISOString(),
      ...(extra.association_id ? { association_id: extra.association_id } : {}),
    })
    .eq("id", invitation.id as string);

  await supabase.from("audit_logs").insert({
    actor_user_id: profileId,
    action: "invitation_accepted",
    entity_type: "invitation",
    entity_id: invitation.id as string,
    metadata: {
      invitation_type: invitation.invitation_type,
      association_id: extra.association_id ?? null,
      association_name: extra.metadata.association_name ?? null,
      company_name: extra.metadata.company_name ?? null,
    },
  });
}
