"use server";

import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function updateAssociationProfile(associationId: string, formData: FormData) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  const { data: membership } = await supabase
    .from("association_memberships")
    .select("role, permissions")
    .eq("association_id", associationId)
    .eq("user_id", ctx.profile.id)
    .eq("status", "active")
    .maybeSingle();

  const canEdit =
    ctx.isMiraAdmin ||
    membership?.role === "association_president" ||
    (membership?.permissions as Record<string, boolean>)?.manage_association_profile;

  if (!canEdit) {
    return { error: "Non hai i permessi per modificare questa associazione" };
  }

  const name = formData.get("name") as string;
  const shortDescription = formData.get("shortDescription") as string;
  const longDescription = formData.get("longDescription") as string;
  const category = formData.get("category") as string;
  const websiteUrl = formData.get("websiteUrl") as string;
  const contactEmail = formData.get("contactEmail") as string;
  const sectorsRaw = formData.get("sectors") as string;
  const sectors = sectorsRaw ? sectorsRaw.split(",").map((s) => s.trim()).filter(Boolean) : [];

  const { data: association, error } = await supabase
    .from("association_profiles")
    .update({
      name: name || undefined,
      short_description: shortDescription || null,
      long_description: longDescription || null,
      category: category || null,
      website_url: websiteUrl || null,
      contact_email: contactEmail || null,
      sectors: sectors.length > 0 ? sectors : null,
    })
    .eq("id", associationId)
    .select("slug")
    .single();

  if (error) {
    return { error: `Errore nel salvataggio: ${error.message}` };
  }

  revalidatePath(`/association/${association.slug}/public-page`);
  revalidatePath(`/associations/${association.slug}`);
  return { success: true };
}

export async function publishAssociationPage(associationId: string) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  const { data: membership } = await supabase
    .from("association_memberships")
    .select("role, permissions")
    .eq("association_id", associationId)
    .eq("user_id", ctx.profile.id)
    .eq("status", "active")
    .maybeSingle();

  const canPublish =
    ctx.isMiraAdmin ||
    membership?.role === "association_president" ||
    (membership?.permissions as Record<string, boolean>)?.manage_public_page;

  if (!canPublish) {
    return { error: "Non hai i permessi per pubblicare" };
  }

  const { data: association, error } = await supabase
    .from("association_profiles")
    .update({ public_page_status: "published" })
    .eq("id", associationId)
    .select("slug")
    .single();

  if (error) {
    return { error: error.message };
  }

  await supabase.from("audit_logs").insert({
    actor_user_id: ctx.profile.id,
    action: "association_page_published",
    entity_type: "association_profile",
    entity_id: associationId,
  });

  revalidatePath(`/association/${association.slug}/public-page`);
  revalidatePath(`/associations/${association.slug}`);
  return { success: true };
}
