"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { SessionForm } from "../session-form";
import type { CycleOption } from "../new-session-panel";

/**
 * La scelta della selezione sta fuori dal modulo: un round appartiene sempre a una
 * selezione precisa, e sbagliarla vuol dire invitare i candidati di un'altra.
 */
export function NewSessionForm({
  associationId,
  slug,
  cycles,
}: {
  associationId: string;
  slug: string;
  cycles: CycleOption[];
}) {
  const t = useTranslations("Interviews");
  const router = useRouter();
  const [cycleId, setCycleId] = useState(cycles[0]?.id ?? "");

  return (
    <div className="space-y-3">
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
        onDone={() => router.push(`/association/${slug}/colloqui`)}
      />
    </div>
  );
}
