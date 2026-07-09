"use client";

import { useState, Suspense } from "react";
import { createBrowserClient } from "@mira/supabase/client";
import { checkPendingCompanyRequest } from "@/lib/actions/company-register";
import { checkAccountType } from "@/lib/actions/auth";
import { getAuthErrorKey } from "@/lib/auth-error-messages";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const t = useTranslations("LoginPage");
  const c = useTranslations("Common");
  const searchParams = useSearchParams();
  const [isCompany, setIsCompany] = useState(searchParams.get("type") === "company");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const rawRedirect = searchParams.get("redirect") ?? "";
  const redirect = rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/api/auth/redirect";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const isPending = await checkPendingCompanyRequest(email);
      setError(
        isPending
          ? t("pendingRequest")
          : c(`authErrors.${getAuthErrorKey(error.message)}`)
      );
      setLoading(false);
      return;
    }

    // The toggle is a hard gate, not just a label: a student account can't
    // slip in through "Azienda" mode and vice versa.
    const accountType = await checkAccountType(email);
    if (isCompany && accountType === "student") {
      await supabase.auth.signOut();
      setError(t("wrongAccountType", { accountType: t("accountTypeStudent"), targetLabel: c("studentTab") }));
      setLoading(false);
      return;
    }
    if (!isCompany && accountType === "company") {
      await supabase.auth.signOut();
      setError(t("wrongAccountType", { accountType: t("accountTypeCompany"), targetLabel: c("companyTab") }));
      setLoading(false);
      return;
    }

    router.push(redirect);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      <div className="space-y-4 rounded-lg border border-border bg-white p-6">
        <h2 className="font-display text-h2 text-navy">{t("heading")}</h2>

        <div className="flex rounded-md border border-border p-1 bg-paper" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={!isCompany}
            onClick={() => setIsCompany(false)}
            className={`flex-1 py-2 rounded text-label transition-colors duration-100 ${
              !isCompany ? "bg-navy text-white" : "text-ink-secondary hover:text-navy"
            }`}
          >
            {c("studentTab")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isCompany}
            onClick={() => setIsCompany(true)}
            className={`flex-1 py-2 rounded text-label transition-colors duration-100 ${
              isCompany ? "bg-navy text-white" : "text-ink-secondary hover:text-navy"
            }`}
          >
            {c("companyTab")}
          </button>
        </div>

        {error && (
          <div className="rounded-md bg-error-bg p-3 text-body-sm text-error">
            {error}
          </div>
        )}

        <label className="block">
          <span className="text-label text-navy mb-2 block">{c("email")}</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200"
            placeholder={isCompany ? t("emailPlaceholderCompany") : c("studentEmailPlaceholder")}
          />
        </label>

        <label className="block">
          <span className="text-label text-navy mb-2 block">{c("password")}</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? t("submitLoading") : c("login")}
        </button>
      </div>

      <p className="text-center text-body-sm text-ink-secondary">
        {c("dontHaveAccount")}{" "}
        <Link href={isCompany ? "/aziende" : "/signup"} className="text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700 hover:decoration-2">
          {c("signUp")}
        </Link>
      </p>
    </form>
  );
}
