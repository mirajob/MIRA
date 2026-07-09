"use client";

import { useState } from "react";
import { evaluateCandidate } from "@/lib/actions/candidates";
import { useRouter } from "next/navigation";

export function RegenerateEvaluationButton({ applicationId }: { applicationId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    setError(null);
    const result = await evaluateCandidate(applicationId);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-border bg-white p-5 space-y-2">
      <p className="text-body-sm text-ink-secondary">La valutazione AI non è ancora disponibile.</p>
      {error && <p className="text-body-sm text-error">{error}</p>}
      <button
        onClick={handleClick}
        disabled={loading}
        className="text-body-sm text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700 disabled:opacity-40"
      >
        {loading ? "Generazione in corso..." : "Genera valutazione"}
      </button>
    </div>
  );
}
