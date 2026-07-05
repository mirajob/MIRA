"use client";

import { useEffect, useState, useTransition } from "react";
import { approveCardBlock } from "@/lib/actions/card-blocks";
import type { CardBlockStatus, CardBlockType } from "@mira/types";

export function CardBlockHeader({
  title,
  status,
  blockType,
  alsoApprove,
  onApproved,
}: {
  title: string;
  status: CardBlockStatus;
  blockType: CardBlockType;
  /** Blocchi approvati insieme a questo con un solo Conferma (es. Formazione dentro Header). */
  alsoApprove?: CardBlockType[];
  /** Onboarding only: reagisce a un Conferma riuscito (es. per far avanzare la fase). Sul Profilo resta undefined. */
  onApproved?: () => void;
}) {
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
    setLocalStatus("approved");
    startTransition(async () => {
      await approveCardBlock(alsoApprove ? [blockType, ...alsoApprove] : blockType);
      onApproved?.();
    });
  }

  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-border">
      <h2 className="font-sans text-h3 text-navy">{title}</h2>
      <div className="flex items-center gap-3">
        {localStatus === "approved" && (
          <span className="text-xs px-2 py-0.5 rounded bg-success-bg text-success font-medium">Approvato</span>
        )}
        {localStatus === "draft" && (
          <>
            <span className="text-xs px-2 py-0.5 rounded bg-warning-bg text-warning font-medium">Da confermare</span>
            <button
              onClick={handleApprove}
              disabled={pending}
              className="text-xs font-medium text-white bg-petrol rounded-md px-3 py-1.5 hover:bg-petrol-700 transition-colors disabled:opacity-50"
            >
              Conferma
            </button>
          </>
        )}
      </div>
    </div>
  );
}
