"use client";

import { useState } from "react";
import { approveCompany, rejectCompany } from "@/lib/actions/company-register";
import { useRouter } from "next/navigation";

export function ApproveRejectButtons({ companyId, status }: { companyId: string; status: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleApprove() {
    setLoading(true);
    await approveCompany(companyId);
    router.refresh();
    setLoading(false);
  }

  async function handleReject() {
    const reason = window.prompt("Motivo del rifiuto (opzionale):");
    setLoading(true);
    await rejectCompany(companyId, reason ?? "");
    router.refresh();
    setLoading(false);
  }

  if (status === "verified") {
    return (
      <button
        onClick={handleReject}
        disabled={loading}
        className="text-body-sm text-error hover:underline disabled:opacity-40"
      >
        Sospendi
      </button>
    );
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
