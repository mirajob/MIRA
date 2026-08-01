"use client";

import { useMemo, useState } from "react";
import { APP_TIME_ZONE } from "@/lib/format-date";

/**
 * Calendario per scegliere i giorni. Si clicca sui giorni, non si digitano le date.
 *
 * Mostra due mesi perché le selezioni si organizzano quasi sempre a cavallo fra
 * la fine di un mese e l'inizio del successivo, e costringere a cambiare mese per
 * vedere la settimana dopo è un attrito inutile.
 */
export function DayPicker({
  selected,
  onToggle,
  locale,
}: {
  selected: string[];
  onToggle: (date: string) => void;
  locale: string;
}) {
  const today = useMemo(() => {
    // Il "oggi" giusto è quello italiano, non quello del fuso del server.
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: APP_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    return parts;
  }, []);

  const [monthOffset, setMonthOffset] = useState(0);

  const months = useMemo(() => {
    const parts = today.split("-");
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    return [0, 1].map((i) => {
      const date = new Date(Date.UTC(year, month - 1 + monthOffset + i, 1));
      return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
    });
  }, [today, monthOffset]);

  const selectedSet = new Set(selected);
  const weekdayLabels = useMemo(() => {
    // Lunedì come primo giorno: è così che si guarda un calendario in Italia.
    const base = Date.UTC(2024, 0, 1); // un lunedì
    return Array.from({ length: 7 }, (_, i) =>
      new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" }).format(
        new Date(base + i * 86_400_000)
      )
    );
  }, [locale]);

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMonthOffset((o) => Math.max(0, o - 1))}
          disabled={monthOffset === 0}
          className="rounded px-2 py-0.5 text-body-sm text-navy hover:bg-navy-50 disabled:opacity-30"
        >
          &larr;
        </button>
        <button
          type="button"
          onClick={() => setMonthOffset((o) => o + 1)}
          className="rounded px-2 py-0.5 text-body-sm text-navy hover:bg-navy-50"
        >
          &rarr;
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {months.map(({ year, month }) => {
          const first = new Date(Date.UTC(year, month, 1));
          const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
          // getUTCDay(): domenica = 0. Con lunedì primo, domenica va in fondo.
          const leading = (first.getUTCDay() + 6) % 7;

          return (
            <div key={`${year}-${month}`}>
              <p className="mb-1 text-eyebrow uppercase text-navy/60">
                {new Intl.DateTimeFormat(locale, {
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                }).format(first)}
              </p>

              <div className="grid grid-cols-7 gap-0.5">
                {weekdayLabels.map((label, i) => (
                  <span key={i} className="py-1 text-center text-xs text-ink-tertiary">
                    {label}
                  </span>
                ))}

                {Array.from({ length: leading }, (_, i) => (
                  <span key={`pad-${i}`} />
                ))}

                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const isPast = iso < today;
                  const isSelected = selectedSet.has(iso);

                  return (
                    <button
                      key={iso}
                      type="button"
                      disabled={isPast}
                      onClick={() => onToggle(iso)}
                      className={`aspect-square rounded text-body-sm transition-colors duration-100 ${
                        isSelected
                          ? "bg-navy font-medium text-white"
                          : isPast
                            ? "text-ink-tertiary/40"
                            : "text-ink hover:bg-navy-50"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
