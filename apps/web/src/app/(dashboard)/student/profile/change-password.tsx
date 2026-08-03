"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { changePassword } from "@/lib/actions/auth";

const inputClass =
  "w-full rounded-md border border-border px-3 py-1.5 text-body-sm text-ink focus:border-petrol focus:outline-none";

/** Cambio password dall'account. La vecchia si chiede davvero, non per finta. */
export function ChangePassword() {
  const t = useTranslations("Profile");
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    if (next !== confirm) {
      setError(t("passwordMismatch"));
      return;
    }
    setSaving(true);
    setError(null);
    const result = await changePassword(current, next);
    if (result.error) setError(result.error);
    else {
      setDone(true);
      setOpen(false);
      setCurrent("");
      setNext("");
      setConfirm("");
    }
    setSaving(false);
  }

  return (
    <section className="rounded-lg border border-border bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-body font-medium text-navy">{t("passwordHeading")}</h2>
        {!open && (
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              setDone(false);
            }}
            className="text-body-sm text-petrol hover:underline"
          >
            {t("passwordChange")}
          </button>
        )}
      </div>

      {done && <p className="mt-2 text-body-sm text-success">{t("passwordChanged")}</p>}

      {open ? (
        <div className="mt-3 max-w-sm space-y-3">
          <label className="block">
            <span className="mb-1 block text-body-sm text-ink-tertiary">{t("passwordCurrent")}</span>
            <input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-body-sm text-ink-tertiary">{t("passwordNew")}</span>
            <input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-body-sm text-ink-tertiary">{t("passwordRepeat")}</span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className={inputClass}
            />
          </label>

          {error && <p className="text-body-sm text-error">{error}</p>}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={submit}
              disabled={saving}
              className="rounded-md bg-navy px-4 py-1.5 text-body-sm text-white transition-colors duration-100 hover:bg-navy-700 disabled:opacity-40"
            >
              {saving ? t("saving") : t("save")}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
              className="text-body-sm text-ink-secondary hover:text-navy"
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-1 text-body-sm text-ink-secondary">{t("passwordIntro")}</p>
      )}
    </section>
  );
}
