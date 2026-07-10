"use client";

import { useState } from "react";
import { approveCompany, rejectCompany } from "@/lib/actions/company-register";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function ApproveRejectButtons({ companyId, status }: { companyId: string; status: string }) {
  const t = useTranslations("AdminCompanies");
  const c = useTranslations("Common");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleApprove() {
    setLoading(true);
    await approveCompany(companyId);
    router.refresh();
    setLoading(false);
  }

  async function handleReject() {
    const reason = window.prompt(t("rejectReasonPrompt"));
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
        {t("suspend")}
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
          {c("approve")}
        </button>
        <button
          onClick={handleReject}
          disabled={loading}
          className="text-body-sm text-error hover:underline disabled:opacity-40"
        >
          {c("reject")}
        </button>
      </div>
    );
  }

  return <span className="text-body-sm text-ink-tertiary">—</span>;
}
