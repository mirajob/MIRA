import Link from "next/link";

/**
 * Testata unica di tutte le pagine pubbliche (home, aziende, associazioni, legali).
 * Prima ognuna aveva la sua: altezze, bordi e dimensioni del logo diversi, che di
 * pagina in pagina si notano. Le azioni a destra (lingua, accedi, CTA) le passa la
 * pagina come children, la cornice resta sempre questa.
 *
 * Il logo ha width/height espliciti: senza, la testata sobbalza mentre l'SVG carica.
 */
export function SiteHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="flex h-20 items-center justify-between px-6 lg:px-12">
      <Link href="/" aria-label="MIRA">
        <img src="/brand/mira-lockup.svg" alt="MIRA" width={82} height={28} className="h-7 w-auto" />
      </Link>
      {children ? <div className="flex items-center gap-4">{children}</div> : null}
    </header>
  );
}
