import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@mira/supabase/server";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { LandingDemo } from "@/components/landing/landing-demo";
import { AssociationDemo } from "@/components/landing/association-demo";
import { CompanyDemo } from "@/components/landing/company-demo";
import { SectionNav } from "@/components/landing/section-nav";
import { Reveal } from "@/components/landing/reveal";

/**
 * Home pubblica: tre sezioni, una per chi arriva (studente, associazione, azienda).
 * La barra agganciata in alto le collega e dice dove sei; scorrendo, i blocchi
 * compaiono uno alla volta (`Reveal`). L'hero non è avvolto nel Reveal: è la prima
 * cosa che si vede, deve esserci subito.
 */
export default async function HomePage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/api/auth/redirect");
  }

  const t = await getTranslations("HomePage");
  const c = await getTranslations("Common");
  const faq = t.raw("faq") as { q: string; a: string }[];
  const cardPoints = t.raw("cardPoints") as { title: string; body: string }[];
  const associationPoints = t.raw("associationPoints") as { title: string; body: string }[];

  return (
    <div className="min-h-screen bg-cream">
      {/* Senza JS i blocchi non riceverebbero mai la classe che li mostra. */}
      <noscript>
        <style dangerouslySetInnerHTML={{ __html: ".mira-reveal{opacity:1;transform:none}" }} />
      </noscript>

      <SiteHeader nav={<SectionNav />}>
        <LocaleSwitcher />
        <Link
          href="/login"
          className="text-body-sm text-navy transition-colors duration-100 hover:text-petrol"
        >
          {c("login")}
        </Link>
        <Link
          href="/signup"
          className="rounded-md bg-navy px-4 py-2 text-label text-white transition-colors duration-100 hover:bg-navy-700"
        >
          {c("start")}
        </Link>
      </SiteHeader>

      <main id="studenti" className="mx-auto max-w-6xl scroll-mt-32 px-6 py-14 lg:px-12 lg:py-20">
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

            {/* Cosa entra nella card. Sta in colonna e allineato a sinistra anche quando il
                resto dell'hero è centrato: un elenco centrato non si legge. */}
            <ul className="mt-7 max-w-sm mx-auto space-y-3.5 text-left lg:mx-0">
              {cardPoints.map((point) => (
                <li key={point.title} className="border-l-2 border-petrol/30 pl-4">
                  <p className="text-body font-medium text-navy">{point.title}</p>
                  <p className="text-body-sm text-ink-secondary">{point.body}</p>
                </li>
              ))}
            </ul>

            <p className="mt-6 max-w-sm mx-auto text-left text-body-sm text-ink-tertiary lg:mx-0">
              {t("noAts")}
            </p>

            <div className="mt-9">
              <Link
                href="/signup"
                className="inline-block bg-navy text-white px-8 py-4 rounded-md text-body hover:bg-navy-700 transition-colors duration-100"
              >
                {t("ctaStudent")}
              </Link>
              <p className="mt-3 text-body-sm text-ink-tertiary max-w-md mx-auto lg:mx-0">{t("ctaMicrocopy")}</p>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <LandingDemo />
          </div>
        </div>
      </main>

      {/* ——— Associazioni: pitch + reel in alto, le sei funzioni sotto ——— */}
      <section id="associazioni" className="scroll-mt-32 border-t border-border px-6 py-16 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <Reveal className="order-2 flex justify-center lg:order-1 lg:justify-start">
              <AssociationDemo />
            </Reveal>
            <Reveal className="order-1 text-center lg:order-2 lg:text-left" delay={80}>
              <h2 className="font-display text-display-md text-navy">{t("associationTitle")}</h2>
              <p className="mt-4 max-w-md mx-auto text-body-lg text-ink-secondary lg:mx-0">
                {t("associationBody")}
              </p>
              <Link
                href="/associations/candidati"
                className="mt-7 inline-block rounded-md bg-navy px-6 py-3 text-body text-white transition-colors duration-100 hover:bg-navy-700"
              >
                {t("associationCta")}
              </Link>
            </Reveal>
          </div>

          {/* Le funzioni una per una: due colonne su schermo largo, una in colonna stretta.
              Stessa riga verticale petrol dell'elenco dello studente, così i due elenchi
              della home si riconoscono come la stessa cosa. */}
          <ul className="mt-14 grid gap-x-12 gap-y-8 sm:grid-cols-2">
            {associationPoints.map((point, i) => (
              <li key={point.title}>
                <Reveal className="border-l-2 border-petrol/30 pl-4" delay={(i % 2) * 80}>
                  <p className="text-body font-medium text-navy">{point.title}</p>
                  <p className="mt-1 text-body-sm text-ink-secondary">{point.body}</p>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ——— Aziende ——— */}
      <section id="aziende" className="scroll-mt-32 border-t border-border px-6 py-16 lg:px-12 lg:py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal className="text-center lg:text-left">
            <h2 className="font-display text-display-md text-navy">{t("companyTitle")}</h2>
            <p className="mt-4 max-w-md mx-auto text-body-lg text-ink-secondary lg:mx-0">
              {t("companyBody")}
            </p>
            <Link
              href="/aziende"
              className="mt-7 inline-block rounded-md bg-navy px-6 py-3 text-body text-white transition-colors duration-100 hover:bg-navy-700"
            >
              {t("companyCta")}
            </Link>
          </Reveal>
          <Reveal className="flex justify-center lg:justify-end" delay={80}>
            <CompanyDemo />
          </Reveal>
        </div>
      </section>

      {/* FAQ studenti: accordion nativo <details>, nessun JS lato client. Larghezza da
          lettura, una domanda per riga, la crocetta ruota all'apertura. */}
      <section className="border-t border-border px-6 lg:px-12 py-16">
        <Reveal className="mx-auto max-w-3xl">
          <p className="text-eyebrow text-navy/60 uppercase text-center mb-3">{t("faqEyebrow")}</p>
          <h2 className="font-display text-h1 text-navy text-center mb-10">{t("faqHeading")}</h2>

          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-white">
            {faq.map((item, i) => (
              <details key={i} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 hover:bg-cream/40 transition-colors [&::-webkit-details-marker]:hidden">
                  <span className="text-body font-medium text-navy">{item.q}</span>
                  <span
                    aria-hidden
                    className="shrink-0 text-2xl leading-none text-navy/40 transition-transform duration-200 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="px-5 pb-5 -mt-1 text-body text-ink-secondary">{item.a}</p>
              </details>
            ))}
          </div>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  );
}
