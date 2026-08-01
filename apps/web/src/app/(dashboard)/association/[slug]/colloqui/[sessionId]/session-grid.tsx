"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { setInterviewerCoverage } from "@/lib/actions/interview-sessions";
import { APP_TIME_ZONE } from "@/lib/format-date";

export interface GridSlot {
  id: string;
  startsAt: string;
  track: number;
  /** Iniziali di chi copre lo slot, per non stampare nomi interi in ogni casella. */
  interviewers: { userId: string; label: string }[];
  candidateName: string | null;
  /** true se l'utente che guarda si è già preso questo slot. */
  mine: boolean;
}

/**
 * La griglia dei colloqui: righe le fasce orarie, colonne i colloqui in parallelo.
 *
 * Si seleziona per riga e non per singola casella, e c'è "tutto il giorno": su una
 * griglia da quaranta caselle nessuno del board si prenderebbe i turni uno per uno,
 * e un turno che nessuno si prende è uno studente che si presenta a vuoto.
 */
export function SessionGrid({
  sessionId,
  slug,
  slots,
  tracks,
  dateLocale,
}: {
  sessionId: string;
  slug: string;
  slots: GridSlot[];
  tracks: number;
  dateLocale: string;
}) {
  const t = useTranslations("Interviews");
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const days = useMemo(() => {
    const byDay = new Map<string, Map<string, GridSlot[]>>();
    for (const slot of slots) {
      const day = new Date(slot.startsAt).toLocaleDateString(dateLocale, {
        timeZone: APP_TIME_ZONE,
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      const rows = byDay.get(day) ?? new Map<string, GridSlot[]>();
      const time = new Date(slot.startsAt).toLocaleTimeString(dateLocale, {
        timeZone: APP_TIME_ZONE,
        hour: "2-digit",
        minute: "2-digit",
      });
      rows.set(time, [...(rows.get(time) ?? []), slot]);
      byDay.set(day, rows);
    }
    return [...byDay.entries()];
  }, [slots, dateLocale]);

  function toggleRow(rowSlots: GridSlot[]) {
    const ids = rowSlots.map((s) => s.id);
    const allSelected = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  function toggleDay(rows: Map<string, GridSlot[]>) {
    const ids = [...rows.values()].flat().map((s) => s.id);
    const allSelected = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  async function apply(covering: boolean) {
    if (!selected.size) return;
    setLoading(true);
    const result = await setInterviewerCoverage({
      sessionId,
      slug,
      slotIds: [...selected],
      covering,
    });
    if (result.error) window.alert(result.error);
    else setSelected(new Set());
    router.refresh();
    setLoading(false);
  }

  if (!slots.length) {
    return (
      <div className="rounded-lg border border-border bg-white p-6 text-center">
        <p className="text-body-sm text-ink-secondary">{t("noSlots")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="sticky top-0 z-20 flex flex-wrap items-center gap-3 rounded-lg border border-petrol/30 bg-petrol-50 px-3 py-2">
          <p className="text-body-sm text-ink">{t("selectedSlots", { count: selected.size })}</p>
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => apply(true)}
              disabled={loading}
              className="rounded-md bg-petrol px-4 py-1.5 text-body-sm text-white transition-colors duration-100 hover:bg-petrol-700 disabled:opacity-40"
            >
              {loading ? t("working") : t("coverCta")}
            </button>
            <button
              onClick={() => apply(false)}
              disabled={loading}
              className="text-body-sm text-ink-secondary hover:underline disabled:opacity-40"
            >
              {t("uncoverCta")}
            </button>
          </div>
        </div>
      )}

      {days.map(([day, rows]) => (
        <div key={day} className="overflow-hidden rounded-lg border border-border bg-white">
          <div className="flex items-center gap-3 border-b border-border bg-navy-50/50 px-3 py-1.5">
            <p className="text-eyebrow uppercase text-navy/70">{day}</p>
            <button
              onClick={() => toggleDay(rows)}
              className="ml-auto text-body-sm text-petrol hover:underline"
            >
              {t("selectDay")}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <tbody>
                {[...rows.entries()].map(([time, rowSlots]) => {
                  const rowSelected = rowSlots.every((s) => selected.has(s.id));
                  return (
                    <tr key={time} className="border-b border-border last:border-0">
                      <td className="w-24 px-3 py-1.5 align-top">
                        <button
                          onClick={() => toggleRow(rowSlots)}
                          className={`w-full rounded px-1.5 py-0.5 text-left text-body-sm tabular-nums transition-colors ${
                            rowSelected ? "bg-navy text-white" : "text-navy hover:bg-navy-50"
                          }`}
                        >
                          {time}
                        </button>
                      </td>

                      {Array.from({ length: tracks }, (_, i) => i + 1).map((track) => {
                        const slot = rowSlots.find((s) => s.track === track);
                        if (!slot) return <td key={track} className="px-2 py-1.5" />;

                        const isSelected = selected.has(slot.id);
                        const uncovered = slot.interviewers.length === 0;

                        return (
                          <td key={track} className="px-2 py-1.5 align-top">
                            <div
                              className={`rounded-md border px-2 py-1 text-body-sm ${
                                isSelected
                                  ? "border-petrol bg-petrol-50"
                                  : slot.candidateName
                                    ? "border-border bg-navy-50/60"
                                    : uncovered
                                      ? "border-dashed border-border"
                                      : "border-border"
                              }`}
                            >
                              {slot.candidateName ? (
                                <p className="truncate font-medium text-navy">{slot.candidateName}</p>
                              ) : (
                                <p className="text-ink-tertiary">{t("slotFree")}</p>
                              )}

                              <p className="mt-0.5 truncate text-xs text-ink-tertiary">
                                {uncovered ? (
                                  <span className="text-warning">{t("slotUncovered")}</span>
                                ) : (
                                  slot.interviewers.map((i) => i.label).join(", ")
                                )}
                                {slot.mine && <span className="ml-1 text-petrol">{t("slotMine")}</span>}
                              </p>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
