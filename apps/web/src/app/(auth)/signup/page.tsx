"use client";

import { Suspense, useState } from "react";
import { createBrowserClient } from "@mira/supabase/client";
import { validateStudentEmail, validatePassword } from "@mira/domain";
import { UniversityCombobox } from "@/components/university-combobox";
import { getAuthErrorKey } from "@/lib/auth-error-messages";
import { notifyAdminNewStudent } from "@/lib/actions/admin-notify";
import { PasswordInput } from "@/components/password-input";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

const DEGREE_LEVEL_VALUES = ["triennale", "magistrale", "ciclo_unico"] as const;

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const t = useTranslations("SignupPage");
  const c = useTranslations("Common");
  const v = useTranslations("Validation");
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect") ?? "";
  const redirect = rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/api/auth/redirect";
  // Invite-driven signups (e.g. a company admin accepting an invite) are
  // validated by their invitation token, not by student email domain.
  const source = searchParams.get("source");
  const isInvite = redirect.startsWith("/invite/");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [university, setUniversity] = useState("");
  const [degreeLevel, setDegreeLevel] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resent, setResent] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isInvite) {
      const emailValidation = validateStudentEmail(email);
      if (!emailValidation.valid) {
        setError(v(`studentEmail.${emailValidation.errorCode}`));
        return;
      }
      if (!university || !degreeLevel) {
        setError(t("selectUniversityAndDegree"));
        return;
      }
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setError(v(`password.${passwordValidation.errorCode}`));
      return;
    }

    setLoading(true);

    const supabase = createBrowserClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          ...(source ? { signup_source: source } : {}),
          ...(!isInvite ? { university, degree_level: degreeLevel } : {}),
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(c(`authErrors.${getAuthErrorKey(error.message)}`));
      setLoading(false);
      return;
    }

    // Supabase non restituisce un errore per un'email già registrata (per non
    // rivelare a un attaccante quali email esistono): risponde con successo ma
    // un utente con `identities` vuoto. Senza questo controllo l'utente pensa
    // di essersi appena iscritto, mentre non è successo nulla.
    if (data.user && data.user.identities?.length === 0) {
      setError(c(`authErrors.${getAuthErrorKey("already registered")}`));
      setLoading(false);
      return;
    }

    // Novità: avvisa l'admin del nuovo studente (solo signup studente, non gli inviti
    // azienda/associazione che hanno già le loro notifiche). Best-effort, non blocca il flusso.
    if (!isInvite) {
      void notifyAdminNewStudent({ fullName, email, university, degreeLevel });
    }

    // Se la conferma email è richiesta, signUp non restituisce una sessione. Non
    // usiamo il link cliccabile (i filtri email tipo Safe Links lo pre-aprono e
    // bruciano il token monouso): mostriamo l'inserimento del codice a 6 cifre,
    // che nessuno scanner può "digitare".
    if (!data.session) {
      setEmailSent(true);
      setLoading(false);
      return;
    }

    router.push(redirect);
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const clean = code.trim();
    if (clean.length < 6) {
      setError(t("codeInvalid"));
      return;
    }
    setVerifying(true);
    const supabase = createBrowserClient();
    const { error } = await supabase.auth.verifyOtp({ email, token: clean, type: "signup" });
    if (error) {
      setError(t("codeInvalid"));
      setVerifying(false);
      return;
    }
    router.push(redirect);
  }

  async function handleResendCode() {
    setError(null);
    setResent(false);
    const supabase = createBrowserClient();
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (!error) setResent(true);
  }

  if (emailSent) {
    return (
      <form onSubmit={handleVerifyCode} className="mt-8 space-y-6 rounded-lg border border-border bg-white p-6">
        <div className="space-y-2 text-center">
          <h2 className="font-display text-h2 text-navy">{t("codeHeading")}</h2>
          <p className="text-body text-ink-secondary">{t("codeBody", { email })}</p>
        </div>

        {error && (
          <div className="rounded-md bg-error-bg p-3 text-center text-body-sm text-error">{error}</div>
        )}

        <label className="block">
          <span className="mb-2 block text-label text-navy">{t("codeLabel")}</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder="••••••"
            className="w-full rounded-md border border-border bg-white px-4 py-3 text-center font-mono text-h2 tracking-[0.3em] text-navy placeholder:text-ink-tertiary focus:border-petrol focus:outline-none focus:ring-2 focus:ring-petrol/20"
          />
        </label>

        <button
          type="submit"
          disabled={verifying || code.length < 6}
          className="w-full rounded-md bg-navy px-6 py-3 text-label text-white transition-colors duration-100 hover:bg-navy-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {verifying ? t("codeVerifying") : t("codeVerify")}
        </button>

        <div className="space-y-2 text-center">
          <p className="text-body-sm text-ink-tertiary">{t("emailSentDelayNote")}</p>
          {resent ? (
            <p className="text-body-sm font-medium text-success">{t("codeResent")}</p>
          ) : (
            <button
              type="button"
              onClick={handleResendCode}
              className="text-body-sm text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700"
            >
              {t("codeResend")}
            </button>
          )}
        </div>
      </form>
    );
  }

  const inputClass = "w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200";

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      <div className="space-y-4 rounded-lg border border-border bg-white p-6">
        <h2 className="font-display text-h2 text-navy">{t("heading")}</h2>

        {error && (
          <div className="rounded-md bg-error-bg p-3 text-body-sm text-error">
            {error}
          </div>
        )}

        <label className="block">
          <span className="text-label text-navy mb-2 block">{t("fullNameLabel")}</span>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="text-label text-navy mb-2 block">{t("emailLabel")}</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder={c("studentEmailPlaceholder")}
          />
          {!isInvite && (
            <p className="mt-1 text-body-sm text-ink-tertiary">{t("emailHelper")}</p>
          )}
        </label>

        {!isInvite && (
          <>
            <label className="block">
              <span className="text-label text-navy mb-2 block">{t("universityLabel")}</span>
              <UniversityCombobox value={university} onChange={setUniversity} inputClassName={inputClass} />
            </label>

            <label className="block">
              <span className="text-label text-navy mb-2 block">{t("degreeLevelLabel")}</span>
              <select
                required
                value={degreeLevel}
                onChange={(e) => setDegreeLevel(e.target.value)}
                className={inputClass}
              >
                <option value="">{t("degreeLevelPlaceholder")}</option>
                {DEGREE_LEVEL_VALUES.map((value) => (
                  <option key={value} value={value}>{t(`degreeLevels.${value}`)}</option>
                ))}
              </select>
            </label>
          </>
        )}

        <label className="block">
          <span className="text-label text-navy mb-2 block">{c("password")}</span>
          <PasswordInput value={password} onChange={setPassword} required autoComplete="new-password" />
          <p className="mt-1 text-body-sm text-ink-tertiary">{t("passwordHelper")}</p>
        </label>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            required
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border text-petrol focus:ring-petrol"
          />
          <span className="text-body-sm text-ink-secondary">
            {t.rich("termsConsent", {
              privacyLink: (chunks) => (
                <Link href="/privacy" target="_blank" className="text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700">
                  {chunks}
                </Link>
              ),
              termsLink: (chunks) => (
                <Link href="/termini" target="_blank" className="text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700">
                  {chunks}
                </Link>
              ),
            })}
          </span>
        </label>

        <button
          type="submit"
          disabled={loading || !acceptedTerms}
          className="w-full bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? t("submitLoading") : c("signUp")}
        </button>
      </div>

      <p className="text-center text-body-sm text-ink-secondary">
        {c("alreadyHaveAccount")}{" "}
        <Link href="/login" className="text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700 hover:decoration-2">
          {c("login")}
        </Link>
      </p>
    </form>
  );
}
