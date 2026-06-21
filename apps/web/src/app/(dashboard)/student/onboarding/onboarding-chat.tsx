"use client";

import { useState, useEffect, useRef } from "react";
import {
  startOnboardingChat,
  sendOnboardingMessage,
  sendTranscriptMessage,
  loadConversation,
  forceCompleteOnboarding,
} from "@/lib/actions/chat-onboarding";
import { uploadTranscript } from "@/lib/actions/transcript-upload";
import { useRouter } from "next/navigation";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export function OnboardingChat({ userName }: { userName: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [transcriptUploaded, setTranscriptUploaded] = useState(false);
  const [complete, setComplete] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    async function init() {
      const saved = await loadConversation();
      if (saved.length > 0) {
        setMessages(saved);
        const hasTranscript = saved.some(
          (m) => m.role === "user" && m.content === "[Ho caricato il mio libretto]"
        );
        if (hasTranscript) setTranscriptUploaded(true);
        setLoading(false);
      } else {
        const greeting = await startOnboardingChat();
        setMessages([{ role: "assistant", content: greeting }]);
        setLoading(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!loading && !uploading) inputRef.current?.focus();
  }, [loading, uploading]);

  async function handleSend() {
    if (!input.trim() || loading || uploading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    const history = chatMessages();
    const result = await sendOnboardingMessage(history, userMessage);

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: result.message },
    ]);
    setLoading(false);

    if (result.isComplete) {
      setComplete(true);
      setTimeout(() => {
        router.push("/student");
        router.refresh();
      }, 3000);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: "[Ho caricato il mio libretto]" },
      { role: "system", content: "Sto analizzando il tuo libretto..." },
    ]);

    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadTranscript(formData);

    // Remove the "analyzing" system message
    setMessages((prev) => prev.filter((m) => m.content !== "Sto analizzando il tuo libretto..."));

    if (result.error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Non sono riuscito a leggere il file — ${result.error} Puoi riprovare o, se preferisci, raccontami tu cosa studi.`,
        },
      ]);
      // Remove the "[Ho caricato il mio libretto]" message since it failed
      setMessages((prev) =>
        prev.filter((m) => m.content !== "[Ho caricato il mio libretto]")
      );
      setUploading(false);
      return;
    }

    setTranscriptUploaded(true);

    // Get MIRA's response to the transcript
    const history = chatMessages();
    const response = await sendTranscriptMessage(history, result.summary!);

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: response.message },
    ]);
    setUploading(false);

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleForceComplete() {
    setLoading(true);
    const result = await forceCompleteOnboarding();
    if (result.success) {
      setComplete(true);
      setTimeout(() => {
        router.push("/student");
        router.refresh();
      }, 2000);
    } else {
      setLoading(false);
    }
  }

  function chatMessages() {
    return messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
  }

  const userMessageCount = messages.filter((m) => m.role === "user").length;
  const isWorking = loading || uploading;

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-eyebrow text-navy/60 uppercase mb-1">Onboarding</p>
          <h1 className="font-display text-h1 text-navy">Parliamo di te</h1>
        </div>
        {userMessageCount >= 3 && !complete && (
          <button
            onClick={handleForceComplete}
            disabled={isWorking}
            className="text-body-sm text-ink-secondary hover:text-navy border border-border rounded-md px-4 py-2 hover:border-border-strong transition-colors duration-100 disabled:opacity-40"
          >
            Completa profilo
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.map((msg, i) => {
          if (msg.role === "system") {
            return (
              <div key={i} className="flex justify-center">
                <div className="bg-navy/5 rounded-full px-4 py-2">
                  <p className="text-body-sm text-ink-secondary">{msg.content}</p>
                </div>
              </div>
            );
          }

          if (msg.role === "user" && msg.content === "[Ho caricato il mio libretto]") {
            return (
              <div key={i} className="flex justify-end">
                <div className="bg-navy text-white rounded-lg px-4 py-3 flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                  <span className="text-body">Libretto caricato</span>
                </div>
              </div>
            );
          }

          return (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-navy text-white"
                    : "bg-white border border-border text-ink"
                }`}
              >
                {msg.role === "assistant" && (
                  <p className="text-eyebrow text-petrol uppercase mb-1">MIRA</p>
                )}
                <p className="text-body whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          );
        })}

        {isWorking && messages.length > 0 && (
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

        <div ref={messagesEndRef} />
      </div>

      {!complete ? (
        <div className="border-t border-border pt-4">
          <div className="flex gap-3">
            {!transcriptUploaded && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isWorking}
                  title="Carica libretto"
                  className="flex items-center justify-center w-12 h-12 rounded-md border border-border text-ink-secondary hover:text-navy hover:border-border-strong transition-colors duration-100 disabled:opacity-40 shrink-0"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </button>
              </>
            )}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Scrivi un messaggio..."
              disabled={isWorking}
              className="flex-1 px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200 disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={isWorking || !input.trim()}
              className="bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100 disabled:opacity-40"
            >
              Invia
            </button>
          </div>
        </div>
      ) : (
        <div className="border-t border-border pt-4">
          <div className="rounded-md bg-success-bg p-4 text-center">
            <p className="text-body font-medium text-success">
              Profilo completato! Reindirizzamento...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
