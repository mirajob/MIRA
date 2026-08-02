"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { deleteInterviewSession } from "@/lib/actions/interview-sessions";

/**
 * Le azioni sul round.
 *
 * "Apri le prenotazioni" e "Chiudi" sono state tolte: le date le hai già messe e
 * decidi tu chi invitare, quindi l'invito È l'apertura. Lo stato del round si
 * legge dai fatti, non da un interruttore in più da ricordarsi di premere.
 */
export function SessionActions({
  sessionId,
  slug,
  canManage,
}: {
  sessionId: string;
  slug: string;
  canManage: boolean;
}) {
  const t = useTranslations("Interviews");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!canManage) return null;

  return (
    <button
      onClick={async () => {
        if (!window.confirm(t("deleteConfirm"))) return;
        setLoading(true);
        const result = await deleteInterviewSession({ sessionId, slug });
        if (result.error) {
          window.alert(result.error);
          setLoading(false);
          return;
        }
        router.push(`/association/${slug}/colloqui`);
      }}
      disabled={loading}
      className="text-body-sm text-error hover:underline disabled:opacity-40"
    >
      {t("deleteSession")}
    </button>
  );
}
