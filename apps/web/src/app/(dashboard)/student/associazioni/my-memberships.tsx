"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { leaveAssociation } from "@/lib/actions/board";

interface MembershipRow {
  associationId: string;
  name: string;
}

/**
 * Blocco compatto "Associazioni di cui sei membro".
 *
 * E' l'unico riscontro che lo studente riceve di essere stato accettato: la membership
 * non compare sulla MiraCard ne' sulla pagina pubblica (scelta esplicita del founder).
 * Senza questo blocco, chi entra col codice non saprebbe mai di essere dentro.
 */
export function MyMemberships({ memberships }: { memberships: MembershipRow[] }) {
  const t = useTranslations("Associazioni");
  const [pending, startTransition] = useTransition();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [left, setLeft] = useState<Set<string>>(new Set());

  function handleLeave(associationId: string) {
    setConfirmId(null);
    startTransition(async () => {
      const res = await leaveAssociation(associationId);
      if (!res?.error) setLeft((prev) => new Set(prev).add(associationId));
    });
  }

  const visible = memberships.filter((m) => !left.has(m.associationId));
  if (visible.length === 0) return null;

  return (
    <div>
      <p className="text-eyebrow uppercase text-navy/70 mb-1.5">{t("myMembershipsHeading")}</p>

      <div className="rounded-lg border border-border bg-white overflow-hidden">
        {visible.map((m) => (
          <div
            key={m.associationId}
            className="flex items-center gap-3 border-b border-border last:border-0 px-3 py-2"
          >
            <p className="min-w-0 flex-1 truncate text-body-sm font-medium text-navy">{m.name}</p>

            {confirmId === m.associationId ? (
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-eyebrow text-error">{t("leaveConfirm")}</span>
                <button
                  onClick={() => handleLeave(m.associationId)}
                  disabled={pending}
                  className="text-eyebrow font-medium text-error disabled:opacity-40"
                >
                  {t("leaveYes")}
                </button>
                <button
                  onClick={() => setConfirmId(null)}
                  className="text-eyebrow text-ink-secondary"
                >
                  {t("leaveNo")}
                </button>
              </span>
            ) : (
              <span className="flex shrink-0 items-center gap-3">
                <span className="rounded-full bg-navy-50 px-2 py-0.5 text-eyebrow text-navy/70">
                  {t("memberBadge")}
                </span>
                <button
                  onClick={() => setConfirmId(m.associationId)}
                  className="text-eyebrow text-ink-tertiary hover:text-error"
                >
                  {t("leave")}
                </button>
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
