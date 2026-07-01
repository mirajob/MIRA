"use server";

import { createServiceClient } from "@mira/supabase/server";

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
  authUserId: string;
  legalName: string;
  sector: string;
  websiteUrl: string;
  contactName: string;
}) {
  const supabase = await createServiceClient();

  const profileId = await waitForProfile(supabase, input.authUserId);
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
    // Delete the auth user so the same email can be used again
    await supabase.auth.admin.deleteUser(input.authUserId).catch(() => {});
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
  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("company_profiles")
    .update({ verification_status: "verified", verified_at: new Date().toISOString() })
    .eq("id", companyId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function rejectCompany(companyId: string, reason: string) {
  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("company_profiles")
    .update({ verification_status: "rejected", rejected_reason: reason })
    .eq("id", companyId);
  if (error) return { error: error.message };
  return { success: true };
}
