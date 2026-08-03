"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PasswordInput } from "@/components/password-input";
import { setNewPassword } from "@/lib/actions/auth";

/**
 * Dove si atterra dal link di recupero. La sessione è già aperta dal link, qui
 * si scrive solo la password nuova.
 */
export default function NewPasswordPage() {
  const t = useTranslations("LoginPage");
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError(t("passwordMismatch"));
      return;
    }
    setLoading(true);
    setError(null);
    const result = await setNewPassword(password);
    if (result.error) setError(result.error);
    else {
      setDone(true);
      router.push("/api/auth/redirect");
    }
    setLoading(false);
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="text-body-lg font-semibold text-navy">{t("newPasswordHeading")}</h1>
      <p className="mt-1 text-body-sm text-ink-secondary">{t("newPasswordIntro")}</p>

      <form onSubmit={submit} className="mt-5 space-y-3">
        <PasswordInput
          value={password}
          onChange={setPassword}
          placeholder={t("newPasswordPlaceholder")}
          autoComplete="new-password"
        />
        <PasswordInput
          value={confirm}
          onChange={setConfirm}
          placeholder={t("confirmPasswordPlaceholder")}
          autoComplete="new-password"
        />

        {error && <p className="text-body-sm text-error">{error}</p>}

        <button
          type="submit"
          disabled={loading || done}
          className="w-full rounded-md bg-navy px-4 py-2 text-body-sm text-white transition-colors duration-100 hover:bg-navy-700 disabled:opacity-40"
        >
          {loading ? t("working") : t("newPasswordCta")}
        </button>
      </form>
    </div>
  );
}
