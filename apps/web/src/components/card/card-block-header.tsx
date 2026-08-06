"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { approveCardBlock } from "@/lib/actions/card-blocks";
import { useEditingSection } from "./editing-section-context";
import type { CardBlockStatus, CardBlockType } from "@mira/types";

export function CardBlockHeader({
  title,
  status,
  blockType,
  alsoApprove,
  approveDisabled,
  onBeforeApprove,
  onApproved,
}: {
  title: string;
  status: CardBlockStatus;
  blockType: CardBlockType;
  /** Blocchi approvati insieme a questo con un solo Conferma (es. Formazione dentro Header). */
  alsoApprove?: CardBlockType[];
  /** Blocca il Conferma quando il blocco non ha ancora niente da confermare: senza questo,
   * premerlo a vuoto sembrava non fare nulla e la tappa non avanzava mai. */
  approveDisabled?: boolean;
  /** Eseguito PRIMA dell'approvazione: gli editor lo usano per salvare le modifiche in corso,
   * così Conferma = salva + approva in un colpo solo (mai perdere campi non ancora salvati). */
  onBeforeApprove?: () => Promise<void>;
  /** Onboarding only: reagisce a un Conferma riuscito (es. per far avanzare la fase). Sul Profilo resta undefined. */
  onApproved?: () => void;
}) {
  const t = useTranslations("CardBlocks");
  const [pending, startTransition] = useTransition();
  const [localStatus, setLocalStatus] = useState(status);
  // Presente solo dentro il Profilo: lì lo stesso pulsante richiude la sezione in modifica.
  const editingSection = useEditingSection();

  // Questo componente non viene rimontato tra un resync e l'altro nel pannello onboarding
  // (stessa posizione nell'albero React): senza questo effetto, localStatus resterebbe
  // bloccato al valore del primissimo mount ("empty") anche quando il server passa a "draft" —
  // il bottone Conferma non comparirebbe mai finché non si ricarica l'intera pagina.
  useEffect(() => {
    setLocalStatus(status);
  }, [status]);

  function handleApprove() {
    startTransition(async () => {
      try {
        await onBeforeApprove?.();
        await approveCardBlock(alsoApprove ? [blockType, ...alsoApprove] : blockType);
        setLocalStatus("approved");
        onApproved?.();
        editingSection?.close();
      } catch (err) {
        console.error("[MIRA] approve failed:", err);
      }
    });
  }

  return (
    // Wrap e non overflow: nel masthead del Profilo questo blocco vive in una colonna
    // stretta, e con il titolo lungo il bottone Conferma finiva fuori dalla card.
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-5 py-3 border-b border-border">
      <h2 className="min-w-0 font-sans text-h3 text-navy">{title}</h2>
      <div className="flex shrink-0 items-center gap-3">
        {localStatus === "approved" && (
          <span className="text-xs px-2 py-0.5 rounded bg-success-bg text-success font-medium">{t("approved")}</span>
        )}
        {localStatus === "draft" && (
          <span className="text-xs px-2 py-0.5 rounded bg-warning-bg text-warning font-medium">{t("pendingConfirmation")}</span>
        )}
        {/* Un solo pulsante per blocco (rework 2026-07-31): il "Salva" separato dentro i
            blocchi è stato tolto perché due pulsanti facevano credere che Conferma non
            salvasse. Conferma = salva + approva; su un blocco già confermato la stessa
            azione resta l'unico modo per salvare le modifiche successive, quindi cambia
            solo etichetta e non fa retrocedere lo stato. */}
        {onBeforeApprove && (
          <button
            onClick={handleApprove}
            disabled={pending || approveDisabled}
            className="text-xs font-medium text-white bg-petrol rounded-md px-3 py-1.5 hover:bg-petrol-700 transition-colors disabled:opacity-50"
          >
            {localStatus === "approved" ? t("saveChanges") : t("confirm")}
          </button>
        )}
      </div>
    </div>
  );
}
