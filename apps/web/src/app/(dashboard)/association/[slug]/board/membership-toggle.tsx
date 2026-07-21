"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { setMembershipEnabled } from "@/lib/actions/membership";

export function MembershipToggle({
  associationId,
  enabled,
}: {
  associationId: string;
  enabled: boolean;
}) {
  const t = useTranslations("Membership");
  const [on, setOn] = useState(enabled);
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    const next = !on;
    setOn(next); // ottimistico: il pannello sotto compare/sparisce subito
    startTransition(async () => {
      const res = await setMembershipEnabled(associationId, next);
      if (res?.error) setOn(!next);
    });
  }

  return (
    <div className="rounded-lg border border-border bg-white px-4 py-3 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-body-sm font-semibold text-navy">{t("toggleTitle")}</p>
        <p className="text-eyebrow text-ink-secondary mt-0.5">{t("toggleHint")}</p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={t("toggleTitle")}
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
  );
}
