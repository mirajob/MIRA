"use client";

import { useState, useEffect, useRef } from "react";
import {
  createCompanySearch,
  loadSearchMessages,
  sendSearchMessage,
  updateSearchTitle,
  deleteSearch,
} from "@/lib/actions/company-search";
import { ContactRequestModal } from "../contacts/contact-request-modal";

interface SearchThread {
  id: string;
  title: string;
  created_at: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function extractStudentRefs(text: string): string[] {
  const matches = text.match(/\[REF:([A-Za-z0-9_-]{20})\]/g) ?? [];
  return [...new Set(matches.map((m) => m.replace("[REF:", "").replace("]", "")))];
}

function formatMessage(text: string): string {
  return text.replace(/\[REF:[A-Za-z0-9_-]{20}\]/g, "");
}

interface Props {
  slug: string;
  initialSearches: SearchThread[];
}

export function CompanySearchClient({ slug, initialSearches }: Props) {
  const [searches, setSearches] = useState<SearchThread[]>(initialSearches);
  const [activeId, setActiveId] = useState<string | null>(initialSearches[0]?.id ?? null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [contactRef, setContactRef] = useState<{ searchId: string; token: string } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeId) {
      loadSearchMessages(slug, activeId).then(setMessages);
    }
  }, [activeId, slug]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading]);

  async function handleNewSearch() {
    setLoading(true);
    const result = await createCompanySearch(slug);
    if (result.search) {
      setSearches((prev) => [result.search, ...prev]);
      setActiveId(result.search.id);
      setMessages([]);
    }
    setLoading(false);
  }

  async function handleSend() {
    if (!input.trim() || loading || !activeId) return;
    const userMsg = input.trim();
    setInput("");
    const history = messages;
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    const result = await sendSearchMessage(slug, activeId, userMsg, history);
    setMessages((prev) => [...prev, { role: "assistant", content: result.message }]);
    setLoading(false);

    if (history.length === 0) {
      setSearches((prev) =>
        prev.map((s) => s.id === activeId ? { ...s, title: userMsg.slice(0, 60) } : s)
      );
    }
  }

  async function saveTitle() {
    if (!editingId || !editTitle.trim()) { setEditingId(null); return; }
    await updateSearchTitle(slug, editingId, editTitle.trim());
    setSearches((prev) => prev.map((s) => s.id === editingId ? { ...s, title: editTitle.trim() } : s));
    setEditingId(null);
  }

  async function handleDelete(searchId: string) {
    await deleteSearch(slug, searchId);
    setSearches((prev) => prev.filter((s) => s.id !== searchId));
    if (activeId === searchId) {
      const remaining = searches.filter((s) => s.id !== searchId);
      setActiveId(remaining[0]?.id ?? null);
      setMessages([]);
    }
  }

  return (
    <div className="h-full flex overflow-hidden" style={{ height: "calc(100vh - 89px)" }}>
      {/* Sidebar */}
      <div className={`border-r border-border bg-white flex flex-col transition-all duration-200 ${sidebarOpen ? "w-64" : "w-0"} shrink-0 overflow-hidden`}>
        <div className="p-3 border-b border-border shrink-0">
          <button
            onClick={handleNewSearch}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-border text-body-sm text-ink hover:border-border-strong hover:text-navy transition-colors duration-100 disabled:opacity-40"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nuova ricerca
          </button>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {searches.length === 0 ? (
            <p className="text-body-sm text-ink-tertiary text-center py-6 px-3">Nessuna ricerca. Inizia con una nuova.</p>
          ) : searches.map((s) => (
            <div
              key={s.id}
              className={`group flex items-start gap-2 px-3 py-2.5 border-b border-border/50 cursor-pointer transition-colors ${activeId === s.id ? "bg-navy-50 text-navy" : "text-ink hover:bg-paper"}`}
              onClick={() => { if (editingId !== s.id) setActiveId(s.id); }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <div className="flex-1 min-w-0">
                {editingId === s.id ? (
                  <input
                    autoFocus
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") setEditingId(null); }}
                    onBlur={saveTitle}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full text-body-sm bg-white border border-petrol rounded px-1.5 py-0.5 outline-none"
                  />
                ) : (
                  <>
                    <p className="text-body-sm font-medium truncate">{s.title}</p>
                    <p className="text-xs text-ink-tertiary">
                      {new Date(s.created_at).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
                    </p>
                  </>
                )}
              </div>
              <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingId(s.id); setEditTitle(s.title); }}
                  className="text-ink-tertiary hover:text-ink p-0.5"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                  className="text-ink-tertiary hover:text-error p-0.5"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="w-5 flex items-center justify-center border-r border-border bg-paper hover:bg-white text-ink-tertiary shrink-0 text-xs"
      >
        {sidebarOpen ? "‹" : "›"}
      </button>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {!activeId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-body text-ink-secondary mb-4">Inizia una nuova ricerca di talenti</p>
              <button
                onClick={handleNewSearch}
                className="bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 transition-colors duration-100"
              >
                Nuova ricerca
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 min-h-0">
              {messages.length === 0 && !loading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-lg border border-border bg-white px-4 py-3">
                    <p className="text-eyebrow text-petrol uppercase mb-1">MIRA</p>
                    <p className="text-body text-ink">Descrivi il profilo che stai cercando — ruolo, competenze, settore, attitudine, disponibilità. Posso anche fare domande per capire meglio cosa ti serve.</p>
                  </div>
                </div>
              )}

              {messages.map((msg, i) => {
                const studentRefs = msg.role === "assistant" ? extractStudentRefs(msg.content) : [];
                return (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-lg px-4 py-3 ${msg.role === "user" ? "bg-navy text-white" : "bg-white border border-border text-ink"}`}>
                      {msg.role === "assistant" && (
                        <p className="text-eyebrow text-petrol uppercase mb-1">MIRA</p>
                      )}
                      <p className="text-body whitespace-pre-wrap">{formatMessage(msg.content)}</p>
                      {studentRefs.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap gap-2">
                          {studentRefs.map((token, j) => (
                            <button
                              key={j}
                              onClick={() => activeId && setContactRef({ searchId: activeId, token })}
                              className="flex items-center gap-1.5 text-body-sm border border-navy text-navy rounded-md px-3 py-1.5 hover:bg-navy hover:text-white transition-colors duration-100"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                <polyline points="22,6 12,13 2,6" />
                              </svg>
                              Contatta Candidato {String.fromCharCode(65 + j)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-border rounded-lg px-4 py-3">
                    <p className="text-eyebrow text-petrol uppercase mb-1">MIRA</p>
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-navy-200 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-navy-200 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-navy-200 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={endRef} />
            </div>

            <div className="border-t border-border px-6 py-3 shrink-0 bg-white">
              <div className="flex gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="Descrivi il profilo che cerchi..."
                  disabled={loading}
                  className="flex-1 px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200 disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100 disabled:opacity-40"
                >
                  Invia
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {contactRef && (
        <ContactRequestModal
          slug={slug}
          searchId={contactRef.searchId}
          refToken={contactRef.token}
          onClose={() => setContactRef(null)}
        />
      )}
    </div>
  );
}
