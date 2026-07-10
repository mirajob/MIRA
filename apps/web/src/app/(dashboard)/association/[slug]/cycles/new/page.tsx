"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { sendCycleMessage, createCycleFromChat } from "@/lib/actions/chat-cycle";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function NewCyclePage() {
  const t = useTranslations("NewCycleWizard");
  const c = useTranslations("Common");
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: t("initialMessage") },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [associationId, setAssociationId] = useState<string | null>(null);
  const [associationName, setAssociationName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/association/${slug}/id`)
      .then((r) => r.json())
      .then((d) => {
        setAssociationId(d.id);
        setAssociationName(d.name || slug);
      });
  }, [slug]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading]);

  async function handleSend() {
    if (!input.trim() || loading || creating) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);
    setError(null);

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const result = await sendCycleMessage(history, userMessage, associationName);

    const newMessages = [
      ...messages,
      { role: "user" as const, content: userMessage },
      { role: "assistant" as const, content: result.message },
    ];
    setMessages(newMessages);
    setLoading(false);

    if (result.message.includes("CICLO_PRONTO") && associationId) {
      setCreating(true);
      const createResult = await createCycleFromChat(associationId, newMessages);
      if (createResult.error) {
        setError(createResult.error);
        setCreating(false);
      } else {
        router.push(`/association/${slug}/cycles/${createResult.cycleId}`);
      }
    }
  }

  function displayContent(content: string) {
    if (content.includes("CICLO_PRONTO")) {
      return content.split("CICLO_PRONTO")[0].trim() || t("readyFallback");
    }
    return content;
  }

  return (
    <div className="mx-auto max-w-reading">
      <h2 className="font-display text-h2 text-navy mb-4">{t("heading")}</h2>
      <p className="text-body-sm text-ink-secondary mb-6">
        {t("subhead")}
      </p>

      {error && (
        <div className="mb-4 rounded-md bg-error-bg p-3 text-body-sm text-error">{error}</div>
      )}

      <div className="rounded-lg border border-border bg-white overflow-hidden">
        <div className="max-h-[500px] overflow-y-auto space-y-3 px-5 py-4">
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
                <p className="text-body-sm whitespace-pre-wrap">{displayContent(msg.content)}</p>
              </div>
            </div>
          ))}

          {(loading || creating) && (
            <div className="flex justify-start">
              <div className="bg-paper rounded-lg px-4 py-2.5">
                {creating ? (
                  <p className="text-body-sm text-petrol">{t("creating")}</p>
                ) : (
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-navy-200 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-navy-200 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-navy-200 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                )}
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
              placeholder={t("inputPlaceholder")}
              disabled={loading || creating}
              className="flex-1 px-3 py-2 rounded-md bg-paper border border-border text-body-sm text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-petrol transition-colors duration-200 disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={loading || creating || !input.trim()}
              className="bg-navy text-white px-4 py-2 rounded-md text-body-sm hover:bg-navy-700 transition-colors duration-100 disabled:opacity-40"
            >
              {c("send")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
