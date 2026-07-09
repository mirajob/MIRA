"use client";

import { useState } from "react";
import { approveCompanyAccessRequest, rejectCompanyAccessRequest } from "@/lib/actions/company-register";
import { useRouter } from "next/navigation";

export function AccessRequestButtons({ requestId }: { requestId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleApprove() {
    setLoading(true);
    const result = await approveCompanyAccessRequest(requestId);
    if (result.error) window.alert(result.error);
    router.refresh();
    setLoading(false);
  }

  async function handleReject() {
    const reason = window.prompt("Motivo del rifiuto (opzionale):");
    if (reason === null) return;
    setLoading(true);
    const result = await rejectCompanyAccessRequest(requestId, reason);
    if (result.error) window.alert(result.error);
    router.refresh();
    setLoading(false);
  }

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
