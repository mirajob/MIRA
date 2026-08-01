"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { APP_TIME_ZONE } from "@/lib/format-date";

/**
 * Calendario per scegliere i giorni. Si clicca, oppure si trascina su più giorni.
 *
 * Il trascinamento non è un vezzo: una sessione di colloqui copre quasi sempre
 * giorni consecutivi, e selezionarli uno per uno su due settimane è la stessa
 * fatica che avevano i campi data. Trascinando da un giorno già selezionato si
 * deseleziona, come ci si aspetta da una selezione.
 *
 * Due mesi affiancati perché le selezioni cadono spesso a cavallo fra la fine di
 * un mese e l'inizio del successivo.
 */
export function DayPicker({
  selected,
  onChange,
  locale,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
  locale: string;
}) {
  const today = useMemo(
    () =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: APP_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date()),
    []
  );

  const [monthOffset, setMonthOffset] = useState(0);
  const drag = useRef<{ anchor: string; adding: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);

  // Il rilascio può avvenire fuori dal calendario: senza questo la selezione
  // resterebbe "appiccicata" al puntatore.
  useEffect(() => {
    function stop() {
      drag.current = null;
      setDragging(false);
    }
    window.addEventListener("pointerup", stop);
    return () => window.removeEventListener("pointerup", stop);
  }, []);

  const months = useMemo(() => {
    const parts = today.split("-");
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    return [0, 1].map((i) => {
      const date = new Date(Date.UTC(year, month - 1 + monthOffset + i, 1));
      return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
    });
  }, [today, monthOffset]);

  const weekdayLabels = useMemo(() => {
    // Lunedì primo giorno: è così che si legge un calendario in Italia.
    const monday = Date.UTC(2024, 0, 1);
    return Array.from({ length: 7 }, (_, i) =>
      new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" }).format(
        new Date(monday + i * 86_400_000)
      )
    );
  }, [locale]);

  function applyRange(from: string, to: string, adding: boolean) {
    const [start, end] = from <= to ? [from, to] : [to, from];
    const range: string[] = [];
    for (let d = new Date(`${start}T12:00:00Z`); ; d.setUTCDate(d.getUTCDate() + 1)) {
      const iso = d.toISOString().slice(0, 10);
      if (iso >= today) range.push(iso);
      if (iso >= end) break;
    }

    const next = new Set(selected);
    for (const iso of range) {
      if (adding) next.add(iso);
      else next.delete(iso);
    }
    onChange([...next].sort());
  }

  function startDrag(iso: string) {
    const adding = !selected.includes(iso);
    drag.current = { anchor: iso, adding };
    setDragging(true);
    applyRange(iso, iso, adding);
  }

  function extendDrag(iso: string) {
    if (!drag.current) return;
    applyRange(drag.current.anchor, iso, drag.current.adding);
  }

  return (
    <div className="select-none">
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
        <span className="ml-2 text-body-sm text-ink-tertiary">
          {dragging ? "..." : null}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {months.map(({ year, month }) => {
          const first = new Date(Date.UTC(year, month, 1));
          const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
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
                {weekdayLabels.map((labelText, i) => (
                  <span key={i} className="py-1 text-center text-xs text-ink-tertiary">
                    {labelText}
                  </span>
                ))}

                {Array.from({ length: leading }, (_, i) => (
                  <span key={`pad-${i}`} />
                ))}

                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const isPast = iso < today;
                  const isSelected = selected.includes(iso);

                  return (
                    <button
                      key={iso}
                      type="button"
                      disabled={isPast}
                      onPointerDown={(e) => {
                        if (isPast) return;
                        // Necessario perché il puntatore continui a mandare eventi
                        // anche uscendo dal bottone su cui è partito.
                        e.currentTarget.releasePointerCapture?.(e.pointerId);
                        startDrag(iso);
                      }}
                      onPointerEnter={() => {
                        if (!isPast) extendDrag(iso);
                      }}
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
