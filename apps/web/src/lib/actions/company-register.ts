"use server";

import { createServiceClient, createServerClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { sendCompanyInvitationEmail } from "@/lib/email";
import { INVITATION_EXPIRY_DAYS } from "@mira/domain";
import { revalidatePath } from "next/cache";

/* eslint-disable @typescript-eslint/no-explicit-any */

function generateToken() {
  const array = new Uint8Array(32);
  require("crypto").randomFillSync(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

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
      .from("company_profiles")
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

export async function setupCompanyProfile(input: {
  legalName: string;
  sector: string;
  websiteUrl: string;
  contactName: string;
}) {
  // Read auth from session — never trust client-supplied user IDs
  const serverClient = await createServerClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return { error: "Sessione non valida. Riprova." };

  const supabase = await createServiceClient();

  const profileId = await waitForProfile(supabase, user.id);
  if (!profileId) return { error: "Profilo non trovato dopo la registrazione. Riprova." };

  // Update full_name on profile (trigger may not have it if signup happened via client)
  if (input.contactName) {
    await supabase
      .from("profiles")
      .update({ full_name: input.contactName })
      .eq("id", profileId);
  }

  const baseSlug = toSlug(input.legalName) || "azienda";
  const slug = await uniqueSlug(supabase, baseSlug);

  const { data: company, error: companyErr } = await supabase
    .from("company_profiles")
    .insert({
      created_by_user_id: profileId,
      legal_name: input.legalName,
      display_name: input.legalName,
      slug,
      sector: input.sector || null,
      website_url: input.websiteUrl || null,
      verification_status: "pending_verification",
    })
    .select("id, slug")
    .single();

  if (companyErr) {
    console.error("company_profiles insert error:", companyErr);
    await supabase.auth.admin.deleteUser(user.id).catch(() => {});
    return { error: "Errore nella creazione del profilo aziendale." };
  }

  await supabase.from("company_memberships").insert({
    company_id: (company as any).id,
    user_id: profileId,
    role: "admin",
    status: "active",
    joined_at: new Date().toISOString(),
  });

  await supabase.from("global_role_assignments").insert({
    user_id: profileId,
    role: "company_user",
  });

  return { success: true, slug: (company as any).slug as string };
}

export async function approveCompany(companyId: string) {
  const ctx = await getUserContext();
  if (!ctx.isMiraAdmin) return { error: "Non autorizzato." };

  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("company_profiles")
    .update({ verification_status: "verified", verified_at: new Date().toISOString() })
    .eq("id", companyId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function rejectCompany(companyId: string, reason: string) {
  const ctx = await getUserContext();
  if (!ctx.isMiraAdmin) return { error: "Non autorizzato." };

  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("company_profiles")
    .update({ verification_status: "rejected", rejected_reason: reason })
    .eq("id", companyId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function createCompanyInvitation(formData: FormData) {
  const ctx = await getUserContext();
  if (!ctx.isMiraAdmin) return { error: "Non autorizzato." };

  const email = formData.get("email") as string;
  const companyName = formData.get("companyName") as string;
  const sector = formData.get("sector") as string | null;
  const website = formData.get("website") as string | null;
  const note = formData.get("note") as string | null;

  if (!email || !companyName) {
    return { error: "Email e nome azienda sono obbligatori" };
  }

  const supabase = await createServiceClient();

  const { data: existing } = await supabase
    .from("invitations")
    .select("id")
    .eq("invited_email", email.toLowerCase())
    .eq("invitation_type", "company_admin")
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return { error: "Esiste già un invito attivo per questa email" };
  }

  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

  const { error } = await supabase.from("invitations").insert({
    invitation_type: "company_admin",
    invited_email: email.toLowerCase(),
    invited_email_domain: email.split("@")[1],
    invitation_token: token,
    invited_by_user_id: ctx.profile.id,
    invited_role: "admin",
    expires_at: expiresAt.toISOString(),
    metadata: {
      company_name: companyName,
      sector: sector || null,
      website: website || null,
      note: note || null,
    },
  });

  if (error) {
    return { error: `Errore nella creazione dell'invito: ${error.message}` };
  }

  await supabase.from("audit_logs").insert({
    actor_user_id: ctx.profile.id,
    action: "invitation_created",
    entity_type: "invitation",
    metadata: {
      invitation_type: "company_admin",
      invited_email: email.toLowerCase(),
      company_name: companyName,
    },
  });

  const inviteUrl = `https://mirajob.cloud/invite/${token}`;
  const emailResult = await sendCompanyInvitationEmail({
    email: email.toLowerCase(),
    companyName,
    inviteUrl,
    note,
  });

  revalidatePath("/admin/companies");
  return { success: true, token, emailError: emailResult.error };
}

export async function revokeCompanyInvitation(invitationId: string) {
  const ctx = await getUserContext();
  if (!ctx.isMiraAdmin) return { error: "Non autorizzato." };

  const supabase = await createServiceClient();

  const { error } = await supabase
    .from("invitations")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("id", invitationId)
    .eq("status", "pending");

  if (error) return { error: `Errore nella revoca: ${error.message}` };

  await supabase.from("audit_logs").insert({
    actor_user_id: ctx.profile.id,
    action: "invitation_revoked",
    entity_type: "invitation",
    entity_id: invitationId,
  });

  revalidatePath("/admin/companies");
  return { success: true };
}
