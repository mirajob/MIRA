"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  loadOnboardingState,
  startOnboarding,
  submitLivello,
  submitPreviousDegree,
  skipTranscript,
  reactToTranscript,
  submitHeaderGap,
  afterHeaderApproved,
  skipCV,
  reactToCV,
  submitEsperienzaRisposta,
  afterEsperienzeApproved,
  submitDisponibilita,
  afterDisponibilitaApproved,
  forceCompleteOnboarding,
  startFaseB,
  resumeFaseB,
  submitCompetenzeAggiunta,
  afterCompetenzeApproved,
  submitLingue,
  afterLingueApproved,
  submitInteressi,
  afterInteressiApproved,
  submitAutodescrizioneRisposta,
  afterAutodescrizioneApproved,
  submitPianoCarriera,
  afterPianoCarrieraApproved,
} from "@/lib/actions/chat-onboarding";
import type { ChatMessage, OnboardingPhase, OnboardingBlocksState } from "@/lib/actions/chat-onboarding";
import { EMPTY_ONBOARDING_BLOCKS } from "@/lib/onboarding-defaults";
import { uploadTranscript } from "@/lib/actions/transcript-upload";
import { uploadCV } from "@/lib/actions/cv-upload";
import { signOut } from "@/lib/actions/auth";
import { OnboardingCardPanel } from "@/components/onboarding/onboarding-card-panel";
import type { CardBlockType } from "@mira/types";

const FASE_B_PHASES: OnboardingPhase[] = ["competenze", "lingue", "interessi", "autodescrizione", "piano_carriera", "chiusura"];
const GATED_PHASES: OnboardingPhase[] = ["transcript", "cv", "gate", "chiusura"];

