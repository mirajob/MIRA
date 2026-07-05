"use client";

import { HeaderBlock } from "@/components/card/header-block";
import { DisponibilitaBlock } from "@/components/card/disponibilita-block";
import { EsperienzeBlock } from "@/components/card/esperienze-block";
import { FormazioneBlock } from "@/components/card/formazione-block";
import { CompetenzeBlock } from "@/components/card/competenze-block";
import { LingueBlock } from "@/components/card/lingue-block";
import { ProseBlock } from "@/components/card/prose-block";
import type { OnboardingBlocksState } from "@/lib/actions/chat-onboarding";
import type { CardBlockType } from "@mira/types";

interface OnboardingCardPanelProps {
  blocks: OnboardingBlocksState;
  /** Chiamato dopo che uno dei componenti Step 2 ha già approvato il blocco lato server. */
  onApproved: (blockType: CardBlockType) => void;
}

const BLOCK_ORDER: CardBlockType[] = [
  "header",
  "disponibilita",
  "esperienze",
  "formazione",
  "competenze",
  "lingue",
  "autodescrizione",
  "interessi",
  "piano_carriera",
];

export function OnboardingCardPanel({ blocks, onApproved }: OnboardingCardPanelProps) {
  const approvedCount = BLOCK_ORDER.filter((key) => blocks[key].status === "approved").length;
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
        <HeaderBlock
          proseContent={blocks.header.data}
          visibility={blocks.header.visibility}
          status={blocks.header.status}
          onApproved={() => onApproved("header")}
        />
        <DisponibilitaBlock
          proseContent={blocks.disponibilita.data}
          status={blocks.disponibilita.status}
          onApproved={() => onApproved("disponibilita")}
        />
        <EsperienzeBlock
          items={blocks.esperienze.data.items}
          status={blocks.esperienze.status}
          onApproved={() => onApproved("esperienze")}
        />
        <FormazioneBlock
          items={blocks.formazione.data.items}
          status={blocks.formazione.status}
          onApproved={() => onApproved("formazione")}
        />
        <CompetenzeBlock
          items={blocks.competenze.data.items}
          status={blocks.competenze.status}
          onApproved={() => onApproved("competenze")}
        />
        <LingueBlock
          items={blocks.lingue.data.items}
          status={blocks.lingue.status}
          onApproved={() => onApproved("lingue")}
        />
        <ProseBlock
          blockType="autodescrizione"
          title="Come si descrive"
          testo={blocks.autodescrizione.data.testo}
          status={blocks.autodescrizione.status}
          serif
          placeholder="Racconta chi sei, con parole tue..."
          onApproved={() => onApproved("autodescrizione")}
        />
        <ProseBlock
          blockType="interessi"
          title="Interessi"
          testo={blocks.interessi.data.testo}
          status={blocks.interessi.status}
          placeholder="I tuoi interessi professionali e personali..."
          onApproved={() => onApproved("interessi")}
        />
        <ProseBlock
          blockType="piano_carriera"
          title="Piano di carriera"
          testo={blocks.piano_carriera.data.testo}
          stato={blocks.piano_carriera.data.stato}
          status={blocks.piano_carriera.status}
          placeholder="Come ti vedi nei prossimi 1-2 anni?"
          onApproved={() => onApproved("piano_carriera")}
        />
      </div>
    </div>
  );
}
