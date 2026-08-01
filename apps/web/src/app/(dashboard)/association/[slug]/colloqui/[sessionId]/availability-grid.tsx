"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { setMyAvailability } from "@/lib/actions/interview-sessions";
import { APP_TIME_ZONE } from "@/lib/format-date";
import { interviewerColor } from "@/lib/interview-slots";

export interface AvailabilityBlock {
  startsAt: string;
  endsAt: string;
  /** Chi è già disponibile su questo blocco, escluso chi guarda. */
  others: { userId: string; initials: string; name: string }[];
  /** true se chi guarda si è già dichiarato disponibile qui. */
  mine: boolean;
  /** Candidato prenotato su questa fascia, se c'è. */
  bookedName: string | null;
}

/**
 * Le disponibilità del board su una sessione.
 *
 * Ogni riga è una fascia oraria, e ci si clicca sopra per dire "qui ci sono".
 * Le disponibilità degli altri si vedono accanto, ognuno col suo colore: serve a
 * capire a colpo d'occhio dove siete scoperti senza leggere una lista di nomi.
 *
 * Si salva tutto insieme e non a ogni click: così si può cambiare idea mentre si
 * guarda la settimana, e quello che si vede è quello che finisce salvato.
 */
export function AvailabilityGrid({
  sessionId,
  slug,
  blocks,
  requiredInterviewers,
  dateLocale,
}: {
  sessionId: string;
  slug: string;
  blocks: AvailabilityBlock[];
  requiredInterviewers: number;
  dateLocale: string;
}) {
  const t = useTranslations("Interviews");
  const router = useRouter();
  const [mine, setMine] = useState<Set<string>>(
    () => new Set(blocks.filter((b) => b.mine).map((b) => b.startsAt))
  );
  const [saving, setSaving] = useState(false);

  const dirty = useMemo(() => {
    const original = new Set(blocks.filter((b) => b.mine).map((b) => b.startsAt));
    if (original.size !== mine.size) return true;
    for (const key of mine) if (!original.has(key)) return true;
    return false;
  }, [blocks, mine]);

  const days = useMemo(() => {
    const byDay = new Map<string, AvailabilityBlock[]>();
    for (const block of blocks) {
      const day = new Date(block.startsAt).toLocaleDateString(dateLocale, {
        timeZone: APP_TIME_ZONE,
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      byDay.set(day, [...(byDay.get(day) ?? []), block]);
    }
    return [...byDay.entries()];
  }, [blocks, dateLocale]);

  function toggle(block: AvailabilityBlock) {
    if (block.bookedName) return;
    setMine((prev) => {
      const next = new Set(prev);
      if (next.has(block.startsAt)) next.delete(block.startsAt);
      else next.add(block.startsAt);
      return next;
    });
  }

  function toggleDay(dayBlocks: AvailabilityBlock[]) {
    const free = dayBlocks.filter((b) => !b.bookedName);
    const all = free.every((b) => mine.has(b.startsAt));
    setMine((prev) => {
      const next = new Set(prev);
      for (const b of free) {
        if (all) next.delete(b.startsAt);
        else next.add(b.startsAt);
      }
      return next;
    });
  }

  async function save() {
    setSaving(true);
    const chosen = blocks.filter((b) => mine.has(b.startsAt));
    const result = await setMyAvailability({
      sessionId,
      slug,
      blocks: chosen.map((b) => ({ startsAt: b.startsAt, endsAt: b.endsAt })),
    });
    if (result.error) window.alert(result.error);
    router.refresh();
    setSaving(false);
  }

  if (!blocks.length) {
    return (
      <div className="rounded-lg border border-border bg-white p-6 text-center">
        <p className="text-body-sm text-ink-secondary">{t("noSlots")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-white px-4 py-3">
        <p className="text-body-sm text-ink">{t("availabilityIntro")}</p>
        {dirty && (
          <button
            onClick={save}
            disabled={saving}
            className="ml-auto rounded-md bg-petrol px-4 py-1.5 text-body-sm text-white transition-colors duration-100 hover:bg-petrol-700 disabled:opacity-40"
          >
            {saving ? t("working") : t("saveAvailability")}
          </button>
        )}
      </div>

      {days.map(([day, dayBlocks]) => (
        <div key={day} className="overflow-hidden rounded-lg border border-border bg-white">
          <div className="flex items-center gap-3 border-b border-border bg-navy-50/50 px-3 py-1.5">
            <p className="text-eyebrow uppercase text-navy/70">{day}</p>
            <button
              onClick={() => toggleDay(dayBlocks)}
              className="ml-auto text-body-sm text-petrol hover:underline"
            >
              {t("selectDay")}
            </button>
          </div>

          <div className="divide-y divide-border">
            {dayBlocks.map((block) => {
              const isMine = mine.has(block.startsAt);
              const coverage = block.others.length + (isMine ? 1 : 0);
              const uncovered = coverage < requiredInterviewers;
              const time = new Date(block.startsAt).toLocaleTimeString(dateLocale, {
                timeZone: APP_TIME_ZONE,
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div key={block.startsAt} className="flex items-center gap-3 px-3 py-1.5">
                  <button
                    onClick={() => toggle(block)}
                    disabled={Boolean(block.bookedName)}
                    className={`w-20 shrink-0 rounded px-2 py-1 text-left text-body-sm tabular-nums transition-colors duration-100 ${
                      isMine
                        ? "bg-petrol text-white"
                        : block.bookedName
                          ? "text-ink-tertiary"
                          : "text-navy hover:bg-navy-50"
                    }`}
                  >
                    {time}
                  </button>

                  {/* Chi c'è: un pallino colorato per persona, il colore è stabile */}
                  <div className="flex flex-1 flex-wrap items-center gap-1">
                    {block.others.map((person) => {
                      const color = interviewerColor(person.userId);
                      return (
                        <span
                          key={person.userId}
                          title={person.name}
                          className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${color.bg} ${color.text}`}
                        >
                          {person.initials}
                        </span>
                      );
                    })}
                    {isMine && (
                      <span className="text-body-sm text-petrol">{t("availabilityYou")}</span>
                    )}
                    {coverage === 0 && (
                      <span className="text-body-sm text-ink-tertiary">{t("nobodyYet")}</span>
                    )}
                  </div>

                  <div className="shrink-0 text-body-sm">
                    {block.bookedName ? (
                      <span className="font-medium text-navy">{block.bookedName}</span>
                    ) : uncovered ? (
                      <span className="text-warning">{t("slotUncovered")}</span>
                    ) : (
                      <span className="text-ink-tertiary">{t("slotBookable")}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
