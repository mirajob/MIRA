"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Barra delle sezioni della landing: studenti, associazioni, aziende.
 *
 * Fa due cose. Porta alla sezione (ancora normale, lo scorrimento morbido lo dà il
 * CSS su `html`) e dice in quale sezione sei mentre scorri: la voce attiva resta
 * sottolineata sul bordo della testata, come una linguetta.
 *
 * La sezione attiva si decide con un IntersectionObserver e una fascia stretta a
 * metà viewport: attiva è la sezione che sta passando davanti agli occhi, non quella
 * che entra dal fondo. Senza JS restano tre ancore che funzionano lo stesso.
 */

const SECTIONS = [
  { id: "studenti", key: "navStudents" },
  { id: "associazioni", key: "navAssociations" },
  { id: "aziende", key: "navCompanies" },
] as const;

export function SectionNav() {
  const t = useTranslations("HomePage");
  const [active, setActive] = useState<string>(SECTIONS[0].id);

  useEffect(() => {
    const nodes = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (nodes.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
    );
    nodes.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <nav aria-label={t("navLabel")} className="mx-auto max-w-6xl px-6 lg:px-12">
      {/* Su schermo stretto la riga scorre invece di andare a capo: tre voci a capo
          farebbero crescere la testata agganciata e mangiare mezza schermata. */}
      <ul className="-mx-1 flex items-stretch gap-1 overflow-x-auto lg:justify-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SECTIONS.map((s) => {
          const isActive = active === s.id;
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                aria-current={isActive ? "true" : undefined}
                className={`flex h-11 items-center whitespace-nowrap border-b-2 px-3 text-body-sm transition-colors duration-100 ${
                  isActive
                    ? "border-navy font-medium text-navy"
                    : "border-transparent text-ink-secondary hover:text-navy"
                }`}
              >
                {t(s.key)}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
