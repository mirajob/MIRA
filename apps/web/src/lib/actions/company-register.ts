"use server";

import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { sendCompanyInvitationEmail, sendCompanyRejectionEmail } from "@/lib/email";
import { INVITATION_EXPIRY_DAYS } from "@mira/domain";
import { revalidatePath } from "next/cache";

/* eslint-disable @typescript-eslint/no-explicit-any */

function generateToken() {
  const array = new Uint8Array(32);
  require("crypto").randomFillSync(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function requestCompanyAccess(input: {
  legalName: string;
  sector: string;
  websiteUrl: string;
  contactName: string;
  email: string;
}) {
  if (!input.legalName || !input.contactName || !input.email) {
    return { error: "Compila tutti i campi obbligatori." };
  }

  const supabase = await createServiceClient();
  const normalizedEmail = input.email.trim().toLowerCase();

  const { data: existing } = await supabase
    .from("company_access_requests")
    .select("id")
    .eq("email", normalizedEmail)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return { error: "Hai già una richiesta in attesa con questa email." };
  }

  const { error } = await supabase.from("company_access_requests").insert({
    legal_name: input.legalName,
    sector: input.sector || null,
    website_url: input.websiteUrl || null,
    contact_name: input.contactName,
    email: normalizedEmail,
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function approveCompanyAccessRequest(requestId: string) {
  const ctx = await getUserContext();
  if (!ctx.isMiraAdmin) return { error: "Non autorizzato." };

  const supabase = await createServiceClient();

  const { data: request } = await supabase
    .from("company_access_requests")
    .select("*")
    .eq("id", requestId)
    .eq("status", "pending")
    .maybeSingle();

  if (!request) return { error: "Richiesta non trovata." };

  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

  const { error: inviteError } = await supabase.from("invitations").insert({
    invitation_type: "company_admin",
    invited_email: request.email,
    invited_email_domain: request.email.split("@")[1],
    invitation_token: token,
    invited_by_user_id: ctx.profile.id,
    invited_role: "admin",
    expires_at: expiresAt.toISOString(),
    metadata: {
      company_name: request.legal_name,
      sector: request.sector,
      website: request.website_url,
      contact_name: request.contact_name,
    },
  });

  if (inviteError) return { error: inviteError.message };

  await supabase
    .from("company_access_requests")
    .update({ status: "approved", reviewed_by_user_id: ctx.profile.id, reviewed_at: new Date().toISOString() })
    .eq("id", requestId);

  await supabase.from("audit_logs").insert({
    actor_user_id: ctx.profile.id,
    action: "company_access_request_approved",
    entity_type: "company_access_request",
    entity_id: requestId,
    metadata: { email: request.email, legal_name: request.legal_name },
  });

  const inviteUrl = `https://mirajob.cloud/invite/${token}`;
  const emailResult = await sendCompanyInvitationEmail({
    email: request.email,
    companyName: request.legal_name,
    inviteUrl,
    note: null,
  });

  revalidatePath("/admin/companies");
  return { success: true, emailError: emailResult.error };
}

export async function rejectCompanyAccessRequest(requestId: string, reason: string) {
  const ctx = await getUserContext();
  if (!ctx.isMiraAdmin) return { error: "Non autorizzato." };

  const supabase = await createServiceClient();

  const { data: request } = await supabase
    .from("company_access_requests")
    .select("*")
    .eq("id", requestId)
    .eq("status", "pending")
    .maybeSingle();

  if (!request) return { error: "Richiesta non trovata." };

  await supabase
    .from("company_access_requests")
    .update({
      status: "rejected",
      rejected_reason: reason || null,
      reviewed_by_user_id: ctx.profile.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  await supabase.from("audit_logs").insert({
    actor_user_id: ctx.profile.id,
    action: "company_access_request_rejected",
    entity_type: "company_access_request",
    entity_id: requestId,
    metadata: { email: request.email, legal_name: request.legal_name, reason },
  });

  const emailResult = await sendCompanyRejectionEmail({
    email: request.email,
    companyName: request.legal_name,
    reason: reason || null,
  });

  revalidatePath("/admin/companies");
  return { success: true, emailError: emailResult.error };
}

export async function checkPendingCompanyRequest(email: string) {
  const supabase = await createServiceClient();
  const { data } = await supabase
    .from("company_access_requests")
    .select("id")
    .eq("email", email.trim().toLowerCase())
    .eq("status", "pending")
    .maybeSingle();
  return !!data;
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
