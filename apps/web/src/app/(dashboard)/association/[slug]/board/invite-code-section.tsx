"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { generateInviteCode } from "@/lib/actions/board";

export function InviteCodeSection({
  associationId,
  currentCode,
  slug,
}: {
  associationId: string;
  currentCode: string | null;
  slug: string;
}) {
  const t = useTranslations("InviteCodeSection");
  const [code, setCode] = useState(currentCode);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    if (loading) return;
    setLoading(true);
    const res = await generateInviteCode(associationId);
    if (res.code) setCode(res.code);
    setLoading(false);
  }

  function handleCopy() {
    if (!code) return;
    const url = `${window.location.origin}/join/${code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-lg border border-border bg-white p-6">
      <h3 className="font-sans text-h3 text-navy mb-2">{t("heading")}</h3>
      <p className="text-body-sm text-ink-secondary mb-4">
        {t("description")}
      </p>

      {code ? (
        <div className="flex items-center gap-3 flex-wrap">
          <code className="flex-1 min-w-0 px-4 py-3 rounded-md bg-paper border border-border text-body font-mono text-navy truncate">
            {typeof window !== "undefined" ? `${window.location.origin}/join/${code}` : `/join/${code}`}
          </code>
          <button
            onClick={handleCopy}
            className="bg-petrol text-white px-5 py-3 rounded-md text-label hover:bg-petrol-700 active:scale-[0.98] transition-colors duration-100 whitespace-nowrap"
          >
            {copied ? t("copied") : t("copyLink")}
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="text-body-sm text-ink-secondary hover:text-navy underline underline-offset-2 transition-colors duration-100 disabled:opacity-40"
          >
            {loading ? t("regenerating") : t("regenerateCode")}
          </button>
        </div>
      ) : (
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100 disabled:opacity-40"
        >
          {loading ? t("regenerating") : t("generateLink")}
        </button>
      )}
    </div>
  );
}
