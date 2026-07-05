"use client";

import {
  BlockPreviewShell,
  HeaderPreview,
  FormazionePreview,
  EsperienzePreview,
  DisponibilitaPreview,
} from "./block-preview";
import type { FaseABlocksState } from "@/lib/actions/chat-onboarding";
import type { CardBlockType } from "@mira/types";

interface OnboardingCardPanelProps {
  blocks: FaseABlocksState;
  onConfirm: (blockType: CardBlockType) => void;
  onCorrect: (blockType: CardBlockType) => void;
  confirmingBlock: CardBlockType | null;
}

const BLOCK_ORDER: Array<{ key: keyof FaseABlocksState; title: string; blockType: CardBlockType }> = [
  { key: "header", title: "Header", blockType: "header" },
  { key: "formazione", title: "Formazione", blockType: "formazione" },
  { key: "esperienze", title: "Esperienze", blockType: "esperienze" },
  { key: "disponibilita", title: "Disponibilità", blockType: "disponibilita" },
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
            </BlockPreviewShell>
          );
        })}
      </div>
    </div>
  );
}
