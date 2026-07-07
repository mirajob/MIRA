"use client";

import { useState } from "react";
import { approveAssociation, rejectAssociation } from "@/lib/actions/association-register";
import { useRouter } from "next/navigation";

export function ApproveRejectButtons({ associationId, status }: { associationId: string; status: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleApprove() {
    setLoading(true);
    await approveAssociation(associationId);
    router.refresh();
    setLoading(false);
  }

  async function handleReject() {
    const reason = window.prompt("Motivo del rifiuto (opzionale):");
    setLoading(true);
    await rejectAssociation(associationId, reason ?? "");
    router.refresh();
    setLoading(false);
  }

  if (status === "pending_verification") {
    return (
      <div className="flex gap-3">
        <button
          onClick={handleApprove}
          disabled={loading}
          className="text-body-sm text-success font-medium hover:underline disabled:opacity-40"
        >
          Approva
        </button>
        <button
          onClick={handleReject}
          disabled={loading}
          className="text-body-sm text-error hover:underline disabled:opacity-40"
        >
          Rifiuta
        </button>
      </div>
    );
  }

  return <span className="text-body-sm text-ink-tertiary">—</span>;
}
