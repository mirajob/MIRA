"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { SessionForm } from "./session-form";

export interface CycleOption {
  id: string;
  title: string;
}

/**
 * Il bottone "nuova sessione" e la scelta del ciclo a cui appartiene. La scelta sta
 * qui e non dentro il form perché un round di colloqui è sempre di un ciclo preciso,
 * e sbagliarlo significa invitare i candidati di una selezione all'altra.
 */
export function NewSessionPanel({
  associationId,
  slug,
  cycles,
}: {
  associationId: string;
  slug: string;
  cycles: CycleOption[];
}) {
  const t = useTranslations("Interviews");
  const [open, setOpen] = useState(false);
  const [cycleId, setCycleId] = useState(cycles[0]?.id ?? "");

  if (!cycles.length) {
    return (
      <div className="rounded-lg border border-border bg-white px-4 py-3">
        <p className="text-body-sm text-ink-secondary">{t("noCycles")}</p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-navy px-4 py-1.5 text-body-sm text-white transition-colors duration-100 hover:bg-navy-700"
      >
        {t("newSessionCta")}
      </button>
    );
  }

  return (
    <div className="space-y-2">
      {cycles.length > 1 && (
        <label className="block">
          <span className="mb-1 block text-eyebrow uppercase text-navy/60">{t("cycleLabel")}</span>
          <select
            value={cycleId}
            onChange={(e) => setCycleId(e.target.value)}
            className="w-full rounded-md border border-border px-3 py-1.5 text-body-sm text-ink focus:border-petrol focus:outline-none"
          >
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
      )}

      <SessionForm
        associationId={associationId}
        slug={slug}
        cycleId={cycleId}
        onDone={() => setOpen(false)}
      />
    </div>
  );
}
