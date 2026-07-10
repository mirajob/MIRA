"use client";

import { useState, useEffect, useRef } from "react";
import { createBrowserClient } from "@mira/supabase/client";
import { useLocale, useTranslations } from "next-intl";
import {
  loadChatMessages,
  sendCompanyChatMessage,
} from "@/lib/actions/company-contacts";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Props {
  slug: string;
  initialContacts: any[];
}

const STATUS_CLASS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  accepted: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-600",
};

export function CompanyContactsClient({ slug, initialContacts }: Props) {
  const t = useTranslations("CompanyContacts");
  const c = useTranslations("Common");
  const locale = useLocale();
  const dateLocale = locale === "it" ? "it-IT" : "en-US";
  const STATUS_LABEL: Record<string, string> = {
    pending: t("statusPending"),
    accepted: t("statusAccepted"),
    rejected: t("statusRejected"),
  };
  const [contacts, setContacts] = useState<any[]>(initialContacts);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatData, setChatData] = useState<{ messages: any[]; chat: any } | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showInterviewForm, setShowInterviewForm] = useState(false);
  const [interviewData, setInterviewData] = useState({ date: "", time: "", location: "", link: "", notes: "" });
  const endRef = useRef<HTMLDivElement>(null);
  const supabase = createBrowserClient();

  useEffect(() => {
    if (!activeChatId) return;
    loadChatMessages(slug, activeChatId).then(setChatData);
  }, [activeChatId, slug]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatData?.messages]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!activeChatId) return;
    const channel = supabase
      .channel(`chat-company-${activeChatId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "company_chat_messages",
        filter: `chat_id=eq.${activeChatId}`,
      }, () => {
        loadChatMessages(slug, activeChatId).then(setChatData);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeChatId, slug]);

  async function handleSend() {
    if (!input.trim() || loading || !activeChatId) return;
    const msg = input.trim();
    setInput("");
    setLoading(true);
    await sendCompanyChatMessage(slug, activeChatId, msg);
    const updated = await loadChatMessages(slug, activeChatId);
    setChatData(updated);
    setLoading(false);
  }

  async function handleInterviewInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!activeChatId) return;
    setLoading(true);
    const content = [
      t("interviewInviteLabel"),
      interviewData.date && `📅 ${interviewData.date}${interviewData.time ? t("atTimeSuffix", { time: interviewData.time }) : ""}`,
      interviewData.location && `📍 ${interviewData.location}`,
      interviewData.link && `🔗 ${interviewData.link}`,
      interviewData.notes && `${t("notesPrefix")} ${interviewData.notes}`,
    ].filter(Boolean).join("\n");

    await sendCompanyChatMessage(slug, activeChatId, content, "interview_invite", interviewData);
    setShowInterviewForm(false);
    setInterviewData({ date: "", time: "", location: "", link: "", notes: "" });
    const updated = await loadChatMessages(slug, activeChatId);
    setChatData(updated);
    setLoading(false);
  }

  // company_chats.contact_request_id is unique, so Supabase embeds it as a single
  // object rather than an array — normalize both shapes defensively.
  function getChat(c: any) {
    return Array.isArray(c.company_chats) ? c.company_chats[0] : c.company_chats ?? null;
  }

  const activeChat = contacts.find((c) => getChat(c)?.id === activeChatId);

  return (
    <div className="h-full flex overflow-hidden" style={{ height: "calc(100vh - 89px)" }}>
      {/* Contact list */}
      <div className="w-80 border-r border-border bg-white flex flex-col shrink-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border shrink-0">
          <h2 className="font-display text-h3 text-navy">{t("heading")}</h2>
          <p className="text-body-sm text-ink-secondary">{t("requestsSentCount", { count: contacts.length })}</p>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {contacts.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-body-sm text-ink-tertiary">{t("noContactsTitle")}</p>
            </div>
          ) : contacts.map((contactItem: any) => {
            const chat = getChat(contactItem);
            const isActive = chat?.id === activeChatId;
            return (
              <button
                key={contactItem.id}
                onClick={() => { if (chat) setActiveChatId(chat.id); }}
                className={`w-full text-left px-4 py-3 border-b border-border/50 transition-colors ${isActive ? "bg-navy-50" : "hover:bg-paper"} ${!chat ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-body-sm font-medium text-navy truncate">{contactItem.role_title}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_CLASS[contactItem.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {STATUS_LABEL[contactItem.status] ?? contactItem.status}
                  </span>
                </div>
                <p className="text-xs text-ink-tertiary">
                  {new Date(contactItem.created_at).toLocaleDateString(dateLocale, { day: "numeric", month: "short" })}
                  {chat && t("chatOpenSuffix")}
                </p>
                {!chat && contactItem.status === "pending" && (
                  <p className="text-xs text-ink-tertiary mt-0.5 italic">{t("awaitingResponse")}</p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {!activeChatId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-body text-ink-secondary">{t("selectContactPrompt")}</p>
              <p className="text-body-sm text-ink-tertiary mt-1">{t("chatOpensHint")}</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="px-6 py-3 border-b border-border bg-white shrink-0 flex items-center justify-between">
              <div>
                <p className="text-body font-medium text-navy">{activeChat?.role_title}</p>
                {chatData?.chat?.student_identity_revealed && chatData?.chat?.shared_contact && (
                  <p className="text-body-sm text-petrol">
                    {t("contactsSharedPrefix")} ·{" "}
                    {[
                      chatData.chat.shared_contact.name,
                      chatData.chat.shared_contact.email,
                      chatData.chat.shared_contact.phone,
                    ].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowInterviewForm(true)}
                className="flex items-center gap-2 text-body-sm border border-navy text-navy rounded-md px-3 py-2 hover:bg-navy hover:text-white transition-colors duration-100"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {t("inviteToInterview")}
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 min-h-0">
              {(chatData?.messages ?? []).map((msg: any) => {
                const isCompany = msg.sender_role === "company";
                const isSpecial = ["interview_invite", "identity_reveal"].includes(msg.message_type);
                return (
                  <div key={msg.id} className={`flex ${isCompany ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-lg px-4 py-3 ${
                      isSpecial
                        ? "bg-petrol-50 border border-petrol/30 text-ink"
                        : isCompany
                        ? "bg-navy text-white"
                        : "bg-white border border-border text-ink"
                    }`}>
                      {isSpecial && (
                        <p className="text-eyebrow text-petrol uppercase mb-1">
                          {msg.message_type === "interview_invite" ? t("interviewInviteLabel") : t("identityRevealedLabel")}
                        </p>
                      )}
                      <p className="text-body whitespace-pre-wrap">{msg.content}</p>
                      <p className={`text-xs mt-1 ${isCompany && !isSpecial ? "text-white/60" : "text-ink-tertiary"}`}>
                        {new Date(msg.created_at).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" })}
                        {msg.read_at && isCompany && t("readSuffix")}
                      </p>
                    </div>
                  </div>
                );
              })}
              {loading && (
                <div className="flex justify-end">
                  <div className="bg-navy text-white rounded-lg px-4 py-3">
                    <p className="text-body-sm opacity-70">{t("sendingLabel")}</p>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border px-6 py-3 shrink-0 bg-white">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder={c("messagePlaceholder")}
                  disabled={loading}
                  className="flex-1 px-4 py-3 rounded-md border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200 disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100 disabled:opacity-40"
                >
                  {c("send")}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Interview invite modal */}
      {showInterviewForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg border border-border w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-h2 text-navy">{t("inviteToInterview")}</h2>
              <button onClick={() => setShowInterviewForm(false)} className="text-ink-tertiary hover:text-ink">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleInterviewInvite} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-label text-navy mb-2 block">{t("dateLabel")}</span>
                  <input type="date" required value={interviewData.date} onChange={(e) => setInterviewData((p) => ({ ...p, date: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-md border border-border text-body text-ink focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20" />
                </label>
                <label className="block">
                  <span className="text-label text-navy mb-2 block">{t("timeLabel")}</span>
                  <input type="time" value={interviewData.time} onChange={(e) => setInterviewData((p) => ({ ...p, time: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-md border border-border text-body text-ink focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20" />
                </label>
              </div>
              <label className="block">
                <span className="text-label text-navy mb-2 block">{t("locationLabel")}</span>
                <input type="text" value={interviewData.location} onChange={(e) => setInterviewData((p) => ({ ...p, location: e.target.value }))}
                  placeholder={t("locationPlaceholder")}
                  className="w-full px-4 py-3 rounded-md border border-border text-body text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20" />
              </label>
              <label className="block">
                <span className="text-label text-navy mb-2 block">{t("linkLabel")}</span>
                <input type="url" value={interviewData.link} onChange={(e) => setInterviewData((p) => ({ ...p, link: e.target.value }))}
                  placeholder={t("linkPlaceholder")}
                  className="w-full px-4 py-3 rounded-md border border-border text-body text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20" />
              </label>
              <label className="block">
                <span className="text-label text-navy mb-2 block">{t("notesLabel")}</span>
                <textarea rows={2} value={interviewData.notes} onChange={(e) => setInterviewData((p) => ({ ...p, notes: e.target.value }))}
                  placeholder={t("notesPlaceholder")}
                  className="w-full px-4 py-3 rounded-md border border-border text-body text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 resize-none" />
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowInterviewForm(false)}
                  className="flex-1 px-4 py-3 rounded-md border border-border text-body text-ink hover:border-border-strong transition-colors duration-100">
                  {c("cancel")}
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 bg-navy text-white px-4 py-3 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100 disabled:opacity-40">
                  {loading ? t("sendingLabel") : t("sendInvite")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
