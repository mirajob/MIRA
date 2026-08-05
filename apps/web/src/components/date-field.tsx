"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { splitISO, toISO, daysInMonth, formatDay, todayISO } from "@/lib/disponibilita";

/**
 * Campo data con calendario, per le finestre di disponibilità.
 *
 * Il giorno preciso conta: chi finisce gli esami il 19 giugno è libero da quel giorno,
 * e scrivendo "da giugno" quell'informazione si perdeva. Quindi niente campo di testo:
 * si sceglie sul calendario, e quello che finisce nel dato è una data vera.
 *
 * Un mese alla volta, con le frecce. Il DayPicker dei colloqui ne mostra due affiancati
 * perché lì si selezionano intervalli lunghi trascinando; qui si sceglie un giorno solo
 * e due mesi affiancati non entrerebbero nella colonna del modulo.
 */
export function DateField({
  value,
  onChange,
  min,
  placeholder,
  ariaLabel,
}: {
  value: string | null;
  onChange: (next: string) => void;
  /** Nessuna data prima di questa (yyyy-mm-dd): la fine non può precedere l'inizio. */
  min?: string | null;
  placeholder: string;
  ariaLabel: string;
}) {
  const locale = useLocale();
  const t = useTranslations("CardBlocks");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const floor = min ?? todayISO();
  const initial = splitISO(value ?? "") ?? splitISO(floor) ?? { y: new Date().getFullYear(), m: 1, d: 1 };
  const [cursor, setCursor] = useState({ y: initial.y, m: initial.m });

  // Riallinea il mese mostrato quando cambia la data scelta da fuori (es. reset del form).
  useEffect(() => {
    const parts = splitISO(value ?? "");
    if (parts) setCursor({ y: parts.y, m: parts.m });
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function shiftMonth(delta: number) {
    setCursor((c) => {
      const next = c.m + delta;
      if (next < 1) return { y: c.y - 1, m: 12 };
      if (next > 12) return { y: c.y + 1, m: 1 };
      return { y: c.y, m: next };
    });
  }

  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(cursor.y, cursor.m - 1, 1))
  );

  // Griglia che parte da lunedì: in Italia la settimana inizia lì, e un calendario che
  // parte da domenica si legge male anche quando è tecnicamente corretto.
  const firstWeekday = (new Date(Date.UTC(cursor.y, cursor.m - 1, 1)).getUTCDay() + 6) % 7;
  const total = daysInMonth(cursor.y, cursor.m);
  const cells: (string | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: total }, (_, i) => toISO(cursor.y, cursor.m, i + 1)),
  ];

  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, 1 + i)))
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={ariaLabel}
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-body-sm transition-colors duration-100 ${
          open ? "border-petrol" : "border-border hover:border-border-strong"
        } ${value ? "text-ink" : "text-ink-tertiary"}`}
      >
        <span className="truncate">{value ? formatDay(value, locale) : placeholder}</span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-ink-tertiary">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M3 11h18" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-30 w-[268px] rounded-lg border border-border bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label={t("disponibilita.prevMonth")}
              className="flex h-7 w-7 items-center justify-center rounded-md text-ink-tertiary transition-colors hover:bg-navy-50 hover:text-navy"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <span className="text-body-sm font-medium capitalize text-navy">{monthLabel}</span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label={t("disponibilita.nextMonth")}
              className="flex h-7 w-7 items-center justify-center rounded-md text-ink-tertiary transition-colors hover:bg-navy-50 hover:text-navy"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center">
            {weekdays.map((w, i) => (
              <span key={i} className="py-1 text-[10px] uppercase text-ink-tertiary">
                {w}
              </span>
            ))}
            {cells.map((iso, i) => {
              if (!iso) return <span key={`empty-${i}`} />;
              const disabled = iso < floor;
              const selected = iso === value;
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                  className={`h-8 rounded-md text-body-sm transition-colors duration-100 ${
                    selected
                      ? "bg-navy font-medium text-white"
                      : disabled
                        ? "text-ink-tertiary/40"
                        : "text-ink hover:bg-navy-50"
                  }`}
                >
                  {Number(iso.slice(8, 10))}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
