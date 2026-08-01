import Link from "next/link";
import { useTranslations } from "next-intl";

/**
 * Chiusura di tutte le pagine pubbliche. Prima il sito finiva di colpo dopo l'ultima
 * sezione, senza contatti né link alle pagine legali: Privacy e Termini esistevano ma
 * ci arrivavi solo digitando l'indirizzo.
 *
 * Niente dati societari finché non c'è una società registrata: qui stanno solo cose
 * vere (dove si scrive, cosa c'è nella piattaforma, i legali).
 */
const CONTACT_EMAIL = "info@mirajob.cloud";

export function SiteFooter() {
  const t = useTranslations("Footer");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-white">
      <div className="mx-auto max-w-6xl px-6 py-10 lg:px-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div className="max-w-xs">
            <img src="/brand/mira-lockup.svg" alt="MIRA" width={70} height={24} className="h-6 w-auto" />
            <p className="mt-3 text-body-sm text-ink-secondary">{t("tagline")}</p>
          </div>

          <div className="flex gap-12 sm:gap-16">
            <FooterNav title={t("platform")}>
              <FooterLink href="/signup">{t("students")}</FooterLink>
              <FooterLink href="/associations/candidati">{t("associations")}</FooterLink>
              <FooterLink href="/aziende">{t("companies")}</FooterLink>
            </FooterNav>
            <FooterNav title={t("legal")}>
              <FooterLink href="/privacy">{t("privacy")}</FooterLink>
              <FooterLink href="/termini">{t("terms")}</FooterLink>
            </FooterNav>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-border pt-5 text-body-sm text-ink-tertiary sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} MIRA</p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="transition-colors duration-100 hover:text-navy"
          >
            {t("contact")}: {CONTACT_EMAIL}
          </a>
        </div>
      </div>
    </footer>
  );
}

function FooterNav({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <nav>
      <p className="text-eyebrow uppercase text-navy/50">{title}</p>
      <ul className="mt-3 space-y-2">{children}</ul>
    </nav>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-body-sm text-ink-secondary transition-colors duration-100 hover:text-navy">
        {children}
      </Link>
    </li>
  );
}
