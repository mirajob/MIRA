"use client";

import { useState } from "react";
import { uploadKnowledgeDocument } from "@/lib/actions/knowledge-base";
import { useTranslations } from "next-intl";

const SOURCE_TYPE_VALUES = ["pdf", "docx", "txt", "csv", "markdown", "url", "pasted_text"];
const SCOPE_VALUES = ["global_mira", "association_application", "admin_only", "ai_internal_only"];

const inputClass = "w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200";

export function KnowledgeUploadForm() {
  const t = useTranslations("AdminKnowledgeBase");
  const [sourceType, setSourceType] = useState("pdf");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ error?: string; success?: boolean } | null>(null);

  const showFileUpload = !["url", "pasted_text"].includes(sourceType);
  const showPastedText = sourceType === "pasted_text";

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setResult(null);
    const res = await uploadKnowledgeDocument(formData);
    setResult(res);
    setLoading(false);
  }

  return (
    <div className="rounded-lg border border-border bg-white p-6">
      <h2 className="font-sans text-h3 text-navy mb-4">{t("uploadHeading")}</h2>

      {result?.error && (
        <div className="mb-4 rounded-md bg-error-bg p-3 text-body-sm text-error">{result.error}</div>
      )}
      {result?.success && (
        <div className="mb-4 rounded-md bg-success-bg p-3 text-body-sm text-success">{t("uploadSuccess")}</div>
      )}

      <form action={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-label text-navy mb-2 block">{t("titleLabel")}</span>
            <input name="title" type="text" required placeholder={t("titlePlaceholder")} className={inputClass} />
          </label>

          <label className="block">
            <span className="text-label text-navy mb-2 block">{t("sourceTypeLabel")}</span>
            <select name="sourceType" value={sourceType} onChange={(e) => setSourceType(e.target.value)} className={inputClass}>
              {SOURCE_TYPE_VALUES.map(v => <option key={v} value={v}>{t(`sourceTypes.${v}`)}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="text-label text-navy mb-2 block">{t("categoryLabel")}</span>
            <input name="category" type="text" placeholder={t("categoryPlaceholder")} className={inputClass} />
          </label>

          <label className="block">
            <span className="text-label text-navy mb-2 block">{t("visibilityLabel")}</span>
            <select name="visibilityScope" className={inputClass}>
              {SCOPE_VALUES.map(v => <option key={v} value={v}>{t(`scopes.${v}`)}</option>)}
            </select>
          </label>
        </div>

        {showFileUpload && (
          <label className="block">
            <span className="text-label text-navy mb-2 block">{t("fileLabel")}</span>
            <input name="file" type="file" accept=".pdf,.docx,.doc,.txt,.csv,.md" className="w-full text-body text-ink file:mr-4 file:rounded-md file:border-0 file:bg-navy file:px-4 file:py-2 file:text-sm file:text-white hover:file:bg-navy-700" />
          </label>
        )}

        {showPastedText && (
          <label className="block">
            <span className="text-label text-navy mb-2 block">{t("pastedTextLabel")}</span>
            <textarea name="pastedText" rows={8} placeholder={t("pastedTextPlaceholder")} className={`${inputClass} resize-y`} />
          </label>
        )}

        <button type="submit" disabled={loading} className="bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100 disabled:opacity-40">
          {loading ? t("uploading") : t("uploadButton")}
        </button>
      </form>
    </div>
  );
}
