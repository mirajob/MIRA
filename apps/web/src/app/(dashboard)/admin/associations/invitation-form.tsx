"use client";

import { useState } from "react";
import { createPresidentInvitation } from "@/lib/actions/invitations";
import { useTranslations } from "next-intl";

export function InvitationForm() {
  const t = useTranslations("AdminAssociations");
  const [result, setResult] = useState<{ error?: string; success?: boolean; token?: string; emailError?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setResult(null);
    const res = await createPresidentInvitation(formData);
    setResult(res);
    setLoading(false);
  }

  return (
    <div className="rounded-lg border border-border bg-white p-6">
      <h2 className="font-sans text-h3 text-navy mb-4">{t("inviteHeading")}</h2>
      <p className="text-body-sm text-ink-secondary mb-4">
        {t("inviteIntro")}
      </p>

      {result?.error && (
        <div className="mb-4 rounded-md bg-error-bg p-3 text-body-sm text-error">
          {result.error}
        </div>
      )}

      {result?.success && (
        <div className="mb-4 rounded-md bg-success-bg p-3 text-body-sm text-success">
          {result.emailError
            ? t("invitationCreatedEmailFailed")
            : t("invitationCreatedEmailSent")}
          <code className="font-mono text-xs break-all">
            {typeof window !== "undefined" ? window.location.origin : ""}/invite/{result.token}
          </code>
        </div>
      )}

      <form action={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-label text-navy mb-2 block">{t("presidentEmailLabel")}</span>
          <input
            name="email"
            type="email"
            required
            placeholder={t("presidentEmailPlaceholder")}
            className="w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200"
          />
        </label>

        <label className="block">
          <span className="text-label text-navy mb-2 block">{t("associationNameLabel")}</span>
          <input
            name="associationName"
            type="text"
            required
            placeholder={t("associationNamePlaceholder")}
            className="w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-label text-navy mb-2 block">{t("emailMessageLabel")}</span>
          <textarea
            name="note"
            rows={2}
            placeholder={t("emailMessagePlaceholder")}
            className="w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200 resize-none"
          />
        </label>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? t("sendingInvite") : t("sendInvite")}
          </button>
        </div>
      </form>
    </div>
  );
}
