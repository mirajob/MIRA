"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

/**
 * "✦ Migliora con MIRA" — riscrittura AI su richiesta esplicita di un testo libero
 * (inglese, stile card). Con undo: il testo precedente resta ripristinabile finché
 * non si scrive altro, così un risultato deludente non costa nulla.
 */
export function MiraImproveButton({
  disabled,
  getText,
  improve,
  onImproved,
}: {
  disabled?: boolean;
  /** Testo corrente da migliorare (letto al momento del click, non al mount). */
  getText: () => string;
  /** L'azione AI: riceve il testo corrente, torna quello riscritto. */
  improve: (text: string) => Promise<string>;
  /** Applica il risultato (o l'undo) al campo. */
  onImproved: (text: string) => void;
}) {
  const t = useTranslations("OnboardingFlow");
  const [busy, setBusy] = useState(false);
  const [previous, setPrevious] = useState<string | null>(null);

  async function handleClick() {
    const text = getText().trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const improved = await improve(text);
      if (improved && improved !== text) {
        setPrevious(text);
        onImproved(improved);
      }
    } catch (err) {
      console.error("[MIRA] improve failed:", err);
    } finally {
      setBusy(false);
    }
  }

  function handleUndo() {
    if (previous == null) return;
    onImproved(previous);
    setPrevious(null);
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || busy}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-petrol-700 bg-petrol-50 border border-petrol/30 rounded-md px-2.5 py-1.5 hover:bg-petrol-100 transition-colors disabled:opacity-50"
      >
        <span aria-hidden="true">✦</span>
        <span>{busy ? t("improving") : t("improve")}</span>
      </button>
      {previous != null && !busy && (
        <button
          type="button"
          onClick={handleUndo}
          className="text-xs text-ink-tertiary underline underline-offset-2 hover:text-navy transition-colors"
        >
          {t("undoImprove")}
        </button>
      )}
    </span>
  );
}
