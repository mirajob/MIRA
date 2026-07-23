"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { startCycleBuild } from "@/lib/actions/cycle-card";

/**
 * Schermata d'ingresso al nuovo ciclo: MIRA spiega cosa sta per succedere e la bozza nasce
 * solo quando il board conferma. Serve anche a evitare che il prefetch del link crei cicli
 * fantasma a ogni passaggio del mouse.
 */
export function StartCycleCard({ associationId, slug }: { associationId: string; slug: string }) {
  const t = useTranslations("CycleCard");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setBusy(true);
    setError(null);
    const result = await startCycleBuild(associationId);
    if (result?.error || !result?.cycleId) {
      setError(result?.error ?? t("startError"));
      setBusy(false);
      return;
    }
    router.push(`/association/${slug}/cycles/${result.cycleId}`);
  }

  return (
    <div className="mx-auto max-w-reading space-y-4">
      <div className="rounded-lg border border-petrol/25 bg-petrol-50/60 px-4 py-3">
        <p className="text-eyebrow text-petrol uppercase mb-1.5 flex items-center gap-1.5">
          <span aria-hidden="true">✦</span> MIRA
        </p>
        <p className="text-body text-ink whitespace-pre-wrap">{t("startIntro")}</p>
      </div>

      <div className="rounded-lg border border-border bg-white px-5 py-4">
        <ol className="space-y-1.5 list-decimal list-inside">
          {["nome", "descrizione", "date", "posizioni", "profilo", "domande"].map((block) => (
            <li key={block} className="text-body text-ink-secondary">
              {t(`blocks.${block}`)}
            </li>
          ))}
        </ol>
        {error && <p className="mt-3 text-body-sm text-error">{error}</p>}
        <button
          onClick={handleStart}
          disabled={busy}
          className="mt-4 bg-navy text-white px-4 py-2 rounded-md text-body-sm hover:bg-navy-700 transition-colors duration-100 disabled:opacity-40"
        >
          {busy ? t("starting") : t("startButton")}
        </button>
      </div>
    </div>
  );
}
