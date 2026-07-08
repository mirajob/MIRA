"use server";

import { createServiceClient } from "@mira/supabase/server";
import { getCompanyContext, getUserContext } from "@/lib/auth";

/* eslint-disable @typescript-eslint/no-explicit-any */

async function notifyCompanyMembers(
  supabase: any,
  companyId: string,
  notif: { type: string; title: string; body: string; data?: Record<string, unknown> }
) {
  const { data: members } = await supabase
    .from("company_memberships")
    .select("user_id")
    .eq("company_id", companyId)
    .eq("status", "active");

  const rows = (members ?? []).map((m: any) => ({
    user_id: m.user_id,
    type: notif.type,
    title: notif.title,
    body: notif.body,
    data: notif.data ?? {},
  }));

  if (rows.length === 0) return;
  const { error } = await supabase.from("notifications").insert(rows);
  if (error) console.error("notifyCompanyMembers failed:", error.message);
}

async function notifyStudent(
  supabase: any,
  studentProfileId: string,
  notif: { type: string; title: string; body: string; data?: Record<string, unknown> }
) {
  const { data: studentProfile } = await supabase
    .from("student_profiles")
    .select("user_id")
    .eq("id", studentProfileId)
    .single();

  if (!studentProfile?.user_id) return;

  const { error } = await supabase.from("notifications").insert({
    user_id: studentProfile.user_id,
    type: notif.type,
    title: notif.title,
    body: notif.body,
    data: notif.data ?? {},
  });
  if (error) console.error("notifyStudent failed:", error.message);
}

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

  await notifyStudent(supabase, studentProfileId, {
    type: "company_contact_request",
    title: `${(company as any).display_name ?? (company as any).legal_name} ti ha contattato`,
    body: `Ruolo: ${roleTitle}`,
    data: { link: "/student/aziende", contact_request_id: (data as any).id, company_id: (company as any).id },
  });

  return { success: true, requestId: (data as any).id };
}

export async function loadCompanyContacts(slug: string) {
  const { company } = await getCompanyContext(slug);
  const supabase = await createServiceClient();

  const { data: requests } = await (supabase.from("company_contact_requests") as any)
    .select("*, company_chats(id, status, student_identity_revealed, shared_contact)")
    .eq("company_id", (company as any).id)
    .order("created_at", { ascending: false });

  return requests ?? [];
}

