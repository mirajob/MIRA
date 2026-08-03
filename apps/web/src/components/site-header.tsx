import Link from "next/link";

/**
 * Testata unica di tutte le pagine pubbliche (home, aziende, associazioni, legali).
 * Prima ognuna aveva la sua: altezze, bordi e dimensioni del logo diversi, che di
 * pagina in pagina si notano. Le azioni a destra (lingua, accedi, CTA) le passa la
 * pagina come children, la cornice resta sempre questa.
 *
 * Resta agganciata in alto durante lo scorrimento: la barra è anche il punto in cui
 * si capisce in che sezione sei (vedi `nav`), quindi sparire non è un'opzione. Il
 * fondo è cream semitrasparente perché tutte le pagine pubbliche hanno quello sfondo.
 *
 * La riga di navigazione fra sezioni (`nav`) è opzionale e sta sotto la testata, su
 * tutta la larghezza: così l'indicatore della sezione attiva poggia sul bordo della
 * barra invece di galleggiare.
 *
 * Il logo ha width/height espliciti: senza, la testata sobbalza mentre l'SVG carica.
 */
export function SiteHeader({ children, nav }: { children?: React.ReactNode; nav?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-cream/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-6 lg:px-12">
        <Link href="/" aria-label="MIRA" className="shrink-0">
          <img src="/brand/mira-lockup.svg" alt="MIRA" width={82} height={28} className="h-7 w-auto" />
        </Link>
        {children ? <div className="flex shrink-0 items-center gap-3">{children}</div> : null}
      </div>
      {nav ? <div className="border-t border-border/60">{nav}</div> : null}
    </header>
  );
}
