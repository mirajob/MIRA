import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { BackLink } from "@/components/page-bar";

/**
 * Cornice delle schermate di accesso (login, registrazione, password, completa profilo).
 *
 * Fondo cream come tutte le pagine pubbliche: prima era paper e si vedeva il salto
 * passando dalla home al login.
 *
 * Il blocco è centrato con `m-auto` e non con `items-center`: con la centratura flex,
 * un form più alto della finestra deborda in cima e la parte superiore diventa
 * irraggiungibile — era il motivo per cui il logo sembrava tagliato contro il bordo.
 */
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const c = await getTranslations("Common");

  return (
    <div className="flex min-h-screen bg-cream">
      <div className="m-auto w-full max-w-md px-6 py-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <BackLink href="/" label={c("back")} />
          <LocaleSwitcher />
        </div>

        <Link href="/" aria-label="MIRA" className="block">
          <img
            src="/brand/mira-lockup.svg?v=11"
            alt="MIRA"
            width={132}
            height={72}
            className="mx-auto w-[132px]"
          />
        </Link>

        {children}
      </div>
    </div>
  );
}
