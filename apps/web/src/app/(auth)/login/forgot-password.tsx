"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { requestPasswordReset } from "@/lib/actions/auth";

/**
 * "Password dimenticata?" sotto il campo password.
 *
 * Si apre lì dove serve invece di portare su un'altra pagina: chi è arrivato
 * all'accesso vuole entrare, non cambiare schermata. L'indirizzo già scritto
 * sopra viene riproposto, così non lo si riscrive.
 */
export function ForgotPassword({ email }: { email: string }) {
  const t = useTranslations("LoginPage");
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(email);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit() {
    setLoading(true);
    setError(null);
    const result = await requestPasswordReset(value || email, window.location.origin);
    if (result.error) setError(result.error);
    else setSent(true);
    setLoading(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(email);
          setOpen(true);
        }}
        className="text-body-sm text-ink-secondary transition-colors duration-100 hover:text-petrol"
      >
        {t("forgotPassword")}
      </button>
    );
  }

  if (sent) {
    return (
      <p className="rounded-md bg-petrol-50 px-3 py-2 text-body-sm text-petrol-700">
        {t("resetSent", { email: value || email })}
      </p>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-border bg-paper px-3 py-3">
      <p className="text-body-sm text-ink-secondary">{t("forgotPasswordIntro")}</p>
      <input
        type="email"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t("forgotPasswordPlaceholder")}
        className="w-full rounded-md border border-border bg-white px-3 py-2 text-body-sm text-ink focus:border-petrol focus:outline-none"
      />
      {error && <p className="text-body-sm text-error">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={loading}
          className="rounded-md bg-navy px-3 py-1.5 text-body-sm text-white transition-colors duration-100 hover:bg-navy-700 disabled:opacity-40"
        >
          {loading ? t("working") : t("sendResetLink")}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-body-sm text-ink-secondary hover:text-navy"
        >
          {t("cancelReset")}
        </button>
      </div>
    </div>
  );
}
