import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@mira/supabase/server";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale-switcher";

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

      <main className="flex flex-col items-center justify-center px-6 py-12">
        <p className="text-eyebrow text-navy/60 mb-4 uppercase">
          {t("eyebrow")}
        </p>
        <h1 className="font-display text-display-xl text-navy text-center max-w-3xl">
          {t("heading")}
        </h1>
        <p className="mt-6 text-body-lg text-ink-secondary text-center max-w-2xl">
          {t("subhead")}
        </p>
        <div className="mt-10">
          <Link
            href="/signup"
            className="bg-navy text-white px-8 py-4 rounded-md text-body hover:bg-navy-700 transition-colors duration-100"
          >
            {t("ctaStudent")}
          </Link>
        </div>
      </main>

      <section className="border-t border-border px-6 lg:px-12 py-16">
        <div className="mx-auto max-w-4xl">
          <p className="text-eyebrow text-navy/60 uppercase text-center mb-10">
            {t("orgEyebrow")}
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-white p-8 text-center">
              <h2 className="font-display text-h2 text-navy mb-2">{t("associationTitle")}</h2>
              <p className="text-body text-ink-secondary mb-6">
                {t("associationBody")}
              </p>
              <Link
                href="/associations/candidati"
                className="inline-block bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 transition-colors duration-100"
              >
                {t("associationCta")}
              </Link>
            </div>
            <div className="rounded-lg border border-border bg-white p-8 text-center">
              <h2 className="font-display text-h2 text-navy mb-2">{t("companyTitle")}</h2>
              <p className="text-body text-ink-secondary mb-6">
                {t("companyBody")}
              </p>
              <Link
                href="/aziende"
                className="inline-block bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 transition-colors duration-100"
              >
                {t("companyCta")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
