"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  approveAssociationClaimRequest,
  rejectAssociationClaimRequest,
} from "@/lib/actions/association-claim";

export interface ClaimRequestRow {
  id: string;
  associationName: string;
  associationSlug: string;
  requesterName: string | null;
  requesterEmail: string | null;
  requestType: "claim" | "removal";
  roleInAssociation: string | null;
  note: string | null;
}

/**
 * Coda delle richieste di gestione arrivate dalle pagine seminate. Approvare
 * significa consegnare la pagina: il richiedente diventa amministratore
 * dell'associazione, quindi la decisione resta sempre manuale.
 */
export function ClaimRequests({ rows }: { rows: ClaimRequestRow[] }) {
  const t = useTranslations("AdminSeededAssociations");
  const [busyId, setBusyId] = useState<string | null>(null);
  const router = useRouter();

  async function handleApprove(row: ClaimRequestRow) {
    if (!window.confirm(t("claimApproveConfirm", { name: row.associationName }))) return;
    setBusyId(row.id);
    const result = await approveAssociationClaimRequest(row.id);
    if (result.error) window.alert(result.error);
    router.refresh();
    setBusyId(null);
  }

  async function handleReject(row: ClaimRequestRow) {
    const reason = window.prompt(t("claimRejectPrompt"));
    if (reason === null) return;
    setBusyId(row.id);
    const result = await rejectAssociationClaimRequest(row.id, reason);
    if (result.error) window.alert(result.error);
    router.refresh();
    setBusyId(null);
  }

  if (!rows.length) return null;

  return (
    <div className="rounded-lg border border-petrol/30 bg-petrol-50 overflow-hidden">
      <div className="border-b border-petrol/20 px-3 py-1.5">
        <p className="text-eyebrow uppercase text-navy/70">
          {t("claimQueueHeading", { count: rows.length })}
        </p>
      </div>
      <div className="divide-y divide-petrol/20">
        {rows.map((row) => (
          <div key={row.id} className="px-3 py-2.5">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <Link
                href={`/associations/${row.associationSlug}`}
                className="text-body-sm font-medium text-navy hover:underline"
              >
                {row.associationName}
              </Link>
              <span className="text-body-sm text-ink">
                {row.requesterName ?? row.requesterEmail ?? "—"}
              </span>
              {row.roleInAssociation && (
                <span className="text-body-sm text-ink-secondary">{row.roleInAssociation}</span>
              )}
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  row.requestType === "removal"
                    ? "bg-error-bg text-error"
                    : "bg-white text-navy"
                }`}
              >
                {row.requestType === "removal" ? t("claimTypeRemoval") : t("claimTypeClaim")}
              </span>

              <div className="ml-auto flex items-center gap-3">
                {row.requestType === "claim" && (
                  <button
                    onClick={() => handleApprove(row)}
                    disabled={busyId === row.id}
                    className="text-body-sm font-medium text-success hover:underline disabled:opacity-40"
                  >
                    {t("claimApprove")}
                  </button>
                )}
                <button
                  onClick={() => handleReject(row)}
                  disabled={busyId === row.id}
                  className="text-body-sm text-error hover:underline disabled:opacity-40"
                >
                  {t("claimReject")}
                </button>
              </div>
            </div>
            {row.note && <p className="mt-1 text-body-sm text-ink-secondary">{row.note}</p>}
            {row.requesterEmail && row.requesterName && (
              <p className="mt-0.5 text-eyebrow text-ink-tertiary">{row.requesterEmail}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
