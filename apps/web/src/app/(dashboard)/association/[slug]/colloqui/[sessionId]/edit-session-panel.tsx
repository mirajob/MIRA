"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { SessionForm, type SessionInitialValues } from "../session-form";

/**
 * Il pulsante "Modifica" sopra il round e il form che apre, precompilato con
 * quello che c'è già. Riusa lo stesso form della creazione: due form separati per
 * gli stessi campi divergono al primo cambiamento.
 */
export function EditSessionPanel({
  associationId,
  slug,
  cycleId,
  sessionId,
  initial,
}: {
  associationId: string;
  slug: string;
  cycleId: string;
  sessionId: string;
  initial: SessionInitialValues;
}) {
  const t = useTranslations("Interviews");
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-body-sm font-medium text-navy hover:underline"
      >
        {t("editSession")}
      </button>
    );
  }

  return (
    <div className="w-full">
      <SessionForm
        associationId={associationId}
        slug={slug}
        cycleId={cycleId}
        sessionId={sessionId}
        initial={initial}
        onDone={() => setOpen(false)}
      />
    </div>
  );
}
