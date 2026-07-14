"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { updateCardBlockProseContent } from "@/lib/actions/card-blocks";
import { CardBlockHeader } from "./card-block-header";
import type { CardBlockStatus, PianoCarrieraStato } from "@mira/types";

interface ProseBlockProps {
  blockType: "autodescrizione" | "interessi" | "piano_carriera";
  title: string;
  testo: string | null;
  status: CardBlockStatus;
  serif?: boolean;
  stato?: PianoCarrieraStato;
  intro?: string;
  placeholder?: string;
  onApproved?: () => void;
}

/** Limiti one-page: la card documento ha spazio fisso, i testi devono restare sintetici.
 * `autodescrizione` ora ospita il Profilo personale (interessi + autodescrizione uniti,
 * card rework 2026-07): limite più alto, ma sempre compatibile col foglio A4 (dubbio 38). */
const MAX_LENGTHS: Record<ProseBlockProps["blockType"], number> = {
  autodescrizione: 900,
  interessi: 450,
  piano_carriera: 450,
};

export function ProseBlock({ blockType, title, testo, status, serif, stato, intro, placeholder, onApproved }: ProseBlockProps) {
  const t = useTranslations("CardBlocks");
  const c = useTranslations("Common");
  const [text, setText] = useState(testo ?? "");
  const [statoValue, setStatoValue] = useState<PianoCarrieraStato | undefined>(stato ?? "esplorazione");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!dirty) setText(testo ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testo]);
  useEffect(() => {
    if (!dirty && stato) setStatoValue(stato);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stato]);

  async function handleSave() {
    setSaving(true);
    const payload = blockType === "piano_carriera" ? { stato: statoValue, testo: text } : { testo: text };
    await updateCardBlockProseContent(blockType, payload);
    setSaving(false);
    setDirty(false);
  }

  return (
    <div className="rounded-lg border border-border bg-white overflow-hidden">
      <CardBlockHeader title={title} status={status} blockType={blockType} onApproved={onApproved} />
      <div className="p-5 space-y-3">
        {intro && <p className="text-body-sm text-ink-secondary italic">{intro}</p>}
        <textarea
          value={text}
          placeholder={placeholder}
          maxLength={MAX_LENGTHS[blockType]}
          onChange={(e) => {
            setText(e.target.value);
            setDirty(true);
          }}
          rows={4}
          className={`w-full px-3 py-2 rounded-md border border-border text-body text-ink focus:outline-none focus:ring-1 focus:ring-petrol/30 ${
            serif ? "font-display" : ""
          }`}
        />
        <p className="text-right text-xs text-ink-tertiary">{text.length}/{MAX_LENGTHS[blockType]}</p>
        {dirty && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-body-sm font-medium text-white bg-petrol rounded-md px-4 py-2 hover:bg-petrol-700 transition-colors disabled:opacity-50"
          >
            {saving ? c("saving") : c("save")}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Resa di sola lettura, riusata dal Profilo (default) e dalla vista associazione/azienda.
 * `stato` (piano_carriera) non è più mostrato come categoria separata — resta solo un dato
 * interno, il concetto (magistrale/lavoro/esplorazione) vive dentro il testo stesso.
 */
export function ProseView({
  title,
  testo,
  serif,
}: {
  title: string;
  testo: string | null;
  stato?: PianoCarrieraStato;
  serif?: boolean;
}) {
  const t = useTranslations("CardBlocks");
  return (
    <div className="p-4">
      <p className="text-eyebrow text-navy/60 uppercase mb-2">{title}</p>
      {testo ? (
        <p className={`text-body-sm text-ink ${serif ? "font-display italic" : ""}`}>{testo}</p>
      ) : (
        <p className="text-body-sm text-ink-tertiary italic">{t("prose.notSpecified")}</p>
      )}
    </div>
  );
}
