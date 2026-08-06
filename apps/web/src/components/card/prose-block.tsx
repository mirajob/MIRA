"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { updateCardBlockProseContent } from "@/lib/actions/card-blocks";
import { miraImproveProfilo, miraImprovePiano } from "@/lib/actions/onboarding-flow";
import { CardBlockHeader } from "./card-block-header";
import { MiraImproveButton } from "./mira-improve-button";
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
  /** Tappa dell'onboarding: senza testo non si va avanti, quindi il Conferma resta spento
   * con una riga che spiega perché, invece di sembrare rotto. */
  requireText?: boolean;
  onApproved?: () => void;
}

export function ProseBlock({
  blockType,
  title,
  testo,
  status,
  serif,
  stato,
  intro,
  placeholder,
  requireText,
  onApproved,
}: ProseBlockProps) {
  const t = useTranslations("CardBlocks");
  const [text, setText] = useState(testo ?? "");
  const [statoValue, setStatoValue] = useState<PianoCarrieraStato | undefined>(stato ?? "esplorazione");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) setText(testo ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testo]);
  useEffect(() => {
    if (!dirty && stato) setStatoValue(stato);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stato]);

  async function handleSave() {
    const payload = blockType === "piano_carriera" ? { stato: statoValue, testo: text } : { testo: text };
    await updateCardBlockProseContent(blockType, payload);
    setDirty(false);
  }

  const vuoto = text.trim().length === 0;

  return (
    <div className="rounded-lg border border-border bg-white overflow-hidden">
      <CardBlockHeader
        title={title}
        status={status}
        blockType={blockType}
        approveDisabled={requireText && vuoto}
        onBeforeApprove={handleSave}
        onApproved={onApproved}
      />
      <div className="p-5 space-y-3">
        {intro && <p className="text-body-sm text-ink-secondary italic">{intro}</p>}
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
        {requireText && vuoto && <p className="text-body-sm text-ink-tertiary">{t("prose.requiredHint")}</p>}
        {/* Il Profilo personale (riga autodescrizione) ha la riscrittura AI: lo studente
            scrive come parla, anche in italiano, e MIRA lo trasforma in inglese in prima persona. */}
        {blockType === "autodescrizione" && (
          <MiraImproveButton
            getText={() => text}
            improve={async (raw) => (await miraImproveProfilo({ testo: raw })).testo}
            onImproved={(improved) => {
              setText(improved);
              setDirty(true);
            }}
          />
        )}
        {/* Il piano ha la stessa riscrittura che ha in onboarding dentro il blocco unito:
            senza, modificandolo dal Profilo si perdeva l'aiuto e anche la classificazione
            dello stato (direzione chiara / ipotesi / esplorazione). */}
        {blockType === "piano_carriera" && (
          <MiraImproveButton
            getText={() => text}
            improve={async (raw) => {
              const result = await miraImprovePiano({ testo: raw });
              setStatoValue(result.stato);
              return result.testo;
            }}
            onImproved={(improved) => {
              setText(improved);
              setDirty(true);
            }}
          />
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
