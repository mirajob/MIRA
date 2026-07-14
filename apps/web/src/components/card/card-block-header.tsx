"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { approveCardBlock } from "@/lib/actions/card-blocks";
import type { CardBlockStatus, CardBlockType } from "@mira/types";

export function CardBlockHeader({
  title,
  status,
  blockType,
  alsoApprove,
  onBeforeApprove,
  onApproved,
}: {
  title: string;
  status: CardBlockStatus;
  blockType: CardBlockType;
  /** Blocchi approvati insieme a questo con un solo Conferma (es. Formazione dentro Header). */
  alsoApprove?: CardBlockType[];
  /** Eseguito PRIMA dell'approvazione: gli editor lo usano per salvare le modifiche in corso,
   * così Conferma = salva + approva in un colpo solo (mai perdere campi non ancora salvati). */
  onBeforeApprove?: () => Promise<void>;
  /** Onboarding only: reagisce a un Conferma riuscito (es. per far avanzare la fase). Sul Profilo resta undefined. */
  onApproved?: () => void;
}) {
  const t = useTranslations("CardBlocks");
  const [pending, startTransition] = useTransition();
  const [localStatus, setLocalStatus] = useState(status);

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
      } catch (err) {
        console.error("[MIRA] approve failed:", err);
      }
    });
  }

  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-border">
      <h2 className="font-sans text-h3 text-navy">{title}</h2>
      <div className="flex items-center gap-3">
        {localStatus === "approved" && (
          <span className="text-xs px-2 py-0.5 rounded bg-success-bg text-success font-medium">{t("approved")}</span>
        )}
        {localStatus === "draft" && (
          <span className="text-xs px-2 py-0.5 rounded bg-warning-bg text-warning font-medium">{t("pendingConfirmation")}</span>
        )}
        {/* Conferma = salva + approva. Visibile anche su blocco ancora "empty" quando c'è un
            editor con salvataggio (onBeforeApprove): nel flusso form-first lo studente compila
            i campi e preme direttamente Conferma, senza un passaggio "Salva" obbligato. */}
        {(localStatus === "draft" || (localStatus === "empty" && onBeforeApprove)) && (
          <button
            onClick={handleApprove}
            disabled={pending}
            className="text-xs font-medium text-white bg-petrol rounded-md px-3 py-1.5 hover:bg-petrol-700 transition-colors disabled:opacity-50"
          >
            {t("confirm")}
          </button>
        )}
      </div>
    </div>
  );
}
