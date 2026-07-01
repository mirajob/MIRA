"use client";

import { useState, useEffect, useRef } from "react";
import { createBrowserClient } from "@mira/supabase/client";
import {
  respondToContactRequest,
  loadStudentChatMessages,
  sendStudentChatMessage,
  revealStudentIdentity,
  respondToInterviewInvite,
} from "@/lib/actions/company-contacts";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Props {
  initialRequests: any[];
  initialChats: any[];
}

export function StudentAziendeClient({ initialRequests, initialChats }: Props) {
  const [requests, setRequests] = useState<any[]>(initialRequests);
  const [chats, setChats] = useState<any[]>(initialChats);
  const [activeTab, setActiveTab] = useState<"requests" | "chats">("requests");
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatData, setChatData] = useState<{ messages: any[]; chat: any } | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [acceptDialog, setAcceptDialog] = useState<{ requestId: string; companyName: string } | null>(null);
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
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
      email: contactEmail,
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

  async function handleRevealIdentity() {
    if (!activeChatId) return;
    setLoading(true);
    await revealStudentIdentity(activeChatId);
    const updated = await loadStudentChatMessages(activeChatId);
    setChatData(updated);
    setLoading(false);
  }

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const companyName = (c: any) => c.company_profiles?.display_name ?? c.company_profiles?.legal_name ?? "Azienda";

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setActiveTab("requests")}
          className={`px-4 py-2.5 text-body-sm font-medium border-b-2 transition-colors ${activeTab === "requests" ? "border-navy text-navy" : "border-transparent text-ink-secondary hover:text-navy"}`}
        >
          Richieste {pendingRequests.length > 0 && <span className="ml-1.5 bg-navy text-white text-xs rounded-full px-1.5 py-0.5">{pendingRequests.length}</span>}
        </button>
        <button
          onClick={() => setActiveTab("chats")}
          className={`px-4 py-2.5 text-body-sm font-medium border-b-2 transition-colors ${activeTab === "chats" ? "border-navy text-navy" : "border-transparent text-ink-secondary hover:text-navy"}`}
        >
          Chat ({chats.length})
        </button>
      </div>

      {/* Requests tab */}
      {activeTab === "requests" && (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <div className="rounded-lg border border-border bg-white p-8 text-center">
              <p className="text-body text-ink-secondary">Nessuna richiesta di contatto ricevuta.</p>
              <p className="text-body-sm text-ink-tertiary mt-1">Le aziende ti contatteranno quando troveranno il tuo profilo interessante.</p>
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
                      {req.status === "pending" ? "In attesa" : req.status === "accepted" ? "Accettata" : "Rifiutata"}
                    </span>
                  </div>

                  <div className="mb-3">
                    <p className="text-body-sm text-ink-tertiary mb-0.5">Ruolo proposto</p>
                    <p className="text-body font-medium text-navy">{req.role_title}</p>
                  </div>

                  <div className="mb-4">
                    <p className="text-body-sm text-ink-tertiary mb-0.5">Messaggio</p>
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
                        Rifiuta
                      </button>
                      <button
                        onClick={() => { setAcceptDialog({ requestId: req.id, companyName: companyName(req) }); setContactEmail(""); }}
                        disabled={loading}
                        className="flex-1 px-4 py-2.5 rounded-md bg-navy text-white text-body-sm hover:bg-navy-700 transition-colors duration-100 disabled:opacity-40"
                      >
                        Accetta e chatta
                      </button>
                    </div>
                  )}

                  {req.status === "accepted" && req.company_chats?.[0] && (
                    <button
                      onClick={() => { setActiveTab("chats"); setActiveChatId(req.company_chats[0].id); }}
                      className="text-body-sm text-petrol underline underline-offset-2 decoration-1 mt-2"
                    >
                      Apri chat →
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Chats tab */}
      {activeTab === "chats" && (
        <div className="space-y-4">
          {chats.length === 0 ? (
            <div className="rounded-lg border border-border bg-white p-8 text-center">
              <p className="text-body text-ink-secondary">Nessuna chat attiva.</p>
              <p className="text-body-sm text-ink-tertiary mt-1">Accetta una richiesta per aprire una chat con un&apos;azienda.</p>
            </div>
          ) : (
            <div className="flex gap-4" style={{ height: "600px" }}>
              {/* Chat list */}
              <div className="w-56 shrink-0 border border-border rounded-lg bg-white overflow-hidden flex flex-col">
                {chats.map((c: any) => {
                  const cName = c.company_profiles?.display_name ?? c.company_profiles?.legal_name ?? "Azienda";
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
                    <p className="text-body-sm text-ink-tertiary">Seleziona una chat</p>
                  </div>
                ) : (
                  <>
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-border shrink-0 flex items-center justify-between">
                      <div>
                        <p className="text-body font-medium text-navy">
                          {chatData?.chat ? (chats.find((c) => c.id === activeChatId)?.company_profiles?.display_name ?? "Azienda") : "..."}
                        </p>
                        <p className="text-body-sm text-ink-secondary">{chatData?.chat?.company_contact_requests?.role_title}</p>
                      </div>
                      {chatData?.chat && !chatData.chat.student_identity_revealed && (
                        <button
                          onClick={handleRevealIdentity}
                          disabled={loading}
                          className="text-body-sm text-petrol border border-petrol/30 rounded-md px-3 py-1.5 hover:bg-petrol hover:text-white transition-colors duration-100 disabled:opacity-40"
                        >
                          Rivela identità
                        </button>
                      )}
                      {chatData?.chat?.student_identity_revealed && (
                        <span className="text-body-sm text-success">Identità condivisa ✓</span>
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
                                <p className="text-eyebrow text-petrol uppercase mb-1">Invito a colloquio</p>
                              )}
                              <p className="text-body whitespace-pre-wrap">{msg.content}</p>
                              {msg.message_type === "interview_invite" && !msg.metadata?.response && (
                                <div className="flex gap-2 mt-3">
                                  <button
                                    onClick={() => respondToInterviewInvite(activeChatId!, msg.id, false)}
                                    className="text-body-sm px-3 py-1.5 rounded border border-border hover:border-border-strong transition-colors"
                                  >
                                    Non posso
                                  </button>
                                  <button
                                    onClick={() => respondToInterviewInvite(activeChatId!, msg.id, true)}
                                    className="text-body-sm px-3 py-1.5 rounded bg-navy text-white hover:bg-navy-700 transition-colors"
                                  >
                                    Accetto
                                  </button>
                                </div>
                              )}
                              {msg.message_type === "interview_invite" && msg.metadata?.response && (
                                <p className="text-body-sm mt-2 text-ink-secondary">
                                  {msg.metadata.response === "accepted" ? "✓ Hai accettato" : "✗ Hai rifiutato"}
                                </p>
                              )}
                              <p className={`text-xs mt-1 ${isStudent && !isSpecial ? "text-white/60" : "text-ink-tertiary"}`}>
                                {new Date(msg.created_at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      {loading && (
                        <div className="flex justify-end">
                          <div className="bg-navy text-white rounded-lg px-4 py-3">
                            <p className="text-body-sm opacity-70">Invio...</p>
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
                          placeholder="Scrivi un messaggio..."
                          disabled={loading}
                          className="flex-1 px-4 py-2.5 rounded-md border border-border text-body text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200 disabled:opacity-50"
                        />
                        <button
                          onClick={handleSend}
                          disabled={loading || !input.trim()}
                          className="bg-navy text-white px-5 py-2.5 rounded-md text-label hover:bg-navy-700 transition-colors duration-100 disabled:opacity-40"
                        >
                          Invia
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Accept dialog */}
      {acceptDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg border border-border w-full max-w-sm p-6 shadow-xl">
            <h2 className="font-display text-h2 text-navy mb-2">Condividi i tuoi recapiti</h2>
            <p className="text-body-sm text-ink-secondary mb-5">
              <strong>{acceptDialog.companyName}</strong> riceverà i tuoi recapiti e si aprirà una chat.
            </p>
            <div className="space-y-4 mb-5">
              <label className="block">
                <span className="text-label text-navy mb-2 block">Email *</span>
                <input type="email" required value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="La tua email"
                  className="w-full px-4 py-3 rounded-md border border-border text-body text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20" />
              </label>
              <label className="block">
                <span className="text-label text-navy mb-2 block">Telefono (opzionale)</span>
                <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+39 333 …"
                  className="w-full px-4 py-3 rounded-md border border-border text-body text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20" />
              </label>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setAcceptDialog(null)}
                className="flex-1 px-4 py-3 rounded-md border border-border text-body text-ink hover:border-border-strong transition-colors duration-100">
                Annulla
              </button>
              <button onClick={handleAccept} disabled={loading || !contactEmail.trim()}
                className="flex-1 bg-navy text-white px-4 py-3 rounded-md text-label hover:bg-navy-700 transition-colors duration-100 disabled:opacity-40">
                {loading ? "..." : "Conferma"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
