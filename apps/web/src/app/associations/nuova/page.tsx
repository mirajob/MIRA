import { getUserContext } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { signOut } from "@/lib/actions/auth";
import { NuovaAssociazioneForm } from "./nuova-associazione-form";

/**
 * Candidatura associazione per chi ha già un account MIRA — niente campi di credenziali,
 * si usa la sessione già autenticata (getUserContext reindirizza a /login se non c'è).
 */
export default async function NuovaAssociazionePage() {
  const ctx = await getUserContext();
  const t = await getTranslations("CandidatiPage");
  const p = await getTranslations("AssociaEsistentePage");
  const c = await getTranslations("Common");

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="px-6 py-4 border-b border-border bg-white flex items-center justify-between">
        <Link href="/">
          <img src="/brand/mira-lockup.svg" alt="MIRA" className="h-5" />
        </Link>
        <div className="flex items-center gap-4">
          <LocaleSwitcher />
          <form action={signOut}>
            <input type="hidden" name="redirect" value={`/login?redirect=${encodeURIComponent("/associations/nuova")}`} />
            <button type="submit" className="text-body-sm text-ink-tertiary hover:text-navy transition-colors duration-100">
              {c("signOut")}
            </button>
          </form>
        </div>
      </header>

      <div className="flex-1 flex items-start justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <p className="text-eyebrow text-petrol uppercase tracking-wider mb-3">{t("eyebrow")}</p>
          <h1 className="font-display text-h1 text-navy mb-2">{t("heading")}</h1>
          <p className="text-body text-ink-secondary mb-8">
            {p("intro", { email: ctx.user.email ?? "" })}
          </p>

          <NuovaAssociazioneForm />
        </div>
      </div>
    </div>
  );
}
