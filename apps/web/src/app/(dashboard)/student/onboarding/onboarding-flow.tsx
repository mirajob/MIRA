"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  loadOnboardingFlow,
  prefillEsperienzeFromCV,
  prefillLingueFromCV,
  startFaseBFlow,
  completeGateFlow,
  forceCompleteOnboarding,
} from "@/lib/actions/onboarding-flow";
import type { OnboardingFlowState, OnboardingFlowPhase, OnboardingBlocksState } from "@/lib/actions/onboarding-flow";
import { uploadTranscript } from "@/lib/actions/transcript-upload";
import { uploadCV } from "@/lib/actions/cv-upload";
import { signOut } from "@/lib/actions/auth";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { HeaderBlock } from "@/components/card/header-block";
import { EsperienzeBlock } from "@/components/card/esperienze-block";
import { DisponibilitaEPianoBlock } from "@/components/card/disponibilita-block";
import { CompetenzeBlock } from "@/components/card/competenze-block";
import { LingueBlock } from "@/components/card/lingue-block";
import { ProseBlock } from "@/components/card/prose-block";
import { getCompetenzaCategoria } from "@mira/types";
import type { CardBlockStatus } from "@mira/types";

// I 6 blocchi visibili della card, nell'ordine del flusso. Due sono "virtuali" rispetto
// al DB: disponibilita_piano = righe disponibilita + piano_carriera (confermate insieme);
// profilo_personale = riga autodescrizione. Si vede SOLO il blocco attivo più quelli già
// confermati (riga chiusa): i blocchi futuri compaiono quando arriva il loro turno.
type FlowBlock = "header" | "esperienze" | "disponibilita_piano" | "competenze" | "lingue" | "profilo_personale";

const BLOCK_ORDER: FlowBlock[] = ["header", "esperienze", "disponibilita_piano", "competenze", "lingue", "profilo_personale"];

const PHASE_TO_BLOCK: Partial<Record<OnboardingFlowPhase, FlowBlock>> = {
  header: "header",
  esperienze: "esperienze",
  disponibilita: "disponibilita_piano",
  competenze: "competenze",
  lingue: "lingue",
  profilo: "profilo_personale",
};

const BLOCK_TITLE_KEYS: Record<FlowBlock, string> = {
  header: "header",
  esperienze: "esperienze",
  disponibilita_piano: "disponibilitaEPiano",
  competenze: "competenze",
  lingue: "lingue",
  profilo_personale: "profiloPersonale",
};

function mergedStatus(a: CardBlockStatus, b: CardBlockStatus): CardBlockStatus {
  if (a === "approved" && b === "approved") return "approved";
  if (a === "draft" || b === "draft" || a === "approved" || b === "approved") return "draft";
  return "empty";
}

function blockStatus(blocks: OnboardingBlocksState, block: FlowBlock): CardBlockStatus {
  if (block === "disponibilita_piano") return mergedStatus(blocks.disponibilita.status, blocks.piano_carriera.status);
  if (block === "profilo_personale") return blocks.autodescrizione.status;
  return blocks[block].status;
}

function computePct(blocks: OnboardingBlocksState): number {
  const approved = BLOCK_ORDER.filter((b) => blockStatus(blocks, b) === "approved").length;
  return Math.round((approved / BLOCK_ORDER.length) * 100);
}

/** Il riquadro-guida di MIRA sopra il blocco attivo: la sua voce, senza chat. */
function MiraGuide({ text, children }: { text: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-petrol/25 bg-petrol-50/60 px-4 py-3">
      <p className="text-eyebrow text-petrol uppercase mb-1.5 flex items-center gap-1.5">
        <span aria-hidden="true">✦</span> MIRA
      </p>
      <p className="text-body text-ink whitespace-pre-wrap">{text}</p>
      {children && <div className="mt-3 flex flex-wrap gap-3">{children}</div>}
    </div>
  );
}

function CollapsedRow({ title, approvedLabel }: { title: string; approvedLabel: string }) {
  return (
    <div className="rounded-lg border border-border bg-white px-5 py-3 flex items-center justify-between">
      <p className="text-eyebrow text-navy/60 uppercase">{title}</p>
      <span className="text-xs px-2 py-0.5 rounded bg-success-bg text-success font-medium">{approvedLabel}</span>
    </div>
  );
}

