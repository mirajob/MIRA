"use server";

import { createServiceClient, createServerClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { ensureStudentProfile } from "@/lib/student-provisioning";
import { sendAssociationDecisionEmail } from "@/lib/email";
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

export async function setupAssociationProfile(input: {
  associationName: string;
  category: string;
  websiteUrl: string;
  description: string;
  presidentName: string;
}) {
  // Read auth from session — never trust client-supplied user IDs
  const serverClient = await createServerClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return { error: "Sessione non valida. Riprova." };

  const supabase = await createServiceClient();

  const profileId = await waitForProfile(supabase, user.id);
  if (!profileId) return { error: "Profilo non trovato dopo la registrazione. Riprova." };

  if (input.presidentName) {
    await supabase.from("profiles").update({ full_name: input.presidentName }).eq("id", profileId);
  }

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
      contact_email: user.email,
      official: false,
      verification_status: "pending_verification",
      created_by_user_id: profileId,
    })
    .select("id, slug, name")
    .single();

  if (assocErr) {
    console.error("association_profiles insert error:", assocErr);
    await supabase.auth.admin.deleteUser(user.id).catch(() => {});
    return { error: "Errore nella creazione della pagina associazione." };
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

  await ensureStudentProfile(supabase, profileId, user.email);

  return { success: true, slug: association.slug as string, name: association.name as string };
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