export function OnboardingChat({ userName }: { userName: string }) {
  const t = useTranslations("OnboardingChatUI");
  const c = useTranslations("Common");
  const panelT = useTranslations("OnboardingCardPanel");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [phase, setPhase] = useState<OnboardingPhase>("welcome");
  const [blocks, setBlocks] = useState<OnboardingBlocksState>(EMPTY_ONBOARDING_BLOCKS);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [expIndex, setExpIndex] = useState(0);
  const [expTotal, setExpTotal] = useState(1);
  const [interessiSubIndex, setInteressiSubIndex] = useState<0 | 1>(0);
  const [autoSubIndex, setAutoSubIndex] = useState(0);
  const [complete, setComplete] = useState(false);
  const [cardOpenMobile, setCardOpenMobile] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const transcriptFileRef = useRef<HTMLInputElement>(null);
  const cvFileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const firstName = userName.split(" ")[0] ?? "Studente";

  useEffect(() => {
    async function init() {
      try {
        const state = await loadOnboardingState();
        setBlocks(state.blocks);

        if (state.phase === "welcome") {
          const { message } = await startOnboarding(firstName);
          setMessages([{ role: "assistant", content: message }]);
          setPhase("livello");
        } else if (FASE_B_PHASES.includes(state.phase) && !state.faseBStarted) {
          // Prima volta in Fase B (subito dopo il gate, o al rientro in una nuova sessione):
          // un solo messaggio di ripresa, mai il replay della Fase A.
          if (state.phase === "competenze") {
            const result = await startFaseB();
            setMessages([{ role: "assistant", content: result.message }]);
            setBlocks((b) => ({ ...b, competenze: result.competenze }));
          } else {
            const result = await resumeFaseB(state.phase);
            setMessages([{ role: "assistant", content: result.message }]);
          }
          setPhase(state.phase);
          if (state.phase === "chiusura") setComplete(true);
        } else {
          setMessages(state.conversation);
          setPhase(state.phase);
          if (state.phase === "esperienze") {
            // Resume semplificato: si riparte dalla domanda sulle esperienze nascoste,
            // non si ricostruisce la posizione esatta nel sotto-ciclo del CV.
            setExpIndex(0);
            setExpTotal(1);
          }
        }
      } catch (err) {
        console.error("[MIRA] onboarding init failed:", err);
        setLoadError(err instanceof Error ? err.message : t("unexpectedLoadError"));
      }
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!loading && !uploading && !GATED_PHASES.includes(phase)) inputRef.current?.focus();
  }, [loading, uploading, phase]);

  /** Rilettura completa dal server: mai fidarsi solo dei merge ottimistici parziali,
   * che possono disallinearsi dallo stato reale (es. dopo una revalidatePath). */
  async function resyncBlocks() {
    const fresh = await loadOnboardingState();
    setBlocks(fresh.blocks);
  }

  function appendAssistant(message: string) {
    setMessages((prev) => [...prev, { role: "assistant", content: message }]);
  }
  function appendUser(content: string) {
    setMessages((prev) => [...prev, { role: "user", content }]);
  }

  async function handleSend() {
    if (!input.trim() || loading || uploading) return;
    const userMessage = input.trim();
    setInput("");
    const history = messages;
    appendUser(userMessage);
    setLoading(true);

    try {
      if (phase === "livello") {
        const result = await submitLivello(history, userMessage);
        appendAssistant(result.message);
        setPhase(result.phase);
        await resyncBlocks();
      } else if (phase === "previous_degree") {
        const result = await submitPreviousDegree(history, userMessage);
        appendAssistant(result.message);
        setPhase(result.phase);
        await resyncBlocks();
      } else if (phase === "header_gap") {
        const result = await submitHeaderGap(history, userMessage);
        appendAssistant(result.message);
        setPhase(result.phase);
        await resyncBlocks();
      } else if (phase === "esperienze") {
        const result = await submitEsperienzaRisposta(history, userMessage, expIndex, expTotal);
        appendAssistant(result.message);
        if (result.done) {
          await resyncBlocks();
        } else {
          setExpIndex((i) => i + 1);
        }
      } else if (phase === "disponibilita") {
        const result = await submitDisponibilita(history, userMessage);
        appendAssistant(result.message);
        await resyncBlocks();
      } else if (phase === "competenze") {
        const result = await submitCompetenzeAggiunta(history, userMessage);
        appendAssistant(result.message);
        await resyncBlocks();
      } else if (phase === "lingue") {
        const result = await submitLingue(history, userMessage);
        appendAssistant(result.message);
        await resyncBlocks();
      } else if (phase === "interessi") {
        const result = await submitInteressi(history, userMessage, interessiSubIndex);
        appendAssistant(result.message);
        if (result.done) {
          await resyncBlocks();
        } else {
          setInteressiSubIndex(1);
        }
      } else if (phase === "autodescrizione") {
        const result = await submitAutodescrizioneRisposta(history, userMessage, autoSubIndex);
        appendAssistant(result.message);
        if (result.done) {
          await resyncBlocks();
        } else {
          setAutoSubIndex((i) => i + 1);
        }
      } else if (phase === "piano_carriera") {
        const result = await submitPianoCarriera(history, userMessage);
        appendAssistant(result.message);
        await resyncBlocks();
      }
    } catch (err) {
      console.error("[MIRA] handleSend failed:", err);
      appendAssistant(
        err instanceof Error
          ? t("errorWithMessage", { message: err.message })
          : c("authErrors.generic")
      );
    } finally {
      setLoading(false);
    }
  }

  /** Chiamato dal pannello dopo che un blocco Step 2 è già stato approvato lì —
   * decide solo la prossima domanda; mai richiama approveCardBlock (già fatto dal click). */
  async function handleBlockApproved(blockType: CardBlockType) {
    const history = messages;
    try {
      await handleBlockApprovedInner(blockType, history);
    } catch (err) {
      console.error("[MIRA] handleBlockApproved failed:", err);
      appendAssistant(
        err instanceof Error
          ? t("errorWithMessage", { message: err.message })
          : c("authErrors.generic")
      );
    }
    await resyncBlocks();
  }

  async function handleBlockApprovedInner(blockType: CardBlockType, history: ChatMessage[]) {
    if (blockType === "header") {
      const result = await afterHeaderApproved(history);
      appendAssistant(result.message);
      setPhase(result.phase);
    } else if (blockType === "esperienze") {
      const result = await afterEsperienzeApproved(history);
      appendAssistant(result.message);
      setPhase(result.phase);
    } else if (blockType === "disponibilita") {
      const result = await afterDisponibilitaApproved(history);
      appendAssistant(result.message);
      setPhase(result.phase);
    } else if (blockType === "competenze") {
      const result = await afterCompetenzeApproved(history);
      appendAssistant(result.message);
      setPhase(result.phase);
    } else if (blockType === "lingue") {
      const result = await afterLingueApproved(history);
      appendAssistant(result.message);
      setPhase(result.phase);
    } else if (blockType === "interessi") {
      const result = await afterInteressiApproved(history);
      appendAssistant(result.message);
      setPhase(result.phase);
    } else if (blockType === "autodescrizione") {
      const result = await afterAutodescrizioneApproved(history);
      appendAssistant(result.message);
      setPhase(result.phase);
    } else if (blockType === "piano_carriera") {
      const result = await afterPianoCarrieraApproved(history);
      appendAssistant(result.message);
      setPhase(result.phase);
      setComplete(true);
      setTimeout(() => {
        router.push("/student");
        router.refresh();
      }, 3000);
    }
    // Formazione non ha una fase propria: viene approvata insieme all'Header (alsoApprove).
  }

  async function handleContinueNow() {
    setLoading(true);
    const result = await startFaseB();
    appendAssistant(result.message);
    setPhase("competenze");
    await resyncBlocks();
    setLoading(false);
  }

  function handleContinueLater() {
    setComplete(true);
    setTimeout(() => {
      router.push("/student");
      router.refresh();
    }, 1200);
  }

  async function handleTranscriptFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const historyWithMarker: ChatMessage[] = [...messages, { role: "user", content: "[Ho caricato il mio libretto]" }];
    appendUser("[Ho caricato il mio libretto]");

    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadTranscript(formData);

    if (result.error || !result.parsed) {
      appendAssistant(t("transcriptReadError", { error: result.error ?? t("unknownError") }));
      setMessages((prev) => prev.filter((m) => m.content !== "[Ho caricato il mio libretto]"));
      setUploading(false);
      if (transcriptFileRef.current) transcriptFileRef.current.value = "";
      return;
    }

    const reaction = await reactToTranscript(historyWithMarker, {
      coursesCount: result.parsed.courses.length,
      totalCredits: result.parsed.total_credits,
      weightedAverage: result.parsed.weighted_average,
    });
    appendAssistant(reaction.message);
    setPhase(reaction.phase);
    await resyncBlocks();
    setUploading(false);
    if (transcriptFileRef.current) transcriptFileRef.current.value = "";
  }

  async function handleSkipTranscript() {
    const history = messages;
    appendUser("[Libretto saltato]");
    const result = await skipTranscript(history);
    appendAssistant(result.message);
    setPhase(result.phase);
    await resyncBlocks();
  }

  async function handleCVFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const historyWithMarker: ChatMessage[] = [...messages, { role: "user", content: "[Ho caricato il mio CV]" }];
    appendUser("[Ho caricato il mio CV]");

    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadCV(formData);
    if (result.error) {
      appendAssistant(t("cvReadError"));
    }

    const reaction = await reactToCV(historyWithMarker);
    appendAssistant(reaction.message);
    setPhase(reaction.phase);
    setExpIndex(0);
    setExpTotal(reaction.totalExperienceQuestions);
    setUploading(false);
    if (cvFileRef.current) cvFileRef.current.value = "";
  }

  async function handleSkipCV() {
    const history = messages;
    appendUser("[CV saltato]");
    const result = await skipCV(history);
    appendAssistant(result.message);
    setPhase(result.phase);
    setExpIndex(0);
    setExpTotal(result.totalExperienceQuestions);
    await resyncBlocks();
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
  const isWorking = loading || uploading;
  const cardPanel = <OnboardingCardPanel blocks={blocks} phase={phase} onApproved={handleBlockApproved} />;

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-[1fr_520px] h-full">
      <div className="flex flex-col h-full min-h-0">
        <div className="px-6 py-3 flex items-center justify-between shrink-0 border-b border-border">
          <img src="/brand/mira-lockup.svg" alt="MIRA" className="h-5" />
          <div className="flex items-center gap-4">
            {userMessageCount >= 3 && !complete && (
              <button
                onClick={handleForceComplete}
                disabled={isWorking}
                className="text-body-sm text-ink-secondary hover:text-navy border border-border rounded-md px-3 py-1.5 hover:border-border-strong transition-colors duration-100 disabled:opacity-40"
              >
                {t("completeProfile")}
              </button>
            )}
            <span className="text-body-sm text-ink-secondary">{userName}</span>
            <form action={signOut}>
              <button type="submit" className="text-body-sm text-ink-tertiary hover:text-navy transition-colors duration-100">
                {c("signOut")}
              </button>
            </form>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 px-6 py-4 min-h-0">
          {loadError && (
            <div className="rounded-lg border border-error/30 bg-error-bg px-4 py-3">
              <p className="text-body-sm font-medium text-error">{t("cardLoadErrorTitle")}</p>
              <p className="text-body-sm text-error/80 mt-1">{loadError}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-xs font-medium text-error underline underline-offset-2"
              >
                {t("reloadPage")}
              </button>
            </div>
          )}
          {messages.map((msg, i) => {
            const isMarker =
              msg.role === "user" &&
              ["[Ho caricato il mio libretto]", "[Ho caricato il mio CV]", "[Libretto saltato]", "[CV saltato]"].includes(
                msg.content
              );
            if (isMarker) {
              return (
                <div key={i} className="flex justify-end">
                  <div className="bg-navy/80 text-white rounded-lg px-4 py-2 text-body-sm">{msg.content.replace(/[[\]]/g, "")}</div>
                </div>
              );
            }
            return (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    msg.role === "user" ? "bg-navy text-white" : "bg-white border border-border text-ink"
                  }`}
                >
                  {msg.role === "assistant" && <p className="text-eyebrow text-petrol uppercase mb-1">MIRA</p>}
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

        {/* pannello card espandibile, solo mobile */}
        <div className="lg:hidden border-t border-border shrink-0">
          <button
            onClick={() => setCardOpenMobile((o) => !o)}
            className="w-full px-6 py-2 text-body-sm text-petrol flex items-center justify-between"
          >
            <span>{panelT("title")}</span>
            <span>{cardOpenMobile ? "▾" : "▸"}</span>
          </button>
          {cardOpenMobile && <div className="max-h-[45vh] overflow-y-auto border-t border-border">{cardPanel}</div>}
        </div>

        {!complete ? (
          <div className="border-t border-border px-6 py-3 shrink-0">
            {phase === "transcript" && (
              <div className="flex gap-3 mb-3">
                <input ref={transcriptFileRef} type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={handleTranscriptFile} className="hidden" />
                <button
                  onClick={() => transcriptFileRef.current?.click()}
                  disabled={isWorking}
                  className="text-body-sm bg-navy text-white px-4 py-2 rounded-md hover:bg-navy-700 transition-colors disabled:opacity-40"
                >
                  {t("uploadTranscript")}
                </button>
                <button
                  onClick={handleSkipTranscript}
                  disabled={isWorking}
                  className="text-body-sm text-ink-secondary border border-border rounded-md px-4 py-2 hover:border-border-strong transition-colors disabled:opacity-40"
                >
                  {t("skip")}
                </button>
              </div>
            )}
            {phase === "gate" && (
              <div className="flex gap-3 mb-3">
                <button
                  onClick={handleContinueNow}
                  disabled={isWorking}
                  className="text-body-sm bg-navy text-white px-4 py-2 rounded-md hover:bg-navy-700 transition-colors disabled:opacity-40"
                >
                  {t("completeNow")}
                </button>
                <button
                  onClick={handleContinueLater}
                  disabled={isWorking}
                  className="text-body-sm text-ink-secondary border border-border rounded-md px-4 py-2 hover:border-border-strong transition-colors disabled:opacity-40"
                >
                  {t("later")}
                </button>
              </div>
            )}
            {phase === "cv" && (
              <div className="flex gap-3 mb-3">
                <input ref={cvFileRef} type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={handleCVFile} className="hidden" />
                <button
                  onClick={() => cvFileRef.current?.click()}
                  disabled={isWorking}
                  className="text-body-sm bg-navy text-white px-4 py-2 rounded-md hover:bg-navy-700 transition-colors disabled:opacity-40"
                >
                  {t("uploadCV")}
                </button>
                <button
                  onClick={handleSkipCV}
                  disabled={isWorking}
                  className="text-body-sm text-ink-secondary border border-border rounded-md px-4 py-2 hover:border-border-strong transition-colors disabled:opacity-40"
                >
                  {t("skip")}
                </button>
              </div>
            )}
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder={GATED_PHASES.includes(phase) ? t("useButtonsPlaceholder") : c("messagePlaceholder")}
                disabled={isWorking || GATED_PHASES.includes(phase)}
                className="flex-1 px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200 disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={isWorking || !input.trim() || GATED_PHASES.includes(phase)}
                className="bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100 disabled:opacity-40"
              >
                {c("send")}
              </button>
            </div>
          </div>
        ) : (
          <div className="border-t border-border px-6 py-3 shrink-0">
            <div className="rounded-md bg-success-bg p-4 text-center">
              <p className="text-body font-medium text-success">{t("applicationUnlocked")}</p>
            </div>
          </div>
        )}
      </div>

      <div className="hidden lg:block border-l border-border h-full min-h-0">{cardPanel}</div>
    </div>
  );
}
