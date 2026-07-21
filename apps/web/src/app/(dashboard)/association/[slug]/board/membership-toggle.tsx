"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { setMembershipEnabled } from "@/lib/actions/membership";

/**
 * La spiegazione sta SOPRA l'interruttore ed e' completa gia' da spento: si deve capire
 * cosa si ottiene attivando prima di attivare, non dopo.
 */
export function MembershipToggle({
  associationId,
  enabled,
}: {
  associationId: string;
  enabled: boolean;
}) {
  const t = useTranslations("Board");
  const [on, setOn] = useState(enabled);
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    const next = !on;
    setOn(next);
    startTransition(async () => {
      const res = await setMembershipEnabled(associationId, next);
      if (res?.error) setOn(!next); // ripristina se il salvataggio fallisce
    });
  }

  return (
    <div
      className={`rounded-lg border p-4 transition-colors duration-150 ${
        on ? "border-petrol/30 bg-petrol-50" : "border-border bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-body-sm font-semibold text-navy">{t("membershipTitle")}</p>

        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={t("membershipTitle")}
          onClick={handleToggle}
          disabled={pending}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-150 disabled:opacity-50 ${
            on ? "bg-petrol" : "bg-navy-100"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-150 ${
              on ? "translate-x-[22px]" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      <p className="mt-1 text-body-sm text-ink-secondary">
        {on ? t("membershipBodyOn") : t("membershipBodyOff")}
      </p>
    </div>
  );
}
