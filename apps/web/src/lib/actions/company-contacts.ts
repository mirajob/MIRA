"use server";

import { createServiceClient } from "@mira/supabase/server";
import { getCompanyContext, getUserContext } from "@/lib/auth";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---- COMPANY SIDE ----

export async function sendContactRequest(
  slug: string,
  code: string,
  roleTitle: string,
  message: string
) {
  const { company, profile } = await getCompanyContext(slug);
  const supabase = await createServiceClient();

  // Resolve the stable per-company candidate code → real student profile ID server-side
  const { data: codeRow } = await (supabase.from("company_candidate_codes") as any)
    .select("student_profile_id")
    .eq("company_id", (company as any).id)
    .eq("code", code)
    .maybeSingle();

  const studentProfileId = codeRow?.student_profile_id as string | undefined;
  if (!studentProfileId) return { error: "Candidato non trovato." };

  const { data, error } = await (supabase.from("company_contact_requests") as any)
    .insert({
      company_id: (company as any).id,
      student_profile_id: studentProfileId,
      created_by_user_id: (profile as any).id,
      role_title: roleTitle,
      message,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { error: "Hai già inviato una richiesta a questo candidato." };
    return { error: error.message };
  }

  // Create notification for student
  const { data: studentProfile } = await (supabase.from("student_profiles") as any)
    .select("user_id")
    .eq("id", studentProfileId)
    .single();

  if (studentProfile?.user_id) {
    await (supabase.from("notifications") as any).insert({
      user_id: studentProfile.user_id,
      type: "company_contact_request",
      title: `${(company as any).display_name ?? (company as any).legal_name} ti ha contattato`,
      body: `Ruolo: ${roleTitle}`,
      link: "/student/aziende",
      metadata: { contact_request_id: (data as any).id, company_id: (company as any).id },
    });
  }

  return { success: true, requestId: (data as any).id };
}

export async function loadCompanyContacts(slug: string) {
  const { company } = await getCompanyContext(slug);
  const supabase = await createServiceClient();

  const { data: requests } = await (supabase.from("company_contact_requests") as any)
    .select("*, company_chats(id, status, student_identity_revealed)")
    .eq("company_id", (company as any).id)
    .order("created_at", { ascending: false });

  return requests ?? [];
}

export async function loadChatMessages(slug: string, chatId: string) {
  const { company } = await getCompanyContext(slug);
  const supabase = await createServiceClient();

  const { data: chat } = await (supabase.from("company_chats") as any)
    .select("id, company_id, student_profile_id, student_identity_revealed, status")
    .eq("id", chatId)
    .eq("company_id", (company as any).id)
    .maybeSingle();

  if (!chat) return { messages: [], chat: null };

  const { data: messages } = await (supabase.from("company_chat_messages") as any)
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  // Mark company messages as read
  await (supabase.from("company_chat_messages") as any)
    .update({ read_at: new Date().toISOString() })
    .eq("chat_id", chatId)
    .eq("sender_role", "student")
    .is("read_at", null);

  return { messages: messages ?? [], chat };
}

export async function sendCompanyChatMessage(
  slug: string,
  chatId: string,
  content: string,
  messageType: "text" | "interview_invite" = "text",
  metadata: Record<string, unknown> = {}
) {
  const { company, profile } = await getCompanyContext(slug);
  const supabase = await createServiceClient();

  const { data: chat } = await (supabase.from("company_chats") as any)
    .select("id, student_profile_id, company_id")
    .eq("id", chatId)
    .eq("company_id", (company as any).id)
    .maybeSingle();

  if (!chat) return { error: "Chat non trovata." };

  const { error } = await (supabase.from("company_chat_messages") as any).insert({
    chat_id: chatId,
    sender_role: "company",
    sender_profile_id: (profile as any).id,
    message_type: messageType,
    content,
    metadata,
  });

  if (error) return { error: error.message };

  // Notify student
  const { data: studentProfile } = await (supabase.from("student_profiles") as any)
    .select("user_id")
    .eq("id", (chat as any).student_profile_id)
    .single();

  if (studentProfile?.user_id) {
    await (supabase.from("notifications") as any).insert({
      user_id: studentProfile.user_id,
      type: messageType === "interview_invite" ? "interview_invite" : "company_chat_message",
      title: messageType === "interview_invite"
        ? `${(company as any).display_name ?? (company as any).legal_name} ti ha invitato a un colloquio`
        : `Nuovo messaggio da ${(company as any).display_name ?? (company as any).legal_name}`,
      body: content.slice(0, 100),
      link: `/student/aziende`,
      metadata: { chat_id: chatId },
    });
  }

  return { success: true };
}

// ---- STUDENT SIDE ----

export async function loadStudentContactRequests() {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();
  const profileId = (ctx.profile as any).id;

  const { data: sp } = await (supabase.from("student_profiles") as any)
    .select("id")
    .eq("user_id", profileId)
    .maybeSingle();

  if (!sp) return [];

  const { data: requests } = await (supabase.from("company_contact_requests") as any)
    .select("*, company_profiles(id, legal_name, display_name, sector, website_url, description), company_chats(id, status)")
    .eq("student_profile_id", sp.id)
    .order("created_at", { ascending: false });

  return requests ?? [];
}

export async function respondToContactRequest(
  requestId: string,
  accept: boolean,
  contactInfo?: { email: string; phone?: string }
) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();
  const profileId = (ctx.profile as any).id;

  const { data: sp } = await (supabase.from("student_profiles") as any)
    .select("id")
    .eq("user_id", profileId)
    .maybeSingle();

  if (!sp) return { error: "Profilo studente non trovato." };

  const status = accept ? "accepted" : "rejected";

  await (supabase.from("company_contact_requests") as any)
    .update({
      status,
      student_contact_info: accept && contactInfo ? contactInfo : null,
      responded_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("student_profile_id", sp.id);

  if (accept) {
    // Open chat
    const { data: request } = await (supabase.from("company_contact_requests") as any)
      .select("company_id")
      .eq("id", requestId)
      .single();

    if (request) {
      await (supabase.from("company_chats") as any).insert({
        company_id: (request as any).company_id,
        student_profile_id: sp.id,
        contact_request_id: requestId,
        status: "open",
      });
    }
  }

  return { success: true };
}

export async function loadStudentChats() {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();
  const profileId = (ctx.profile as any).id;

  const { data: sp } = await (supabase.from("student_profiles") as any)
    .select("id")
    .eq("user_id", profileId)
    .maybeSingle();

  if (!sp) return [];

  const { data: chats } = await (supabase.from("company_chats") as any)
    .select("*, company_profiles(legal_name, display_name, sector), company_contact_requests(role_title)")
    .eq("student_profile_id", sp.id)
    .eq("status", "open")
    .order("updated_at", { ascending: false });

  return chats ?? [];
}

export async function loadStudentChatMessages(chatId: string) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();
  const profileId = (ctx.profile as any).id;

  const { data: sp } = await (supabase.from("student_profiles") as any)
    .select("id")
    .eq("user_id", profileId)
    .maybeSingle();

  if (!sp) return { messages: [], chat: null };

  const { data: chat } = await (supabase.from("company_chats") as any)
    .select("*, company_profiles(legal_name, display_name, sector), company_contact_requests(role_title)")
    .eq("id", chatId)
    .eq("student_profile_id", sp.id)
    .maybeSingle();

  if (!chat) return { messages: [], chat: null };

  const { data: messages } = await (supabase.from("company_chat_messages") as any)
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  await (supabase.from("company_chat_messages") as any)
    .update({ read_at: new Date().toISOString() })
    .eq("chat_id", chatId)
    .eq("sender_role", "company")
    .is("read_at", null);

  return { messages: messages ?? [], chat };
}

export async function sendStudentChatMessage(chatId: string, content: string) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();
  const profileId = (ctx.profile as any).id;

  const { data: sp } = await (supabase.from("student_profiles") as any)
    .select("id")
    .eq("user_id", profileId)
    .maybeSingle();

  if (!sp) return { error: "Profilo studente non trovato." };

  const { data: chat } = await (supabase.from("company_chats") as any)
    .select("id, company_id, student_identity_revealed")
    .eq("id", chatId)
    .eq("student_profile_id", sp.id)
    .maybeSingle();

  if (!chat) return { error: "Chat non trovata." };

  const { error } = await (supabase.from("company_chat_messages") as any).insert({
    chat_id: chatId,
    sender_role: "student",
    sender_profile_id: profileId,
    message_type: "text",
    content,
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function revealStudentIdentity(chatId: string) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();
  const profileId = (ctx.profile as any).id;

  const { data: sp } = await (supabase.from("student_profiles") as any)
    .select("id")
    .eq("user_id", profileId)
    .maybeSingle();

  if (!sp) return { error: "Profilo non trovato." };

  await (supabase.from("company_chats") as any)
    .update({ student_identity_revealed: true, student_revealed_at: new Date().toISOString() })
    .eq("id", chatId)
    .eq("student_profile_id", sp.id);

  // Send a system message to notify company
  const { data: profile } = await (supabase.from("profiles") as any)
    .select("full_name, email")
    .eq("id", profileId)
    .single();

  await (supabase.from("company_chat_messages") as any).insert({
    chat_id: chatId,
    sender_role: "student",
    sender_profile_id: profileId,
    message_type: "identity_reveal",
    content: `Lo studente ha condiviso la propria identità: ${(profile as any)?.full_name ?? ""} — ${(profile as any)?.email ?? ""}`,
    metadata: { full_name: (profile as any)?.full_name, email: (profile as any)?.email },
  });

  return { success: true };
}

export async function respondToInterviewInvite(chatId: string, messageId: string, accepted: boolean) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();
  const profileId = (ctx.profile as any).id;

  const { data: sp } = await (supabase.from("student_profiles") as any)
    .select("id")
    .eq("user_id", profileId)
    .maybeSingle();

  if (!sp) return { error: "Profilo non trovato." };

  // Scope update to chat_id to prevent cross-chat message tampering
  const { data: existing } = await (supabase.from("company_chat_messages") as any)
    .select("metadata")
    .eq("id", messageId)
    .eq("chat_id", chatId)
    .single();
  if (!existing) return { error: "Messaggio non trovato." };

  await (supabase.from("company_chat_messages") as any)
    .update({ metadata: { ...(existing.metadata ?? {}), response: accepted ? "accepted" : "rejected" } })
    .eq("id", messageId)
    .eq("chat_id", chatId);

  await (supabase.from("company_chat_messages") as any).insert({
    chat_id: chatId,
    sender_role: "student",
    sender_profile_id: profileId,
    message_type: "text",
    content: accepted ? "Ho accettato l'invito al colloquio." : "Non riesco a partecipare a questo colloquio. Puoi proporre un'altra data?",
  });

  return { success: true };
}
