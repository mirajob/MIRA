"use client";

import { useState, useEffect, useRef } from "react";
import {
  startOnboardingChat,
  sendOnboardingMessage,
  loadConversation,
  forceCompleteOnboarding,
} from "@/lib/actions/chat-onboarding";
import { useRouter } from "next/navigation";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function OnboardingChat({ userName }: { userName: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [complete, setComplete] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    async function init() {
      // Carica conversazione salvata
      const saved = await loadConversation();
      if (saved.length > 0) {
        setMessages(saved);
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
    if (!loading) inputRef.current?.focus();
  }, [loading]);

  async function handleSend() {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const result = await sendOnboardingMessage(history, userMessage);

    setMessages((prev) => [...prev, { role: "assistant", content: result.message }]);
    setLoading(false);

    if (result.isComplete) {
      setComplete(true);
      setTimeout(() => {
        router.push("/student");
        router.refresh();
      }, 3000);
    }
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

  const userMessageCount = messages.filter((m) => m.role === "user").length;

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
            disabled={loading}
            className="text-body-sm text-ink-secondary hover:text-navy border border-border rounded-md px-4 py-2 hover:border-border-strong transition-colors duration-100 disabled:opacity-40"
          >
            Completa profilo
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.map((msg, i) => (
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
        ))}

        {loading && messages.length > 0 && (
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
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Scrivi un messaggio..."
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
