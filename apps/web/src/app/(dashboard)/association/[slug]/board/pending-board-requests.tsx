"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { approveMember, rejectMember } from "@/lib/actions/board";

interface PendingMember {
  id: string;
  title: string | null;
  profile: { full_name: string | null; email: string };
}

export function PendingBoardRequests({
  requests,
  associationId,
}: {
  requests: PendingMember[];
  associationId: string;
}) {
  const t = useTranslations("Board");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  async function handle(membershipId: string, approve: boolean) {
    setProcessingId(membershipId);
    if (approve) await approveMember(associationId, membershipId);
    else await rejectMember(associationId, membershipId);
    setDismissed((prev) => new Set(prev).add(membershipId));
    setProcessingId(null);
  }

  const visible = requests.filter((r) => !dismissed.has(r.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="font-sans text-body font-semibold text-navy">
        {t("pendingHeading", { count: visible.length })}
      </h3>

      <div className="overflow-hidden rounded-lg border border-amber-200 bg-amber-50">
        {visible.map((req) => (
          <div
            key={req.id}
            className="flex items-center gap-3 border-b border-amber-200 px-3 py-2 last:border-0"
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-200 text-eyebrow font-semibold text-amber-800">
              {(req.profile.full_name ?? req.profile.email).charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-body-sm font-medium text-navy">
                {req.profile.full_name ?? req.profile.email}
                {req.title && <span className="ml-2 font-normal text-ink-tertiary">{req.title}</span>}
              </p>
              <p className="truncate text-eyebrow text-ink-tertiary">{req.profile.email}</p>
            </div>

            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => handle(req.id, true)}
                disabled={processingId === req.id}
                className="rounded-md bg-navy px-3 py-1.5 text-body-sm font-medium text-white hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100 disabled:opacity-40"
              >
                {t("approve")}
              </button>
              <button
                onClick={() => handle(req.id, false)}
                disabled={processingId === req.id}
                className="rounded-md border border-border px-3 py-1.5 text-body-sm font-medium text-ink-secondary transition-colors duration-100 hover:border-error hover:text-error disabled:opacity-40"
              >
                {t("reject")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
