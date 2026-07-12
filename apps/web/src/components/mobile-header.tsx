"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

/**
 * Barra superiore mobile (< lg) del layout dashboard: logo + hamburger che apre
 * un pannello laterale con la stessa navigazione della sidebar desktop.
 * `nav` e `user` arrivano già renderizzati dal layout server, così questo
 * componente client non deve rifare fetch di ruoli/membership.
 */
export function MobileHeader({ nav, user }: { nav: React.ReactNode; user: React.ReactNode }) {
  const t = useTranslations("MobileNav");
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Chiude il pannello quando si naviga verso un'altra pagina
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-white px-4 lg:hidden">
      <Link href="/student">
        <img src="/brand/mira-lockup.svg" alt="MIRA" className="h-5" />
      </Link>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("openMenu")}
        className="flex h-9 w-9 items-center justify-center rounded-md text-navy hover:bg-navy-50 transition-colors duration-100"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-navy/30"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 top-0 flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <img src="/brand/mira-lockup.svg" alt="MIRA" className="h-5" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("closeMenu")}
                className="flex h-9 w-9 items-center justify-center rounded-md text-ink-secondary hover:bg-navy-50 hover:text-navy transition-colors duration-100"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-4">{nav}</div>
            <div className="border-t border-border px-3 py-3">{user}</div>
          </div>
        </div>
      )}
    </header>
  );
}
