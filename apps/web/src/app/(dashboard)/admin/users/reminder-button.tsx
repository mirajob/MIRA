"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { remindStudentCard } from "@/lib/actions/admin-notify";

export function ReminderButton({ profileId, studentName }: { profileId: string; studentName: string }) {
  const t = useTranslations("AdminUsers");
  const firstName = (studentName ?? "").trim().split(/\s+/)[0] || t("reminderFallbackName");

  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState(() => t("reminderSubjectDefault"));
  const [message, setMessage] = useState(() => t("reminderMessageDefault", { name: firstName }));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null);

  async function handleSend() {
    setLoading(true);
    setResult(null);
    const res = await remindStudentCard({ profileId, subject, message });
    setResult(res);
    setLoading(false);
    if (res.success) setTimeout(() => setOpen(false), 1200);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setResult(null);
          setOpen(true);
        }}
        className="text-body-sm text-petrol hover:underline underline-offset-2 decoration-1 whitespace-nowrap"
      >
        {t("reminderButton")}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-border bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-label text-navy mb-1">{t("reminderComposerHeading")}</p>
            <p className="text-body-sm text-ink-secondary mb-4">{studentName}</p>

            {result?.error && (
              <div className="mb-3 rounded-md bg-error-bg p-2 text-body-sm text-error">{result.error}</div>
            )}
            {result?.success && (
              <div className="mb-3 rounded-md bg-success-bg p-2 text-body-sm text-success">{t("reminderSent")}</div>
            )}

            <label className="block mb-3">
              <span className="text-eyebrow text-ink-secondary mb-1 block">{t("reminderSubjectLabel")}</span>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-body-sm text-ink focus:border-petrol focus:outline-none focus:ring-2 focus:ring-petrol/20"
              />
            </label>

            <label className="block mb-4">
              <span className="text-eyebrow text-ink-secondary mb-1 block">{t("reminderMessageLabel")}</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={8}
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-body-sm text-ink focus:border-petrol focus:outline-none focus:ring-2 focus:ring-petrol/20 resize-none"
              />
            </label>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-body-sm text-ink-secondary hover:text-ink px-3 py-1.5"
              >
                {t("reminderCancel")}
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={loading}
                className="bg-navy text-white px-4 py-1.5 rounded-md text-body-sm font-medium hover:bg-navy-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? t("reminderSending") : t("reminderSend")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
