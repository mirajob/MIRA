"use client";

import { useState } from "react";
import { approveBoardMember, rejectBoardMember } from "@/lib/actions/board";

interface PendingMember {
  id: string;
  role: string;
  title: string | null;
  permissions: Record<string, boolean>;
  profile: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

export function PendingBoardRequests({
  requests,
  associationId,
}: {
  requests: PendingMember[];
  associationId: string;
}) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  async function handleApprove(membershipId: string) {
    setProcessingId(membershipId);
    await approveBoardMember(associationId, membershipId);
    setDismissed((prev) => new Set(prev).add(membershipId));
    setProcessingId(null);
  }

  async function handleReject(membershipId: string) {
    setProcessingId(membershipId);
    await rejectBoardMember(associationId, membershipId);
    setDismissed((prev) => new Set(prev).add(membershipId));
    setProcessingId(null);
  }

  const visible = requests.filter((r) => !dismissed.has(r.id));
  if (visible.length === 0) return null;

  return (
    <div>
      <h3 className="font-sans text-h3 text-navy mb-3">
        Richieste board in attesa ({visible.length})
      </h3>
      <div className="space-y-3">
        {visible.map((req) => (
          <div
            key={req.id}
            className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-center justify-between gap-4 flex-wrap"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-200 text-amber-800 text-label font-semibold">
                {(req.profile.full_name ?? req.profile.email).charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-body font-medium text-navy">
                  {req.profile.full_name ?? req.profile.email}
                </p>
                <p className="text-body-sm text-ink-secondary">
                  {req.profile.email}
                  {req.title && ` · ${req.title}`}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleApprove(req.id)}
                disabled={processingId === req.id}
                className="bg-navy text-white px-4 py-2 rounded-md text-body-sm font-medium hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100 disabled:opacity-40"
              >
                Approva
              </button>
              <button
                onClick={() => handleReject(req.id)}
                disabled={processingId === req.id}
                className="border border-border text-ink-secondary px-4 py-2 rounded-md text-body-sm font-medium hover:text-error hover:border-error transition-colors duration-100 disabled:opacity-40"
              >
                Rifiuta
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
