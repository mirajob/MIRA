"use client";

import { useState, useEffect, useRef } from "react";
import { sendProfileMessage, loadProfileChat } from "@/lib/actions/chat-profile";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const INITIAL_MESSAGE = `Per rendere il tuo profilo pronto per le aziende quando arriveranno, ho bisogno di sapere alcune cose. Da quando sei disponibile per uno stage o un'opportunità lavorativa? E in quale città preferiresti?`;

export function ProfileChat({ userName }: { userName: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const result = await sendProfileMessage(history, userMessage);

    setMessages((prev) => [...prev, { role: "assistant", content: result.message }]);
    setLoading(false);
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

      <div className="border-t border-border px-4 py-3">
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
