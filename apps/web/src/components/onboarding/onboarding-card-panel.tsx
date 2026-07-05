"use client";

import {
  BlockPreviewShell,
  HeaderPreview,
  FormazionePreview,
  EsperienzePreview,
  DisponibilitaPreview,
  CompetenzePreview,
  LinguePreview,
  InteressiPreview,
  AutodescrizionePreview,
  PianoCarrieraPreview,
} from "./block-preview";
import type { OnboardingBlocksState } from "@/lib/actions/chat-onboarding";
import type { CardBlockType } from "@mira/types";

interface OnboardingCardPanelProps {
  blocks: OnboardingBlocksState;
  onConfirm: (blockType: CardBlockType) => void;
  onCorrect: (blockType: CardBlockType) => void;
  confirmingBlock: CardBlockType | null;
}

const BLOCK_ORDER: Array<{ key: keyof OnboardingBlocksState; title: string; blockType: CardBlockType }> = [
  { key: "header", title: "Header", blockType: "header" },
  { key: "disponibilita", title: "Disponibilità", blockType: "disponibilita" },
  { key: "esperienze", title: "Esperienze", blockType: "esperienze" },
  { key: "formazione", title: "Formazione", blockType: "formazione" },
  { key: "competenze", title: "Competenze", blockType: "competenze" },
  { key: "lingue", title: "Lingue", blockType: "lingue" },
  { key: "autodescrizione", title: "Come si descrive", blockType: "autodescrizione" },
  { key: "interessi", title: "Interessi", blockType: "interessi" },
  { key: "piano_carriera", title: "Piano di carriera", blockType: "piano_carriera" },
];

export function OnboardingCardPanel({ blocks, onConfirm, onCorrect, confirmingBlock }: OnboardingCardPanelProps) {
  const approvedCount = BLOCK_ORDER.filter((b) => blocks[b.key].status === "approved").length;
  const progressPct = Math.round((approvedCount / BLOCK_ORDER.length) * 100);

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3 border-b border-border flex items-center gap-3 shrink-0">
        <p className="text-eyebrow text-navy/60 uppercase whitespace-nowrap">La tua MIRA card</p>
        <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-petrol rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-ink tabular-nums">{progressPct}%</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {BLOCK_ORDER.map(({ key, title, blockType }) => {
          const block = blocks[key];
          return (
            <BlockPreviewShell
              key={key}
              title={title}
              status={block.status}
              onConfirm={() => onConfirm(blockType)}
              onCorrect={() => onCorrect(blockType)}
              confirming={confirmingBlock === blockType}
            >
              {key === "header" && <HeaderPreview data={blocks.header.data} />}
              {key === "formazione" && <FormazionePreview items={blocks.formazione.data.items} />}
              {key === "esperienze" && <EsperienzePreview items={blocks.esperienze.data.items} />}
              {key === "disponibilita" && <DisponibilitaPreview data={blocks.disponibilita.data} />}
              {key === "competenze" && <CompetenzePreview items={blocks.competenze.data.items} />}
              {key === "lingue" && <LinguePreview items={blocks.lingue.data.items} />}
              {key === "interessi" && <InteressiPreview data={blocks.interessi.data} />}
              {key === "autodescrizione" && <AutodescrizionePreview data={blocks.autodescrizione.data} />}
              {key === "piano_carriera" && <PianoCarrieraPreview data={blocks.piano_carriera.data} />}
            </BlockPreviewShell>
          );
        })}
      </div>
    </div>
  );
}
