"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * La striscia in cima a ogni pagina della dashboard.
 *
 * Serve a dare a tutte le schermate la stessa struttura: dove sei, come si torna
 * indietro, quali sezioni ci sono. Prima ogni pagina se la costruiva per conto
 * suo, con titoli grandi che ripetevano la voce già accesa nella barra laterale
 * e link "torna a" lunghi in mezzo al contenuto.
 *
 * Resta agganciata in alto quando si scorre: le sezioni devono essere
 * raggiungibili anche a metà di un elenco lungo, senza risalire.
 */

export interface PageTab {
  label: string;
  href: string;
}

/** Il passo indietro: solo l'icona, l'etichetta la leggono gli screen reader. */
const BACK_CLASS =
  "-ml-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-tertiary transition-colors duration-100 hover:bg-navy-50 hover:text-navy";

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} aria-label={label} title={label} className={BACK_CLASS}>
      <BackIcon />
    </Link>
  );
}

/**
 * Stesso passo indietro, ma per i ritorni che non sono una navigazione: un form a
 * più passaggi che torna al passaggio precedente. L'aspetto deve restare identico,
 * altrimenti in giro per il sito il "torna indietro" cambia faccia da schermata a
 * schermata.
 */
export function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={BACK_CLASS}>
      <BackIcon />
    </button>
  );
}

/**
 * L'intestazione di una pagina di dettaglio dentro un'area che ha già la sua
 * barra fissa (il workspace di un'associazione). Stessa geometria della barra,
 * ma scorre col contenuto: due strisce agganciate una sull'altra mangerebbero
 * mezza schermata sul telefono.
 */
export function DetailHeader({
  back,
  title,
  meta,
  actions,
}: {
  back: { href: string; label: string };
  title: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-8 flex-wrap items-center gap-x-3 gap-y-1">
      <BackLink href={back.href} label={back.label} />
      <h1 className="min-w-0 text-body font-medium text-navy">{title}</h1>
      {meta && <div className="min-w-0 text-body-sm text-ink-tertiary">{meta}</div>}
      {actions && <div className="ml-auto flex shrink-0 items-center gap-3">{actions}</div>}
    </div>
  );
}

export function PageBar({
  title,
  meta,
  back,
  tabs,
  actions,
}: {
  /** Dove sei. Piccolo: è un'etichetta, non un titolo di apertura. */
  title: string;
  /** A destra del titolo, in tono minore: il ruolo, lo stato, la fase. */
  meta?: React.ReactNode;
  /** Il passo indietro. Solo l'icona, con l'etichetta leggibile agli screen reader. */
  back?: { href: string; label: string };
  tabs?: PageTab[];
  actions?: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="sticky top-14 z-30 -mx-4 -mt-6 mb-4 border-b border-border bg-paper/90 px-4 pb-2 pt-3 backdrop-blur lg:top-0 lg:-mx-8 lg:-mt-8 lg:px-8 lg:pt-5">
      <div className="flex min-h-7 items-center gap-2">
        {back && <BackLink href={back.href} label={back.label} />}
        <p className="min-w-0 truncate text-body-sm font-medium text-navy">{title}</p>
        {meta && <div className="min-w-0 truncate text-body-sm text-ink-tertiary">{meta}</div>}
        {actions && <div className="ml-auto flex shrink-0 items-center gap-3">{actions}</div>}
      </div>

      {tabs && tabs.length > 0 && (
        <nav className="-mb-px mt-2 flex gap-4 overflow-x-auto">
          {tabs.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`whitespace-nowrap border-b-2 pb-2 text-body-sm transition-colors duration-100 ${
                  active
                    ? "border-navy font-medium text-navy"
                    : "border-transparent text-ink-secondary hover:text-navy"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