export function OnboardingFlow({ userName }: { userName: string }) {
  const t = useTranslations("OnboardingFlow");
  const cardT = useTranslations("CardBlocks");
  const c = useTranslations("Common");
  const router = useRouter();
  const firstName = userName.split(" ")[0] ?? "Studente";

  const [flow, setFlow] = useState<OnboardingFlowState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [transcriptStats, setTranscriptStats] = useState<{ courses: number; credits: number; avg: number | null } | null>(null);
  const [skippedTranscript, setSkippedTranscript] = useState(false);
  const [skippedCV, setSkippedCV] = useState(false);
  const [gatePct, setGatePct] = useState<number | null>(null);
  const [complete, setComplete] = useState(false);
  const transcriptFileRef = useRef<HTMLInputElement>(null);
  const cvFileRef = useRef<HTMLInputElement>(null);
  const linguePrefilledRef = useRef(false);
  const redirectedRef = useRef(false);

  async function refresh(): Promise<OnboardingFlowState | null> {
    try {
      const fresh = await loadOnboardingFlow();
      // Entrando in Lingue: se il CV le contiene e il blocco è ancora vuoto, le riverso
      // come bozza (una sola volta) — poi ricarico lo stato per mostrarle.
      if (
        fresh.phase === "lingue" &&
        !linguePrefilledRef.current &&
        fresh.cvUploaded &&
        fresh.blocks.lingue.data.items.length === 0
      ) {
        linguePrefilledRef.current = true;
        await prefillLingueFromCV();
        const refreshed = await loadOnboardingFlow();
        setFlow(refreshed);
        return refreshed;
      }
      setFlow(fresh);
      return fresh;
    } catch (err) {
      console.error("[MIRA] onboarding load failed:", err);
      setLoadError(err instanceof Error ? err.message : t("loadError"));
      return null;
    }
  }

  useEffect(() => {
    (async () => {
      const fresh = await refresh();
      // Card già completa (es. rientro dopo la chiusura): mostra il finale e torna al Profilo.
      if (fresh?.phase === "chiusura") finishAndRedirect(2500);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finishAndRedirect(delayMs: number) {
    if (redirectedRef.current) return;
    redirectedRef.current = true;
    setComplete(true);
    setTimeout(() => {
      router.push("/student");
      router.refresh();
    }, delayMs);
  }

  /** Dopo il Conferma di un blocco (il salvataggio+approvazione è già avvenuto lì). */
  async function handleBlockApproved(block: FlowBlock) {
    if (block === "disponibilita_piano") {
      // Gate: candidatura sbloccata.
      try {
        const { progressPct } = await completeGateFlow();
        setGatePct(progressPct);
      } catch (err) {
        console.error("[MIRA] completeGateFlow failed:", err);
      }
      await refresh();
      return;
    }
    const fresh = await refresh();
    if (fresh?.phase === "chiusura") finishAndRedirect(3000);
  }

  async function handleTranscriptFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadTranscript(formData);
    if (result.error || !result.parsed) {
      setUploadError(t("transcriptReadError", { error: result.error ?? t("unknownError") }));
    } else {
      setTranscriptStats({
        courses: result.parsed.courses.length,
        credits: result.parsed.total_credits,
        avg: result.parsed.weighted_average,
      });
      await refresh();
    }
    setUploading(false);
    if (transcriptFileRef.current) transcriptFileRef.current.value = "";
  }

  async function handleCVFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadCV(formData);
    if (result.error) {
      setUploadError(t("cvReadError"));
    }
    // Anche con parsing parziale: riversa quello che c'è nel blocco Esperienze.
    try {
      await prefillEsperienzeFromCV();
    } catch (err) {
      console.error("[MIRA] prefillEsperienzeFromCV failed:", err);
    }
    await refresh();
    setUploading(false);
    if (cvFileRef.current) cvFileRef.current.value = "";
  }

  async function handleStartFaseB() {
    setBusy(true);
    try {
      await startFaseBFlow();
      await refresh();
    } catch (err) {
      console.error("[MIRA] startFaseBFlow failed:", err);
    }
    setBusy(false);
  }

  async function handleForceComplete() {
    setBusy(true);
    const result = await forceCompleteOnboarding();
    if (result.success) {
      finishAndRedirect(1500);
    }
    setBusy(false);
  }

  // ---------------------------------------------------------------------------

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="rounded-lg border border-error/30 bg-error-bg px-5 py-4 max-w-md">
          <p className="text-body-sm font-medium text-error">{t("loadErrorTitle")}</p>
          <p className="text-body-sm text-error/80 mt-1">{loadError}</p>
          <button onClick={() => window.location.reload()} className="mt-2 text-xs font-medium text-error underline underline-offset-2">
            {t("reloadPage")}
          </button>
        </div>
      </div>
    );
  }

  const blocks = flow?.blocks ?? null;
  const phase = flow?.phase ?? null;
  const activeBlock = phase ? PHASE_TO_BLOCK[phase] : undefined;
  const progressPct = blocks ? computePct(blocks) : 0;

  /** Il testo guida di MIRA per il blocco attivo, sensibile al contesto. */
  function guideText(): string {
    if (!flow || !blocks) return "";
    switch (phase) {
      case "header": {
        if (transcriptStats) {
          const avg = transcriptStats.avg ? t("avgSuffix", { avg: transcriptStats.avg.toFixed(1) }) : "";
          return t("guideHeaderAfterUpload", { courses: transcriptStats.courses, credits: transcriptStats.credits, avg });
        }
        if (flow.transcriptUploaded) return t("guideHeaderUploaded");
        if (skippedTranscript) return t("guideHeaderManual");
        return t("guideHeaderIntro", {
          name: firstName,
          hint: flow.isBocconi ? t("hintBocconi") : t("hintGeneric"),
        });
      }
      case "esperienze": {
        if (flow.cvUploaded) return t("guideEsperienzeAfterCV", { count: blocks.esperienze.data.items.length });
        if (skippedCV) return t("guideEsperienzeManual");
        return t("guideEsperienze");
      }
      case "disponibilita":
        return t("guideDisponibilita");
      case "competenze": {
        const hasAcademic = blocks.competenze.data.items.some((i) => getCompetenzaCategoria(i) === "academic");
        return hasAcademic ? t("guideCompetenzeProposed") : t("guideCompetenzeManual");
      }
      case "lingue":
        return blocks.lingue.data.items.length > 0 ? t("guideLingueWithCV") : t("guideLingue");
      case "profilo":
        return t("guideProfilo");
      default:
        return "";
    }
  }

  /** I bottoni contestuali dentro la guida (upload libretto/CV con relativo Salta). */
  function guideActions(): React.ReactNode {
    if (!flow) return null;
    if (phase === "header" && !flow.transcriptUploaded && !skippedTranscript) {
      return (
        <>
          <input ref={transcriptFileRef} type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={handleTranscriptFile} className="hidden" />
          <button
            onClick={() => transcriptFileRef.current?.click()}
            disabled={uploading}
            className="text-body-sm bg-navy text-white px-4 py-2 rounded-md hover:bg-navy-700 transition-colors disabled:opacity-40"
          >
            {uploading ? t("uploadingLabel") : t("uploadTranscript")}
          </button>
          <button
            onClick={() => setSkippedTranscript(true)}
            disabled={uploading}
            className="text-body-sm text-ink-secondary border border-border rounded-md px-4 py-2 hover:border-border-strong transition-colors disabled:opacity-40"
          >
            {t("skip")}
          </button>
        </>
      );
    }
    if (phase === "esperienze" && !flow.cvUploaded && !skippedCV) {
      return (
        <>
          <input ref={cvFileRef} type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={handleCVFile} className="hidden" />
          <button
            onClick={() => cvFileRef.current?.click()}
            disabled={uploading}
            className="text-body-sm bg-navy text-white px-4 py-2 rounded-md hover:bg-navy-700 transition-colors disabled:opacity-40"
          >
            {uploading ? t("uploadingLabel") : t("uploadCV")}
          </button>
          <button
            onClick={() => setSkippedCV(true)}
            disabled={uploading}
            className="text-body-sm text-ink-secondary border border-border rounded-md px-4 py-2 hover:border-border-strong transition-colors disabled:opacity-40"
          >
            {t("skip")}
          </button>
        </>
      );
    }
    return null;
  }

  function renderActiveEditor(block: FlowBlock) {
    if (!blocks) return null;
    switch (block) {
      case "header":
        return (
          <HeaderBlock
            key={`header-${blocks.formazione.data.items.length}`}
            proseContent={blocks.header.data}
            visibility={blocks.header.visibility}
            status={blocks.header.status}
            formazioneItems={blocks.formazione.data.items}
            onApproved={() => handleBlockApproved("header")}
          />
        );
      case "esperienze":
        return (
          <EsperienzeBlock
            key={`esperienze-${blocks.esperienze.data.items.length}`}
            items={blocks.esperienze.data.items}
            status={blocks.esperienze.status}
            onApproved={() => handleBlockApproved("esperienze")}
          />
        );
      case "disponibilita_piano":
        return (
          <DisponibilitaEPianoBlock
            disponibilita={blocks.disponibilita.data}
            piano={blocks.piano_carriera.data}
            status={blockStatus(blocks, "disponibilita_piano")}
            onApproved={() => handleBlockApproved("disponibilita_piano")}
          />
        );
      case "competenze":
        return (
          <CompetenzeBlock
            key={`competenze-${blocks.competenze.data.items.length}`}
            data={blocks.competenze.data}
            status={blocks.competenze.status}
            onApproved={() => handleBlockApproved("competenze")}
          />
        );
      case "lingue":
        return (
          <LingueBlock
            key={`lingue-${blocks.lingue.data.items.length}`}
            items={blocks.lingue.data.items}
            status={blocks.lingue.status}
            onApproved={() => handleBlockApproved("lingue")}
          />
        );
      case "profilo_personale":
        return (
          <ProseBlock
            blockType="autodescrizione"
            title={cardT("titles.profiloPersonale")}
            testo={blocks.autodescrizione.data.testo}
            status={blocks.autodescrizione.status}
            serif
            placeholder={cardT("profiloPersonalePlaceholder")}
            onApproved={() => handleBlockApproved("profilo_personale")}
          />
        );
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Topbar */}
      <div className="px-6 py-3 flex items-center justify-between shrink-0 border-b border-border bg-white">
        <img src="/brand/mira-lockup.svg" alt="MIRA" className="h-5" />
        <div className="flex items-center gap-4">
          <LocaleSwitcher />
          {!complete && flow && (
            <button
              onClick={handleForceComplete}
              disabled={busy || uploading}
              className="text-body-sm text-ink-secondary hover:text-navy border border-border rounded-md px-3 py-1.5 hover:border-border-strong transition-colors duration-100 disabled:opacity-40"
            >
              {t("completeProfile")}
            </button>
          )}
          <span className="text-body-sm text-ink-secondary hidden sm:inline">{userName}</span>
          <form action={signOut}>
            <button type="submit" className="text-body-sm text-ink-tertiary hover:text-navy transition-colors duration-100">
              {c("signOut")}
            </button>
          </form>
        </div>
      </div>

      {/* Barra di avanzamento */}
      <div className="px-6 py-3 border-b border-border bg-white flex items-center gap-3 shrink-0">
        <p className="text-eyebrow text-navy/60 uppercase whitespace-nowrap">{t("progressTitle")}</p>
        <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
          <div className="h-full bg-petrol rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
        </div>
        <span className="text-xs font-semibold text-ink tabular-nums">{progressPct}%</span>
      </div>

      {/* Colonna unica */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="mx-auto max-w-3xl px-4 py-6 space-y-3">
          {!flow && !loadError && (
            <div className="flex justify-center py-16">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-navy-200 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-navy-200 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-navy-200 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          {blocks &&
            BLOCK_ORDER.map((block) => {
              const status = blockStatus(blocks, block);
              const isActive = block === activeBlock && !complete;

              // Solo il blocco attivo e quelli già confermati: i futuri restano invisibili
              // finché non arriva il loro turno.
              if (!isActive && status !== "approved") return null;
              if (!isActive && status === "approved") {
                return <CollapsedRow key={block} title={cardT(`titles.${BLOCK_TITLE_KEYS[block]}`)} approvedLabel={cardT("approved")} />;
              }

              return (
                <div key={block} className="space-y-3">
                  <MiraGuide text={guideText()}>{guideActions()}</MiraGuide>
                  {uploadError && (
                    <div className="rounded-md border border-error/30 bg-error-bg px-4 py-2.5">
                      <p className="text-body-sm text-error">{uploadError}</p>
                    </div>
                  )}
                  {renderActiveEditor(block)}
                </div>
              );
            })}

          {/* Gate: candidatura sbloccata, si sceglie se continuare con la Fase B. */}
          {phase === "gate" && !complete && (
            <div className="rounded-lg border border-border bg-white overflow-hidden">
              <div className="p-5">
                <h2 className="font-display text-h3 text-navy">{t("gateTitle")}</h2>
                <p className="mt-1 text-body text-ink-secondary">{t("gateBody", { pct: gatePct ?? progressPct })}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={handleStartFaseB}
                    disabled={busy}
                    className="text-body-sm bg-navy text-white px-4 py-2 rounded-md hover:bg-navy-700 transition-colors disabled:opacity-40"
                  >
                    {busy ? t("preparingLabel") : t("gateContinue")}
                  </button>
                  <button
                    onClick={() => {
                      router.push("/student/associazioni");
                      router.refresh();
                    }}
                    disabled={busy}
                    className="text-body-sm text-ink-secondary border border-border rounded-md px-4 py-2 hover:border-border-strong transition-colors disabled:opacity-40"
                  >
                    {t("gateExit")}
                  </button>
                </div>
              </div>
              {/* Avviso richiesto dalla spec: box giallo chiaro con scritta verde. */}
              <div className="mx-5 mb-5 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3">
                <p className="text-body-sm font-semibold text-green-700">{t("gateWarning")}</p>
              </div>
            </div>
          )}

          {/* Chiusura */}
          {(phase === "chiusura" || complete) && (
            <div className="rounded-lg border border-border bg-white p-5">
              <h2 className="font-display text-h3 text-navy">{t("finalTitle")}</h2>
              <p className="mt-1 text-body text-ink-secondary">{t("finalBody")}</p>
              <p className="mt-3 text-body-sm text-success font-medium">{t("redirecting")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
