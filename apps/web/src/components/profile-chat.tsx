"use client";

import { useState, useEffect, useRef } from "react";
import { sendProfileMessage, loadProfileChat } from "@/lib/actions/chat-profile";
import { uploadTranscript } from "@/lib/actions/transcript-upload";
import { sendTranscriptMessage } from "@/lib/actions/chat-onboarding";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const INITIAL_MESSAGE = `Questa è la tua chat con MIRA. Puoi parlarmi di qualsiasi cosa — carriera, magistrale, associazioni, esperienze, dubbi. Tutto quello che mi dici arricchisce il tuo profilo. Che mi racconti?`;

const UPLOAD_TRIGGERS = [
  "aggiorna", "carica", "upload", "libretto", "transcript", "nuovi esami", "nuovi voti",
  "aggiornare il libretto", "caricare il libretto", "aggiornare i voti", "nuovo transcript",
];

export function ProfileChat({ userName }: { userName: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function init() {
      const saved = await loadProfileChat();
      if (saved.length > 0) {
        setMessages(saved);
      } else {
        setMessages([{ role: "assistant", content: INITIAL_MESSAGE }]);
      }
      setLoading(false);
    }
    init();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading]);

  async function handleSend() {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    const lower = userMessage.toLowerCase();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    const wantsUpload = UPLOAD_TRIGGERS.some((t) => lower.includes(t));
    if (wantsUpload) {
      setShowUpload(true);
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Certo! Clicca il pulsante qui sotto per caricare il tuo libretto aggiornato (PDF da yoU@B). Dopo il caricamento aggiornerò tutti i tuoi dati.",
      }]);
      return;
    }

    setLoading(true);
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const result = await sendProfileMessage(history, userMessage);

    setMessages((prev) => [...prev, { role: "assistant", content: result.message }]);
    setLoading(false);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || uploading) return;

    setUploading(true);
    setMessages((prev) => [...prev, { role: "user", content: `[Caricamento libretto: ${file.name}]` }]);
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadTranscript(formData);

    if (result.error) {
      setMessages((prev) => [...prev, { role: "assistant", content: `Errore nel caricamento: ${result.error}` }]);
    } else if (result.summary) {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const chatResult = await sendTranscriptMessage(history, result.summary);
      setMessages((prev) => [...prev, { role: "assistant", content: chatResult.message }]);
    }

    setUploading(false);
    setLoading(false);
    setShowUpload(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="flex flex-col" style={{ maxHeight: "400px" }}>
      <div className="flex-1 overflow-y-auto space-y-3 px-5 py-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-4 py-2.5 ${
                msg.role === "user"
                  ? "bg-navy text-white"
                  : "bg-paper text-ink"
              }`}
            >
              {msg.role === "assistant" && (
                <p className="text-eyebrow text-petrol uppercase mb-0.5" style={{ fontSize: "10px" }}>MIRA</p>
              )}
              <p className="text-body-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {loading && messages.length > 0 && (
          <div className="flex justify-start">
            <div className="bg-paper rounded-lg px-4 py-2.5">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-navy-200 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-navy-200 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-navy-200 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-border px-4 py-3 space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileUpload}
          className="hidden"
        />
        {showUpload && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border-2 border-dashed border-petrol text-petrol text-body-sm font-medium hover:bg-petrol-50 transition-colors duration-100 disabled:opacity-40"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {uploading ? "Elaborazione in corso..." : "Carica libretto aggiornato (PDF)"}
          </button>
        )}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Scrivi un messaggio..."
            disabled={loading}
            className="flex-1 px-3 py-2 rounded-md bg-paper border border-border text-body-sm text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-petrol transition-colors duration-200 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-navy text-white px-4 py-2 rounded-md text-body-sm hover:bg-navy-700 transition-colors duration-100 disabled:opacity-40"
          >
            Invia
          </button>
        </div>
      </div>
    </div>
  );
}
