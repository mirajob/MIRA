"use client";

import { useState } from "react";
import { updateCardBlockProseContent } from "@/lib/actions/card-blocks";
import { CardBlockHeader } from "./card-block-header";
import type { CardBlockStatus, PianoCarrieraStato } from "@mira/types";

const STATO_LABELS: Record<PianoCarrieraStato, string> = {
  direzione_chiara: "Direzione chiara",
  ipotesi: "Alcune ipotesi",
  esplorazione: "In esplorazione",
};

interface ProseBlockProps {
  blockType: "autodescrizione" | "interessi" | "piano_carriera";
  title: string;
  testo: string | null;
  status: CardBlockStatus;
  serif?: boolean;
  stato?: PianoCarrieraStato;
  intro?: string;
  placeholder?: string;
}

export function ProseBlock({ blockType, title, testo, status, serif, stato, intro, placeholder }: ProseBlockProps) {
  const [text, setText] = useState(testo ?? "");
  const [statoValue, setStatoValue] = useState<PianoCarrieraStato | undefined>(stato ?? "esplorazione");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const payload = blockType === "piano_carriera" ? { stato: statoValue, testo: text } : { testo: text };
    await updateCardBlockProseContent(blockType, payload);
    setSaving(false);
    setDirty(false);
  }

  return (
    <div className="rounded-lg border border-border bg-white overflow-hidden">
      <CardBlockHeader title={title} status={status} blockType={blockType} />
      <div className="p-5 space-y-3">
        {intro && <p className="text-body-sm text-ink-secondary italic">{intro}</p>}
        {blockType === "piano_carriera" && (
          <div className="flex flex-wrap gap-2">
            {(Object.keys(STATO_LABELS) as PianoCarrieraStato[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setStatoValue(s);
                  setDirty(true);
                }}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  statoValue === s ? "bg-petrol text-white border-petrol" : "border-border text-ink-secondary"
                }`}
              >
                {STATO_LABELS[s]}
              </button>
            ))}
          </div>
        )}
        <textarea
          value={text}
          placeholder={placeholder}
          onChange={(e) => {
            setText(e.target.value);
            setDirty(true);
          }}
          rows={4}
          className={`w-full px-3 py-2 rounded-md border border-border text-body text-ink focus:outline-none focus:ring-1 focus:ring-petrol/30 ${
            serif ? "font-display" : ""
          }`}
        />
        {dirty && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-body-sm font-medium text-white bg-petrol rounded-md px-4 py-2 hover:bg-petrol-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Salvataggio..." : "Salva"}
          </button>
        )}
      </div>
    </div>
  );
}
