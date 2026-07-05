"use client";

import { useState } from "react";
import { generatePathwayAnalysis } from "@/lib/actions/pathway";

export function GeneratePathwayButton({
  userId,
  isRegenerate,
}: {
  userId: string;
  isRegenerate?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    await generatePathwayAnalysis(userId);
    setLoading(false);
    window.location.reload();
  }

  if (isRegenerate) {
    return (
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="text-body-sm text-petrol hover:text-petrol-700 disabled:opacity-40 transition-colors"
      >
        {loading ? "Aggiornamento..." : "Aggiorna analisi"}
      </button>
    );
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={loading}
      className="bg-navy text-white px-5 py-2.5 rounded-md text-label hover:bg-navy-700 disabled:opacity-40 transition-colors"
    >
      {loading ? "MIRA sta analizzando il tuo percorso..." : "Genera i tuoi prossimi passi"}
    </button>
  );
}
