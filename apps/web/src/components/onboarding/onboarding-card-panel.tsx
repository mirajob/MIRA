"use client";

import { useTranslations } from "next-intl";
import { HeaderBlock } from "@/components/card/header-block";
import { DisponibilitaBlock } from "@/components/card/disponibilita-block";
import { EsperienzeBlock } from "@/components/card/esperienze-block";
import { CompetenzeBlock } from "@/components/card/competenze-block";
import { LingueBlock } from "@/components/card/lingue-block";
import { ProseBlock } from "@/components/card/prose-block";
import type { OnboardingBlocksState, OnboardingPhase } from "@/lib/actions/chat-onboarding";
import type { CardBlockType } from "@mira/types";

interface OnboardingCardPanelProps {
  blocks: OnboardingBlocksState;
  phase: OnboardingPhase;
  /** Chiamato dopo che uno dei componenti Step 2 ha già approvato il blocco lato server. */
  onApproved: (blockType: CardBlockType) => void;
}

// "formazione" non compare qui: gli esami sono una sezione espandibile dentro Header,
// non un blocco confermabile a sé (approvato insieme all'Header via alsoApprove).
const BLOCK_ORDER: CardBlockType[] = [
  "header",
  "disponibilita",
  "esperienze",
  "competenze",
  "lingue",
  "autodescrizione",
  "interessi",
  "piano_carriera",
];

const BLOCK_TITLE_KEYS: Record<CardBlockType, string> = {
  header: "header",
  disponibilita: "disponibilita",
  esperienze: "esperienze",
  formazione: "formazione",
  competenze: "competenze",
  lingue: "lingue",
  autodescrizione: "autodescrizione",
  interessi: "interessi",
  piano_carriera: "pianoCarriera",
};

/** A quale blocco corrisponde la domanda che MIRA sta facendo in questo momento in chat. */
const PHASE_TO_BLOCK: Partial<Record<OnboardingPhase, CardBlockType>> = {
  livello: "header",
  previous_degree: "header",
  transcript: "header",
  header_gap: "header",
  cv: "esperienze",
  esperienze: "esperienze",
  disponibilita: "disponibilita",
  competenze: "competenze",
  lingue: "lingue",
  interessi: "interessi",
  autodescrizione: "autodescrizione",
  piano_carriera: "piano_carriera",
};

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
  const approvedCount = BLOCK_ORDER.filter((key) => blocks[key].status === "approved").length;
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
          const block = blocks[blockType];
          const isActive = blockType === activeBlock;

          // Non ancora raggiunto e non è il blocco attivo: non mostrarlo affatto —
          // solo quello su cui MIRA sta facendo domande in questo momento, più i completati.
          if (!isActive && block.status !== "approved") return null;

          if (!isActive && block.status === "approved") {
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
            case "disponibilita":
              return (
                <DisponibilitaBlock
                  key={blockType}
                  proseContent={blocks.disponibilita.data}
                  status={blocks.disponibilita.status}
                  onApproved={() => onApproved("disponibilita")}
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
            case "competenze":
              // Key include i conteggi: durante l'onboarding lo studente non ha mai una modifica
              // manuale in corso su questo blocco (arriva solo via chat), quindi un remount pulito
              // ad ogni nuova hard/soft skill è sicuro e garantisce che il pannello parta sempre
              // dai dati freschi invece di fidarsi del merge interno del componente.
              return (
                <CompetenzeBlock
                  key={`competenze-${blocks.competenze.data.items.length}-${(blocks.competenze.data.soft_skills ?? []).length}`}
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
            case "autodescrizione":
              return (
                <ProseBlock
                  key={blockType}
                  blockType="autodescrizione"
                  title={t("titles.autodescrizione")}
                  testo={blocks.autodescrizione.data.testo}
                  status={blocks.autodescrizione.status}
                  serif
                  placeholder={t("autodescrizionePlaceholder")}
                  onApproved={() => onApproved("autodescrizione")}
                />
              );
            case "interessi":
              return (
                <ProseBlock
                  key={blockType}
                  blockType="interessi"
                  title={t("titles.interessi")}
                  testo={blocks.interessi.data.testo}
                  status={blocks.interessi.status}
                  placeholder={t("interessiPlaceholder")}
                  onApproved={() => onApproved("interessi")}
                />
              );
            case "piano_carriera":
              return (
                <ProseBlock
                  key={blockType}
                  blockType="piano_carriera"
                  title={t("titles.pianoCarriera")}
                  testo={blocks.piano_carriera.data.testo}
                  stato={blocks.piano_carriera.data.stato}
                  status={blocks.piano_carriera.status}
                  placeholder={t("pianoCarrieraPlaceholder")}
                  onApproved={() => onApproved("piano_carriera")}
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
