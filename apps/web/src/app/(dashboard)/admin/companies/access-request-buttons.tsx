"use client";

import { useState } from "react";
import { approveCompanyAccessRequest, rejectCompanyAccessRequest } from "@/lib/actions/company-register";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function AccessRequestButtons({ requestId }: { requestId: string }) {
  const t = useTranslations("AdminCompanies");
  const c = useTranslations("Common");
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
    const reason = window.prompt(t("rejectReasonPrompt"));
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