export async function loadChatMessages(slug: string, chatId: string) {
  const { company } = await getCompanyContext(slug);
  const supabase = await createServiceClient();

  const { data: chat } = await (supabase.from("company_chats") as any)
    .select("id, company_id, student_profile_id, student_identity_revealed, shared_contact, status")
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

  await notifyStudent(supabase, (chat as any).student_profile_id, {
    type: messageType === "interview_invite" ? "interview_invite" : "company_chat_message",
    title: messageType === "interview_invite"
      ? `${(company as any).display_name ?? (company as any).legal_name} ti ha invitato a un colloquio`
      : `Nuovo messaggio da ${(company as any).display_name ?? (company as any).legal_name}`,
    body: content.slice(0, 100),
    data: { link: "/student/aziende", chat_id: chatId },
  });

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
  contactInfo?: { name?: string; email?: string; phone?: string }
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
  const sharedNow = accept && contactInfo && (contactInfo.name || contactInfo.email || contactInfo.phone)
    ? contactInfo
    : null;

  const { data: request } = await (supabase.from("company_contact_requests") as any)
    .update({ status, responded_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("student_profile_id", sp.id)
    .select("id, company_id, role_title, company_profiles(slug)")
    .single();

  if (!request) return { error: "Richiesta non trovata." };

  const companySlug = (request as any).company_profiles?.slug ?? "";
  const { data: profile } = await (supabase.from("profiles") as any)
    .select("full_name")
    .eq("id", profileId)
    .single();
  const studentLabel = (profile as any)?.full_name ?? "Il candidato";

  if (accept) {
    const { data: chat } = await (supabase.from("company_chats") as any)
      .insert({
        company_id: (request as any).company_id,
        student_profile_id: sp.id,
        contact_request_id: requestId,
        status: "open",
        shared_contact: sharedNow,
        student_identity_revealed: !!sharedNow,
        student_revealed_at: sharedNow ? new Date().toISOString() : null,
      })
      .select("id")
      .single();

    if (chat && sharedNow) {
      const fields = [
        sharedNow.name && `nome: ${sharedNow.name}`,
        sharedNow.email && `email: ${sharedNow.email}`,
        sharedNow.phone && `telefono: ${sharedNow.phone}`,
      ].filter(Boolean).join(", ");
      await (supabase.from("company_chat_messages") as any).insert({
        chat_id: (chat as any).id,
        sender_role: "student",
        sender_profile_id: profileId,
        message_type: "identity_reveal",
        content: `${studentLabel} ha condiviso i propri contatti: ${fields}`,
        metadata: sharedNow,
      });
    }

    await notifyCompanyMembers(supabase, (request as any).company_id, {
      type: "contact_request_accepted",
      title: `${studentLabel} ha accettato la tua richiesta di contatto`,
      body: `Ruolo: ${(request as any).role_title}`,
      data: { link: `/company/${companySlug}/contacts`, contact_request_id: requestId },
    });
  } else {
    await notifyCompanyMembers(supabase, (request as any).company_id, {
      type: "contact_request_rejected",
      title: `${studentLabel} ha rifiutato la tua richiesta di contatto`,
      body: `Ruolo: ${(request as any).role_title}`,
      data: { link: `/company/${companySlug}/contacts`, contact_request_id: requestId },
    });
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
    .select("id, company_id, student_identity_revealed, company_profiles(slug, legal_name, display_name)")
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

  const { data: profile } = await (supabase.from("profiles") as any)
    .select("full_name")
    .eq("id", profileId)
    .single();
  const studentLabel = chat.student_identity_revealed
    ? ((profile as any)?.full_name ?? "Il candidato")
    : "Il candidato (anonimo)";
  const companySlug = (chat as any).company_profiles?.slug ?? "";

  await notifyCompanyMembers(supabase, (chat as any).company_id, {
    type: "company_chat_message",
    title: `Nuovo messaggio da ${studentLabel}`,
    body: content.slice(0, 100),
    data: { link: `/company/${companySlug}/contacts`, chat_id: chatId },
  });

  return { success: true };
}

export async function shareStudentContact(
  chatId: string,
  contactInfo: { name?: string; email?: string; phone?: string }
) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();
  const profileId = (ctx.profile as any).id;

  const fields = {
    name: contactInfo.name?.trim() || undefined,
    email: contactInfo.email?.trim() || undefined,
    phone: contactInfo.phone?.trim() || undefined,
  };
  if (!fields.name && !fields.email && !fields.phone) {
    return { error: "Seleziona almeno un campo da condividere." };
  }

  const { data: sp } = await (supabase.from("student_profiles") as any)
    .select("id")
    .eq("user_id", profileId)
    .maybeSingle();

  if (!sp) return { error: "Profilo non trovato." };

  const { data: chat } = await (supabase.from("company_chats") as any)
    .select("id, company_id, shared_contact, company_profiles(slug)")
    .eq("id", chatId)
    .eq("student_profile_id", sp.id)
    .maybeSingle();

  if (!chat) return { error: "Chat non trovata." };

  const mergedContact = { ...(chat as any).shared_contact, ...fields };

  await (supabase.from("company_chats") as any)
    .update({
      shared_contact: mergedContact,
      student_identity_revealed: true,
      student_revealed_at: new Date().toISOString(),
    })
    .eq("id", chatId)
    .eq("student_profile_id", sp.id);

  const summary = [
    fields.name && `nome: ${fields.name}`,
    fields.email && `email: ${fields.email}`,
    fields.phone && `telefono: ${fields.phone}`,
  ].filter(Boolean).join(", ");

  await (supabase.from("company_chat_messages") as any).insert({
    chat_id: chatId,
    sender_role: "student",
    sender_profile_id: profileId,
    message_type: "identity_reveal",
    content: `Lo studente ha condiviso: ${summary}`,
    metadata: fields,
  });

  const companySlug = (chat as any).company_profiles?.slug ?? "";
  await notifyCompanyMembers(supabase, (chat as any).company_id, {
    type: "student_contact_shared",
    title: "Un candidato ha condiviso i propri contatti",
    body: summary,
    data: { link: `/company/${companySlug}/contacts`, chat_id: chatId },
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

  const { data: chat } = await (supabase.from("company_chats") as any)
    .select("id, company_id, company_profiles(slug)")
    .eq("id", chatId)
    .eq("student_profile_id", sp.id)
    .maybeSingle();
  if (!chat) return { error: "Chat non trovata." };

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

  const companySlug = (chat as any).company_profiles?.slug ?? "";
  await notifyCompanyMembers(supabase, (chat as any).company_id, {
    type: "interview_response",
    title: accepted ? "Un candidato ha accettato l'invito al colloquio" : "Un candidato non può partecipare al colloquio",
    body: accepted ? "Ha confermato la propria disponibilità." : "Ha chiesto di proporre un'altra data.",
    data: { link: `/company/${companySlug}/contacts`, chat_id: chatId },
  });

  return { success: true };
}
