import Link from "next/link";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { getTranslations } from "next-intl/server";

interface Props {
  searchParams: Promise<{ email?: string }>;
}

export default async function PendingPage({ searchParams }: Props) {
  const { email } = await searchParams;
  const t = await getTranslations("PendingPage");
  const c = await getTranslations("Common");

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="px-6 py-4 border-b border-border bg-white flex items-center justify-between">
        <Link href="/">
          <img src="/brand/mira-lockup.svg" alt="MIRA" className="h-5" />
        </Link>
        <LocaleSwitcher />
      </header>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-navy-50 border-2 border-navy/20 flex items-center justify-center mx-auto mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-navy">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>

          <h1 className="font-display text-h1 text-navy mb-3">{t("heading")}</h1>
          <p className="text-body text-ink-secondary mb-6">
            {email ? (
              t.rich("bodyWithEmail", { email, strong: (chunks) => <strong className="text-navy">{chunks}</strong> })
            ) : (
              t("bodyWithoutEmail")
            )}
            {t("bodySuffix")}
          </p>

          <div className="rounded-lg border border-border bg-white p-6 text-left mb-6">
            <p className="text-label text-navy mb-3">{t("whatHappensNow")}</p>
            <ol className="space-y-3">
              {[
                t("step1"),
                t("step2"),
                t("step3"),
                t("step4"),
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-navy text-white text-xs flex items-center justify-center font-medium">
                    {i + 1}
                  </span>
                  <span className="text-body text-ink">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <p className="text-body-sm text-ink-tertiary">
            {c("alreadyHaveAccount")}{" "}
            <Link href="/login?type=company" className="text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700">
              {c("login")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
