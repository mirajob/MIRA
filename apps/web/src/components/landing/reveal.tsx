"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Blocco che compare quando entra in vista e si ritira quando esce, ogni volta:
 * scorrendo su e giù l'effetto si ripete, come nei siti dove il contenuto "respira"
 * lungo la pagina. Fermarlo dopo la prima comparsa lo faceva sembrare rotto al
 * secondo passaggio.
 *
 * Stessa filosofia dei reel: l'animazione è un di più, non un requisito. Senza JS
 * il contenuto si vede comunque (regola `noscript` in `globals.css`), e con
 * prefers-reduced-motion compare subito senza spostamenti.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) setShown(entry.isIntersecting);
      },
      // La fascia si chiude un po' sopra e un po' sotto la finestra: il blocco si
      // ritira solo quando è davvero uscito, non appena tocca il bordo.
      { threshold: 0, rootMargin: "-4% 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`mira-reveal ${shown ? "is-in" : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
