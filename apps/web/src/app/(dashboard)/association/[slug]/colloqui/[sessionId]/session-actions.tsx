"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { setInterviewSessionStatus, deleteInterviewSession } from "@/lib/actions/interview-sessions";

/**
 * Apri, chiudi, rigenera, elimina. Le azioni che cambiano lo stato di una sessione
 * stanno insieme perché sono tutte irreversibili dal punto di vista di chi ha già
 * prenotato: le protezioni vere però sono server-side, non qui.
 */
export function SessionActions({
  sessionId,
  slug,
  status,
  canManage,
}: {
  sessionId: string;
  slug: string;
  status: "draft" | "open" | "closed";
  canManage: boolean;
}) {
  const t = useTranslations("Interviews");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!canManage) return null;

  async function run(fn: () => Promise<{ error?: string }>) {
    setLoading(true);
    const result = await fn();
    if (result.error) window.alert(result.error);
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {status !== "open" ? (
        <button
          onClick={() => run(() => setInterviewSessionStatus({ sessionId, slug, status: "open" }))}
          disabled={loading}
          className="rounded-md bg-petrol px-4 py-1.5 text-body-sm text-white transition-colors duration-100 hover:bg-petrol-700 disabled:opacity-40"
        >
          {t("openSession")}
        </button>
      ) : (
        <button
          onClick={() => run(() => setInterviewSessionStatus({ sessionId, slug, status: "closed" }))}
          disabled={loading}
          className="rounded-md bg-navy px-4 py-1.5 text-body-sm text-white transition-colors duration-100 hover:bg-navy-700 disabled:opacity-40"
        >
          {t("closeSession")}
        </button>
      )}

      {/* "Rigenera la griglia" e' stato tolto: non si capiva cosa facesse, e la
          griglia si rifa' da sola quando si modifica il round. */}
      <button
        onClick={() => {
          if (!window.confirm(t("deleteConfirm"))) return;
          run(async () => {
            const result = await deleteInterviewSession({ sessionId, slug });
            if (!result.error) router.push(`/association/${slug}/colloqui`);
            return result;
          });
        }}
        disabled={loading}
        className="text-body-sm text-error hover:underline disabled:opacity-40"
      >
        {t("deleteSession")}
      </button>
    </div>
  );
}
