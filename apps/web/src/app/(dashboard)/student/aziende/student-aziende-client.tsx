"use client";

import { useState, useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createBrowserClient } from "@mira/supabase/client";
import {
  respondToContactRequest,
  loadStudentChatMessages,
  sendStudentChatMessage,
  shareStudentContact,
  respondToInterviewInvite,
} from "@/lib/actions/company-contacts";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Props {
  initialRequests: any[];
  initialChats: any[];
}

export function StudentAziendeClient({ initialRequests, initialChats }: Props) {
  const t = useTranslations("AziendeStudent");
  const c = useTranslations("Common");
  const locale = useLocale();
  const timeLocale = locale === "it" ? "it-IT" : "en-US";
  const [requests, setRequests] = useState<any[]>(initialRequests);
  const [chats, setChats] = useState<any[]>(initialChats);
  const [activeTab, setActiveTab] = useState<"requests" | "chats">("requests");
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatData, setChatData] = useState<{ messages: any[]; chat: any } | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [acceptDialog, setAcceptDialog] = useState<{ requestId: string; companyName: string } | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [shareDialog, setShareDialog] = useState(false);
  const [shareName, setShareName] = useState("");
  const [shareEmail, setShareEmail] = useState("");
  const [sharePhone, setSharePhone] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const supabase = createBrowserClient();

  useEffect(() => {
    if (activeChatId) {
      loadStudentChatMessages(activeChatId).then(setChatData);
    }
  }, [activeChatId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatData?.messages]);

  // Realtime for student chat
  useEffect(() => {
    if (!activeChatId) return;
    const channel = supabase
      .channel(`chat-student-${activeChatId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "company_chat_messages",
        filter: `chat_id=eq.${activeChatId}`,
      }, () => {
        loadStudentChatMessages(activeChatId).then(setChatData);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeChatId]);

  async function handleAccept() {
    if (!acceptDialog) return;
    setLoading(true);
    const result = await respondToContactRequest(acceptDialog.requestId, true, {
      name: contactName || undefined,
      email: contactEmail || undefined,
      phone: contactPhone || undefined,
    });
    if (result.success) {
      setRequests((prev) => prev.map((r) => r.id === acceptDialog.requestId ? { ...r, status: "accepted" } : r));
      setAcceptDialog(null);
      // Reload chats
      const { loadStudentChats } = await import("@/lib/actions/company-contacts");
      const updated = await loadStudentChats();
      setChats(updated);
      setActiveTab("chats");
    }
    setLoading(false);
  }

  async function handleShareContact() {
    if (!activeChatId) return;
    setLoading(true);
    const result = await shareStudentContact(activeChatId, {
      name: shareName || undefined,
      email: shareEmail || undefined,
      phone: sharePhone || undefined,
    });
    if (result.success) {
      setShareDialog(false);
      setShareName(""); setShareEmail(""); setSharePhone("");
      const updated = await loadStudentChatMessages(activeChatId);
      setChatData(updated);
    }
    setLoading(false);
  }

  async function handleReject(requestId: string) {
    setLoading(true);
    await respondToContactRequest(requestId, false);
    setRequests((prev) => prev.map((r) => r.id === requestId ? { ...r, status: "rejected" } : r));
    setLoading(false);
  }

  async function handleSend() {
    if (!input.trim() || loading || !activeChatId) return;
    const msg = input.trim();
    setInput("");
    setLoading(true);
    await sendStudentChatMessage(activeChatId, msg);
    const updated = await loadStudentChatMessages(activeChatId);
    setChatData(updated);
    setLoading(false);
  }

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const companyName = (c: any) => c.company_profiles?.display_name ?? c.company_profiles?.legal_name ?? t("companyFallback");

  return (
    <div className="px-6 py-8 space-y-6">
      {/* Tabs */}
      <div className="max-w-3xl mx-auto flex gap-1 border-b border-border">
        <button
          onClick={() => setActiveTab("requests")}
          className={`px-4 py-2.5 text-body-sm font-medium border-b-2 transition-colors ${activeTab === "requests" ? "border-navy text-navy" : "border-transparent text-ink-secondary hover:text-navy"}`}
        >
          {t("tabRequests")} {pendingRequests.length > 0 && <span className="ml-1.5 bg-navy text-white text-xs rounded-full px-1.5 py-0.5">{pendingRequests.length}</span>}
        </button>
        <button
          onClick={() => setActiveTab("chats")}
          className={`px-4 py-2.5 text-body-sm font-medium border-b-2 transition-colors ${activeTab === "chats" ? "border-navy text-navy" : "border-transparent text-ink-secondary hover:text-navy"}`}
        >
          {t("tabChats", { count: chats.length })}
        </button>
      </div>

      {/* Requests tab */}
      {activeTab === "requests" && (
        <div className="max-w-3xl mx-auto space-y-3">
          {requests.length === 0 ? (
            <div className="rounded-lg border border-border bg-white p-8 text-center">
              <p className="text-body text-ink-secondary">{t("noRequestsTitle")}</p>
              <p className="text-body-sm text-ink-tertiary mt-1">{t("noRequestsBody")}</p>
            </div>
          ) : requests.map((req: any) => {
            const company = req.company_profiles;
            return (
              <div key={req.id} className="rounded-lg border border-border bg-white overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-navy-50 flex items-center justify-center shrink-0">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-navy">
                          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-body font-medium text-navy">{companyName(req)}</p>
                        {company?.sector && <p className="text-body-sm text-ink-secondary">{company.sector}</p>}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${req.status === "pending" ? "bg-amber-100 text-amber-700" : req.status === "accepted" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                      {req.status === "pending" ? t("statusPending") : req.status === "accepted" ? t("statusAccepted") : t("statusRejected")}
                    </span>
                  </div>

                  <div className="mb-3">
                    <p className="text-body-sm text-ink-tertiary mb-0.5">{t("roleProposedLabel")}</p>
                    <p className="text-body font-medium text-navy">{req.role_title}</p>
                  </div>

                  <div className="mb-4">
                    <p className="text-body-sm text-ink-tertiary mb-0.5">{t("messageLabel")}</p>
                    <p className="text-body text-ink">{req.message}</p>
                  </div>

                  {company?.website_url && (
                    <a href={company.website_url} target="_blank" rel="noopener noreferrer"
                      className="text-body-sm text-petrol underline underline-offset-2 decoration-1 mb-4 block">
                      {company.website_url.replace(/^https?:\/\//, "")}
                    </a>
                  )}

                  {req.status === "pending" && (
                    <div className="flex gap-3 pt-2 border-t border-border">
                      <button
                        onClick={() => handleReject(req.id)}
                        disabled={loading}
                        className="flex-1 px-4 py-2.5 rounded-md border border-border text-body-sm text-ink hover:border-border-strong transition-colors duration-100 disabled:opacity-40"
                      >
                        {t("reject")}
                      </button>
                      <button
                        onClick={() => { setAcceptDialog({ requestId: req.id, companyName: companyName(req) }); setContactName(""); setContactEmail(""); setContactPhone(""); }}
                        disabled={loading}
                        className="flex-1 px-4 py-2.5 rounded-md bg-navy text-white text-body-sm hover:bg-navy-700 transition-colors duration-100 disabled:opacity-40"
                      >
                        {t("acceptAndChat")}
                      </button>
                    </div>
                  )}

                  {req.status === "accepted" && (() => {
                    const reqChat = Array.isArray(req.company_chats) ? req.company_chats[0] : req.company_chats;
                    return reqChat && (
                      <button
                        onClick={() => { setActiveTab("chats"); setActiveChatId(reqChat.id); }}
                        className="text-body-sm text-petrol underline underline-offset-2 decoration-1 mt-2"
                      >
                        {t("openChat")}
                      </button>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Chats tab */}
      {activeTab === "chats" && chats.length === 0 && (
        <div className="max-w-3xl mx-auto">
          <div className="rounded-lg border border-border bg-white p-8 text-center">
            <p className="text-body text-ink-secondary">{t("noChatsTitle")}</p>
            <p className="text-body-sm text-ink-tertiary mt-1">{t("noChatsBody")}</p>
          </div>
        </div>
      )}
      {activeTab === "chats" && chats.length > 0 && (
        <div className="flex gap-4" style={{ height: "calc(100vh - 220px)", minHeight: "480px" }}>
          {/* Chat list */}
          <div className="w-72 shrink-0 border border-border rounded-lg bg-white overflow-hidden flex flex-col">
            {chats.map((c: any) => {
                  const cName = c.company_profiles?.display_name ?? c.company_profiles?.legal_name ?? t("companyFallback");
                  return (
                    <button
                      key={c.id}
                      onClick={() => setActiveChatId(c.id)}
                      className={`w-full text-left px-4 py-3 border-b border-border/50 transition-colors ${activeChatId === c.id ? "bg-navy-50" : "hover:bg-paper"}`}
                    >
                      <p className="text-body-sm font-medium text-navy truncate">{cName}</p>
                      <p className="text-xs text-ink-tertiary truncate">{c.company_contact_requests?.role_title}</p>
                    </button>
                  );
                })}
              </div>

              {/* Chat window */}
              <div className="flex-1 border border-border rounded-lg bg-white flex flex-col overflow-hidden">
                {!activeChatId ? (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-body-sm text-ink-tertiary">{t("selectChat")}</p>
                  </div>
                ) : (
                  <>
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-border shrink-0 flex items-center justify-between">
                      <div>
                        <p className="text-body font-medium text-navy">
                          {chatData?.chat ? (chats.find((c) => c.id === activeChatId)?.company_profiles?.display_name ?? t("companyFallback")) : "..."}
                        </p>
                        <p className="text-body-sm text-ink-secondary">{chatData?.chat?.company_contact_requests?.role_title}</p>
                      </div>
                      {chatData?.chat && (
                        <button
                          onClick={() => setShareDialog(true)}
                          disabled={loading}
                          className={`text-body-sm rounded-md px-3 py-1.5 transition-colors duration-100 disabled:opacity-40 ${
                            chatData.chat.student_identity_revealed
                              ? "text-success border border-success/30 hover:bg-success/10"
                              : "text-petrol border border-petrol/30 hover:bg-petrol hover:text-white"
                          }`}
                        >
                          {chatData.chat.student_identity_revealed ? t("contactsShared") : t("shareContacts")}
                        </button>
                      )}
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
                      {(chatData?.messages ?? []).map((msg: any) => {
                        const isStudent = msg.sender_role === "student";
                        const isSpecial = ["interview_invite", "identity_reveal"].includes(msg.message_type);
                        return (
                          <div key={msg.id} className={`flex ${isStudent ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[75%] rounded-lg px-4 py-3 ${
                              isSpecial ? "bg-petrol-50 border border-petrol/30 text-ink"
                              : isStudent ? "bg-navy text-white"
                              : "bg-paper border border-border text-ink"
                            }`}>
                              {msg.message_type === "interview_invite" && (
                                <p className="text-eyebrow text-petrol uppercase mb-1">{t("interviewInviteLabel")}</p>
                              )}
                              <p className="text-body whitespace-pre-wrap">{msg.content}</p>
                              {msg.message_type === "interview_invite" && !msg.metadata?.response && (
                                <div className="flex gap-2 mt-3">
                                  <button
                                    onClick={() => respondToInterviewInvite(activeChatId!, msg.id, false)}
                                    className="text-body-sm px-3 py-1.5 rounded border border-border hover:border-border-strong transition-colors"
                                  >
                                    {t("declineInterview")}
                                  </button>
                                  <button
                                    onClick={() => respondToInterviewInvite(activeChatId!, msg.id, true)}
                                    className="text-body-sm px-3 py-1.5 rounded bg-navy text-white hover:bg-navy-700 transition-colors"
                                  >
                                    {t("acceptInterview")}
                                  </button>
                                </div>
                              )}
                              {msg.message_type === "interview_invite" && msg.metadata?.response && (
                                <p className="text-body-sm mt-2 text-ink-secondary">
                                  {msg.metadata.response === "accepted" ? t("interviewAccepted") : t("interviewDeclined")}
                                </p>
                              )}
                              <p className={`text-xs mt-1 ${isStudent && !isSpecial ? "text-white/60" : "text-ink-tertiary"}`}>
                                {new Date(msg.created_at).toLocaleTimeString(timeLocale, { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      {loading && (
                        <div className="flex justify-end">
                          <div className="bg-navy text-white rounded-lg px-4 py-3">
                            <p className="text-body-sm opacity-70">{t("sending")}</p>
                          </div>
                        </div>
                      )}
                      <div ref={endRef} />
                    </div>

                    {/* Input */}
                    <div className="border-t border-border px-4 py-3 shrink-0">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                          placeholder={c("messagePlaceholder")}
                          disabled={loading}
                          className="flex-1 px-4 py-2.5 rounded-md border border-border text-body text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200 disabled:opacity-50"
                        />
                        <button
                          onClick={handleSend}
                          disabled={loading || !input.trim()}
                          className="bg-navy text-white px-5 py-2.5 rounded-md text-label hover:bg-navy-700 transition-colors duration-100 disabled:opacity-40"
                        >
                          {c("send")}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
        </div>
      )}

      {/* Accept dialog */}
      {acceptDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg border border-border w-full max-w-sm p-6 shadow-xl">
            <h2 className="font-display text-h2 text-navy mb-2">{t("acceptDialogTitle")}</h2>
            <p className="text-body-sm text-ink-secondary mb-5">
              {t("acceptDialogBody", { name: acceptDialog.companyName })}
            </p>
            <div className="space-y-4 mb-5">
              <label className="block">
                <span className="text-label text-navy mb-2 block">{t("nameLabelOptional")}</span>
                <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)}
                  placeholder={t("namePlaceholder")}
                  className="w-full px-4 py-3 rounded-md border border-border text-body text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20" />
              </label>
              <label className="block">
                <span className="text-label text-navy mb-2 block">{t("emailLabelOptional")}</span>
                <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
                  placeholder={t("emailPlaceholder")}
                  className="w-full px-4 py-3 rounded-md border border-border text-body text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20" />
              </label>
              <label className="block">
                <span className="text-label text-navy mb-2 block">{t("phoneLabelOptional")}</span>
                <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)}
                  placeholder={t("phonePlaceholder")}
                  className="w-full px-4 py-3 rounded-md border border-border text-body text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20" />
              </label>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setAcceptDialog(null)}
                className="flex-1 px-4 py-3 rounded-md border border-border text-body text-ink hover:border-border-strong transition-colors duration-100">
                {t("cancel")}
              </button>
              <button onClick={handleAccept} disabled={loading}
                className="flex-1 bg-navy text-white px-4 py-3 rounded-md text-label hover:bg-navy-700 transition-colors duration-100 disabled:opacity-40">
                {loading ? "..." : (contactName || contactEmail || contactPhone) ? t("shareAndAccept") : t("acceptStayAnonymous")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share contact dialog */}
      {shareDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg border border-border w-full max-w-sm p-6 shadow-xl">
            <h2 className="font-display text-h2 text-navy mb-2">{t("shareDialogTitle")}</h2>
            <p className="text-body-sm text-ink-secondary mb-5">
              {t("shareDialogBody")}
            </p>
            <div className="space-y-4 mb-5">
              <label className="block">
                <span className="text-label text-navy mb-2 block">{t("nameLabel")}</span>
                <input type="text" value={shareName} onChange={(e) => setShareName(e.target.value)}
                  placeholder={t("namePlaceholder")}
                  className="w-full px-4 py-3 rounded-md border border-border text-body text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20" />
              </label>
              <label className="block">
                <span className="text-label text-navy mb-2 block">{t("emailLabel")}</span>
                <input type="email" value={shareEmail} onChange={(e) => setShareEmail(e.target.value)}
                  placeholder={t("emailPlaceholder")}
                  className="w-full px-4 py-3 rounded-md border border-border text-body text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20" />
              </label>
              <label className="block">
                <span className="text-label text-navy mb-2 block">{t("phoneLabel")}</span>
                <input type="tel" value={sharePhone} onChange={(e) => setSharePhone(e.target.value)}
                  placeholder={t("phonePlaceholder")}
                  className="w-full px-4 py-3 rounded-md border border-border text-body text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20" />
              </label>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShareDialog(false)}
                className="flex-1 px-4 py-3 rounded-md border border-border text-body text-ink hover:border-border-strong transition-colors duration-100">
                {t("cancel")}
              </button>
              <button onClick={handleShareContact} disabled={loading || !(shareName.trim() || shareEmail.trim() || sharePhone.trim())}
                className="flex-1 bg-navy text-white px-4 py-3 rounded-md text-label hover:bg-navy-700 transition-colors duration-100 disabled:opacity-40">
                {loading ? "..." : t("share")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
