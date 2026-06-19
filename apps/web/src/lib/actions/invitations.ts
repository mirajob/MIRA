"use server";

import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { INVITATION_EXPIRY_DAYS } from "@mira/domain";

export async function createPresidentInvitation(formData: FormData) {
  const ctx = await getUserContext();
  if (!ctx.isMiraAdmin) redirect("/student");

  const email = formData.get("email") as string;
  const associationName = formData.get("associationName") as string;
  const category = formData.get("category") as string | null;
  const website = formData.get("website") as string | null;
  const note = formData.get("note") as string | null;

  if (!email || !associationName) {
    return { error: "Email e nome associazione sono obbligatori" };
  }

  const supabase = await createServiceClient();

  const { data: existing } = await supabase
    .from("invitations")
    .select("id")
    .eq("invited_email", email.toLowerCase())
    .eq("invitation_type", "association_president")
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return { error: "Esiste già un invito attivo per questa email" };
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

  const { error } = await supabase.from("invitations").insert({
    invitation_type: "association_president",
    invited_email: email.toLowerCase(),
    invited_email_domain: email.split("@")[1],
    invitation_token: token,
    invited_by_user_id: ctx.profile.id,
    invited_role: "association_president",
    expires_at: expiresAt.toISOString(),
    metadata: {
      association_name: associationName,
      category: category || null,
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
      invitation_type: "association_president",
      invited_email: email.toLowerCase(),
      association_name: associationName,
    },
  });

  revalidatePath("/admin/invitations");
  return { success: true, token };
}

export async function revokeInvitation(invitationId: string) {
  const ctx = await getUserContext();
  if (!ctx.isMiraAdmin) redirect("/student");

  const supabase = await createServiceClient();

  const { error } = await supabase
    .from("invitations")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
    })
    .eq("id", invitationId)
    .eq("status", "pending");

  if (error) {
    return { error: `Errore nella revoca: ${error.message}` };
  }

  await supabase.from("audit_logs").insert({
    actor_user_id: ctx.profile.id,
    action: "invitation_revoked",
    entity_type: "invitation",
    entity_id: invitationId,
  });

  revalidatePath("/admin/invitations");
  return { success: true };
}
