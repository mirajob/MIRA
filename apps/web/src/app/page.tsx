import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@mira/supabase/server";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { LandingDemo } from "@/components/landing/landing-demo";
import { AssociationDemo } from "@/components/landing/association-demo";
import { CompanyDemo } from "@/components/landing/company-demo";

export default async function HomePage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/api/auth/redirect");
  }

  const t = await getTranslations("HomePage");
  const c = await getTranslations("Common");

  return (
    <div className="min-h-screen bg-cream">
      <header className="h-20 px-6 lg:px-12 flex items-center justify-between">
        <img src="/brand/mira-lockup.svg" alt="MIRA" className="h-7" />
        <div className="flex items-center gap-4">
          <LocaleSwitcher />
          <Link href="/login" className="text-body text-navy hover:text-petrol transition-colors duration-100">
            {c("login")}
          </Link>
          <Link href="/signup" className="bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 transition-colors duration-100">
            {c("start")}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 lg:px-12 py-12 lg:py-20">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="text-center lg:text-left">
            <p className="text-eyebrow text-navy/60 mb-4 uppercase">
              {t("eyebrow")}
            </p>
            <h1 className="font-display text-display-xl text-navy max-w-xl mx-auto lg:mx-0">
              {t("heading")}
            </h1>
            <p className="mt-6 text-body-lg text-ink-secondary max-w-xl mx-auto lg:mx-0">
              {t("subhead")}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-body-sm text-navy/70 lg:justify-start">
              <span>{t("step1")}</span>
              <span aria-hidden className="text-navy/30">·</span>
              <span>{t("step2")}</span>
              <span aria-hidden className="text-navy/30">·</span>
              <span>{t("step3")}</span>
            </div>
            <div className="mt-10">
              <Link
                href="/signup"
                className="inline-block bg-navy text-white px-8 py-4 rounded-md text-body hover:bg-navy-700 transition-colors duration-100"
              >
                {t("ctaStudent")}
              </Link>
              <p className="mt-3 text-body-sm text-ink-tertiary">{t("ctaMicrocopy")}</p>
              <p className="mt-2 text-body-sm text-ink-tertiary max-w-md mx-auto lg:mx-0">{t("ctaAssociations")}</p>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <LandingDemo />
          </div>
        </div>
      </main>

      <section className="border-t border-border px-6 lg:px-12 py-16">
        <div className="mx-auto max-w-6xl">
          <p className="text-eyebrow text-navy/60 uppercase text-center mb-12">
            {t("orgEyebrow")}
          </p>

          {/* Banda associazione: reel a sinistra, testo + CTA a destra */}
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="order-2 flex justify-center lg:order-1 lg:justify-start">
              <AssociationDemo />
            </div>
            <div className="order-1 text-center lg:order-2 lg:text-left">
              <h2 className="font-display text-h1 text-navy mb-3">{t("associationTitle")}</h2>
              <p className="text-body text-ink-secondary mb-6 max-w-md mx-auto lg:mx-0">
                {t("associationBody")}
              </p>
              <Link
                href="/associations/candidati"
                className="inline-block bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 transition-colors duration-100"
              >
                {t("associationCta")}
              </Link>
            </div>
          </div>

          {/* Banda azienda: testo + CTA a sinistra, reel a destra */}
          <div className="mt-16 grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="text-center lg:text-left">
              <h2 className="font-display text-h1 text-navy mb-3">{t("companyTitle")}</h2>
              <p className="text-body text-ink-secondary mb-6 max-w-md mx-auto lg:mx-0">
                {t("companyBody")}
              </p>
              <Link
                href="/aziende"
                className="inline-block bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 transition-colors duration-100"
              >
                {t("companyCta")}
              </Link>
            </div>
            <div className="flex justify-center lg:justify-end">
              <CompanyDemo />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
