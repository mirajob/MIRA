"use client";

import { useState } from "react";
import { updateCycleStatus } from "@/lib/actions/cycles";

interface Props {
  associationId: string;
  cycleId: string;
  currentStatus: string;
}

export function CycleStatusButton({ associationId, cycleId, currentStatus }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleClose() {
    setLoading(true);
    await updateCycleStatus(associationId, cycleId, "closed");
    setLoading(false);
    setConfirming(false);
  }

  if (currentStatus === "draft") {
    return (
      <button
        onClick={async () => { setLoading(true); await updateCycleStatus(associationId, cycleId, "open"); setLoading(false); }}
        disabled={loading}
        className="bg-navy text-white px-3 py-1.5 rounded-md text-body-sm hover:bg-navy-700 transition-colors disabled:opacity-40"
      >
        Apri
      </button>
    );
  }

  if (currentStatus === "open") {
    if (confirming) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs text-error">Sei sicuro?</span>
          <button
            onClick={handleClose}
            disabled={loading}
            className="px-3 py-1.5 rounded-md text-body-sm bg-error text-white hover:bg-error/80 transition-colors disabled:opacity-40"
          >
            {loading ? "..." : "Conferma"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="px-2 py-1.5 text-body-sm text-ink-secondary hover:text-navy"
          >
            Annulla
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-body-sm text-ink-tertiary hover:text-error px-3 py-1.5 transition-colors"
      >
        Chiudi
      </button>
    );
  }

  return null;
}
