"use client";

import { Fragment, useState } from "react";
import { useTranslations } from "next-intl";
import { requestCompanyAccess } from "@/lib/actions/company-register";
import { useRouter } from "next/navigation";
import Link from "next/link";

const SECTORS = [
  "Consulting",
  "Finance & Banking",
  "Tech & Software",
  "Fintech",
  "Luxury & Fashion",
  "Marketing & Comunicazione",
  "Legal",
  "Private Equity & VC",
  "Real Estate",
  "Healthcare",
  "Energy & Sustainability",
  "Media & Entertainment",
  "Startup",
  "Altro",
];

export default function AziendePage() {
  const t = useTranslations("AziendePage");
  const c = useTranslations("Common");
  const [step, setStep] = useState<"landing" | "form">("landing");
  const [legalName, setLegalName] = useState("");
  const [sector, setSector] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const normalizedUrl = websiteUrl
      ? websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`
      : "";
    const result = await requestCompanyAccess({ legalName, sector, websiteUrl: normalizedUrl, contactName, email });

    if (result.error) {
      setError(t(`errors.${result.errorCode}`));
      setLoading(false);
      return;
    }

    router.push(`/aziende/pending?email=${encodeURIComponent(email)}`);
  }

  if (step === "form") {
    return (
      <div className="min-h-screen bg-paper flex flex-col">
        <header className="px-6 py-4 border-b border-border bg-white">
          <img src="/brand/mira-lockup.svg" alt="MIRA" className="h-5" />
        </header>

        <div className="flex-1 flex items-start justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <button
              onClick={() => setStep("landing")}
              className="text-body-sm text-ink-tertiary hover:text-ink mb-6 flex items-center gap-1"
            >
              {t("backLink")}
            </button>

            <h1 className="font-display text-h1 text-navy mb-2">{t("formHeading")}</h1>
            <p className="text-body text-ink-secondary mb-8">
              {t("formIntro")}
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-md bg-error-bg p-3 text-body-sm text-error">{error}</div>
              )}

              <label className="block">
                <span className="text-label text-navy mb-2 block">{t("companyNameLabel")}</span>
                <input
                  type="text"
                  required
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder={t("companyNamePlaceholder")}
                  className="w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200"
                />
              </label>

              <label className="block">
                <span className="text-label text-navy mb-2 block">{t("sectorLabel")}</span>
                <select
                  required
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200"
                >
                  <option value="">{t("sectorPlaceholder")}</option>
                  {SECTORS.map((s) => (
                    <option key={s} value={s}>
                      {t.has(`sectorOverrides.${s}`) ? t(`sectorOverrides.${s}`) : s}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-label text-navy mb-2 block">{t("websiteLabel")}</span>
                <input
                  type="text"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="bain.com"
                  className="w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200"
                />
              </label>

              <div className="border-t border-border pt-5">
                <p className="text-label text-ink-secondary mb-4">{t("contactSectionLabel")}</p>

                <div className="space-y-4">
                  <label className="block">
                    <span className="text-label text-navy mb-2 block">{t("contactNameLabel")}</span>
                    <input
                      type="text"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200"
                    />
                  </label>

                  <label className="block">
                    <span className="text-label text-navy mb-2 block">{t("contactEmailLabel")}</span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200"
                    />
                    <p className="mt-1 text-body-sm text-ink-tertiary">{t("contactEmailHelper")}</p>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? t("submitLoading") : t("submitRequestAccess")}
              </button>

              <p className="text-center text-body-sm text-ink-secondary">
                {c("alreadyHaveAccount")}{" "}
                <Link href="/login?type=company" className="text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700">
                  {c("login")}
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const steps = [
    { n: "01", title: t("landing.steps.step1.title"), body: t("landing.steps.step1.body") },
    { n: "02", title: t("landing.steps.step2.title"), body: t("landing.steps.step2.body") },
    { n: "03", title: t("landing.steps.step3.title"), body: t("landing.steps.step3.body") },
  ];

  const comparisonRows = [
    { left: t("landing.comparison.row1.left"), right: t("landing.comparison.row1.right") },
    { left: t("landing.comparison.row2.left"), right: t("landing.comparison.row2.right") },
    { left: t("landing.comparison.row3.left"), right: t("landing.comparison.row3.right") },
    { left: t("landing.comparison.row4.left"), right: t("landing.comparison.row4.right") },
  ];

  return (
    <div className="min-h-screen bg-paper">
      <header className="px-6 py-4 border-b border-border bg-white flex items-center justify-between">
        <img src="/brand/mira-lockup.svg" alt="MIRA" className="h-5" />
        <Link href="/login?type=company" className="text-body-sm text-ink-secondary hover:text-navy transition-colors">
          {c("login")}
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="mb-16">
          <p className="text-eyebrow text-petrol uppercase tracking-wider mb-4">{t("landing.eyebrow")}</p>
          <h1 className="font-display text-display-lg text-navy mb-6 max-w-2xl">
            {t("landing.heading")}
          </h1>
          <p className="text-body-lg text-ink-secondary max-w-xl mb-8">
            {t("landing.subhead")}
          </p>
          <button
            onClick={() => setStep("form")}
            className="bg-navy text-white px-8 py-4 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100"
          >
            {t("landing.ctaPilot")}
          </button>
          <p className="mt-3 text-body-sm text-ink-tertiary">{t("landing.pilotNote")}</p>
        </div>

        {/* How it works */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {steps.map((item) => (
            <div key={item.n} className="rounded-lg border border-border bg-white p-6">
              <p className="text-eyebrow text-petrol uppercase tracking-wider mb-3">{item.n}</p>
              <h3 className="font-display text-h3 text-navy mb-2">{item.title}</h3>
              <p className="text-body text-ink-secondary">{item.body}</p>
            </div>
          ))}
        </div>

        {/* Why MIRA */}
        <div className="rounded-lg border border-border bg-white p-8 mb-16">
          <h2 className="font-display text-h2 text-navy mb-6">{t("landing.whyHeading")}</h2>
          <div className="grid grid-cols-2 gap-x-6">
            <p className="text-label text-ink-secondary pb-3 border-b border-border">{t("landing.comparison.recruitingHeader")}</p>
            <p className="text-label text-navy pb-3 border-b border-border">{t("landing.comparison.miraHeader")}</p>
            {comparisonRows.map((row) => (
              <Fragment key={row.left}>
                <p className="text-body text-ink-secondary py-4 border-b border-border/60">{row.left}</p>
                <p className="text-body font-medium text-navy py-4 border-b border-border/60">{row.right}</p>
              </Fragment>
            ))}
          </div>
        </div>

        {/* CTA bottom */}
        <div className="text-center">
          <button
            onClick={() => setStep("form")}
            className="bg-navy text-white px-8 py-4 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100"
          >
            {t("landing.bottomCta")}
          </button>
        </div>
      </main>
    </div>
  );
}
