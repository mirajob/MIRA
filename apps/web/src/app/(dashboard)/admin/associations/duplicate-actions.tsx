"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { mergeDuplicateAssociation, dismissDuplicateLink } from "@/lib/actions/association-claim";

/**
 * L'avviso "questa pagina somiglia a una che abbiamo già" sulla riga di una richiesta.
 *
 * Unire tiene la pagina scritta da MIRA (testi a mano, slug già pubblico), rende
 * amministratore chi aveva creato il doppione e cancella la pagina doppia. È un'azione
 * distruttiva e chiede sempre conferma.
 */
export function DuplicateActions({
  associationId,
  associationName,
  targetId,
  targetName,
  targetSlug,
}: {
  associationId: string;
  associationName: string;
  targetId: string;
  targetName: string;
  targetSlug: string;
}) {
  const t = useTranslations("AdminAssociations");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function handleMerge() {
    if (!window.confirm(t("duplicateMergeConfirm", { duplicate: associationName, target: targetName }))) return;
    setBusy(true);
    const result = await mergeDuplicateAssociation({ duplicateId: associationId, targetId });
    if (result.error) window.alert(result.error);
    router.refresh();
    setBusy(false);
  }

  async function handleDismiss() {
    setBusy(true);
    const result = await dismissDuplicateLink(associationId);
    if (result.error) window.alert(result.error);
    router.refresh();
    setBusy(false);
  }

  return (
    <div className="mt-1 rounded-md border border-warning/40 bg-warning-bg px-2 py-1.5">
      <p className="text-body-sm text-warning">
        {t("duplicateWarning")}{" "}
        <Link
          href={`/student/associazioni/${targetSlug}`}
          className="font-medium underline underline-offset-2"
        >
          {targetName}
        </Link>
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <button
          onClick={handleMerge}
          disabled={busy}
          className="text-body-sm font-medium text-petrol hover:text-petrol-700 transition-colors disabled:opacity-40"
        >
          {t("duplicateMergeCta")}
        </button>
        <button
          onClick={handleDismiss}
          disabled={busy}
          className="text-body-sm text-ink-secondary hover:text-navy transition-colors disabled:opacity-40"
        >
          {t("duplicateDismissCta")}
        </button>
      </div>
    </div>
  );
}
