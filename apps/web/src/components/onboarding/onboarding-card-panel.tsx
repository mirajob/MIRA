"use client";

import { useTranslations } from "next-intl";
import { HeaderBlock } from "@/components/card/header-block";
import { DisponibilitaEPianoBlock } from "@/components/card/disponibilita-block";
import { EsperienzeBlock } from "@/components/card/esperienze-block";
import { CompetenzeBlock } from "@/components/card/competenze-block";
import { LingueBlock } from "@/components/card/lingue-block";
import { ProseBlock } from "@/components/card/prose-block";
import type { OnboardingBlocksState, OnboardingPhase } from "@/lib/actions/chat-onboarding";
import type { CardBlockStatus, CardBlockType } from "@mira/types";

interface OnboardingCardPanelProps {
  blocks: OnboardingBlocksState;
  phase: OnboardingPhase;
  /** Chiamato dopo che uno dei componenti ha già approvato il blocco lato server. */
  onApproved: (blockType: CardBlockType) => void;
}

// I 6 blocchi visibili della card (rework 2026-07). Due sono "virtuali" rispetto al DB:
// - disponibilita_piano = righe disponibilita + piano_carriera (confermate insieme);
// - profilo_personale  = riga autodescrizione (interessi è legacy e non compare).
// "formazione" resta una sezione espandibile dentro Header (approvata via alsoApprove).
type PanelBlock =
  | "header"
  | "esperienze"
  | "disponibilita_piano"
  | "competenze"
  | "lingue"
  | "profilo_personale";

const BLOCK_ORDER: PanelBlock[] = [
  "header",
  "esperienze",
  "disponibilita_piano",
  "competenze",
  "lingue",
  "profilo_personale",
];

const BLOCK_TITLE_KEYS: Record<PanelBlock, string> = {
  header: "header",
  esperienze: "esperienze",
  disponibilita_piano: "disponibilitaEPiano",
  competenze: "competenze",
  lingue: "lingue",
  profilo_personale: "profiloPersonale",
};

/** A quale blocco corrisponde la domanda che MIRA sta facendo in questo momento in chat. */
const PHASE_TO_BLOCK: Partial<Record<OnboardingPhase, PanelBlock>> = {
  livello: "header",
  previous_degree: "header",
  transcript: "header",
  header_gap: "header",
  cv: "esperienze",
  esperienze: "esperienze",
  disponibilita: "disponibilita_piano",
  competenze: "competenze",
  lingue: "lingue",
  profilo_personale: "profilo_personale",
};

/** Status del blocco unito: approvato solo se ENTRAMBE le righe lo sono; in bozza se
 * almeno una lo è (es. utente legacy con disponibilita approvata e piano no). */
function mergedStatus(a: CardBlockStatus, b: CardBlockStatus): CardBlockStatus {
  if (a === "approved" && b === "approved") return "approved";
  if (a === "draft" || b === "draft" || a === "approved" || b === "approved") return "draft";
  return "empty";
}

function panelStatus(blocks: OnboardingBlocksState, blockType: PanelBlock): CardBlockStatus {
  if (blockType === "disponibilita_piano") return mergedStatus(blocks.disponibilita.status, blocks.piano_carriera.status);
  if (blockType === "profilo_personale") return blocks.autodescrizione.status;
  return blocks[blockType].status;
}

function CollapsedRow({ title, approvedLabel }: { title: string; approvedLabel: string }) {
  return (
    <div className="rounded-lg border border-border bg-white px-5 py-3 flex items-center justify-between">
      <p className="text-eyebrow text-navy/60 uppercase">{title}</p>
      <span className="text-xs px-2 py-0.5 rounded bg-success-bg text-success font-medium">{approvedLabel}</span>
    </div>
  );
}

export function OnboardingCardPanel({ blocks, phase, onApproved }: OnboardingCardPanelProps) {
  const t = useTranslations("CardBlocks");
  const panelT = useTranslations("OnboardingCardPanel");
  // Percentuale sui 6 blocchi visibili — coerente con quella calcolata dal motore al gate.
  const approvedCount = BLOCK_ORDER.filter((key) => panelStatus(blocks, key) === "approved").length;
  const progressPct = Math.round((approvedCount / BLOCK_ORDER.length) * 100);
  const activeBlock = PHASE_TO_BLOCK[phase];

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3 border-b border-border flex items-center gap-3 shrink-0">
        <p className="text-eyebrow text-navy/60 uppercase whitespace-nowrap">{panelT("title")}</p>
        <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-petrol rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-ink tabular-nums">{progressPct}%</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {BLOCK_ORDER.map((blockType) => {
          const status = panelStatus(blocks, blockType);
          const isActive = blockType === activeBlock;

          // Non ancora raggiunto e non è il blocco attivo: non mostrarlo affatto —
          // solo quello su cui MIRA sta facendo domande in questo momento, più i completati.
          if (!isActive && status !== "approved") return null;

          if (!isActive && status === "approved") {
            return <CollapsedRow key={blockType} title={t(`titles.${BLOCK_TITLE_KEYS[blockType]}`)} approvedLabel={t("approved")} />;
          }

          switch (blockType) {
            case "header":
              return (
                <HeaderBlock
                  key={blockType}
                  proseContent={blocks.header.data}
                  visibility={blocks.header.visibility}
                  status={blocks.header.status}
                  formazioneItems={blocks.formazione.data.items}
                  onApproved={() => onApproved("header")}
                />
              );
            case "esperienze":
              return (
                <EsperienzeBlock
                  key={blockType}
                  items={blocks.esperienze.data.items}
                  status={blocks.esperienze.status}
                  onApproved={() => onApproved("esperienze")}
                />
              );
            case "disponibilita_piano":
              return (
                <DisponibilitaEPianoBlock
                  key={blockType}
                  disponibilita={blocks.disponibilita.data}
                  piano={blocks.piano_carriera.data}
                  status={status}
                  onApproved={() => onApproved("disponibilita")}
                />
              );
            case "competenze":
              // Key include il conteggio: durante l'onboarding lo studente non ha mai una modifica
              // manuale in corso su questo blocco (arriva solo via chat), quindi un remount pulito
              // ad ogni nuova skill è sicuro e garantisce che il pannello parta sempre
              // dai dati freschi invece di fidarsi del merge interno del componente.
              return (
                <CompetenzeBlock
                  key={`competenze-${blocks.competenze.data.items.length}`}
                  data={blocks.competenze.data}
                  status={blocks.competenze.status}
                  onApproved={() => onApproved("competenze")}
                />
              );
            case "lingue":
              return (
                <LingueBlock
                  key={blockType}
                  items={blocks.lingue.data.items}
                  status={blocks.lingue.status}
                  onApproved={() => onApproved("lingue")}
                />
              );
            case "profilo_personale":
              // Riga DB "autodescrizione": ospita il Profilo personale (interessi +
              // autodescrizione uniti). onApproved passa "autodescrizione" perché è
              // quello il block_type approvato lato server.
              return (
                <ProseBlock
                  key={blockType}
                  blockType="autodescrizione"
                  title={t("titles.profiloPersonale")}
                  testo={blocks.autodescrizione.data.testo}
                  status={blocks.autodescrizione.status}
                  serif
                  placeholder={t("profiloPersonalePlaceholder")}
                  onApproved={() => onApproved("autodescrizione")}
                />
              );
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}
