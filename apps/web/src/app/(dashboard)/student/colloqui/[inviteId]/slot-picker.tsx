"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { bookInterviewSlot } from "@/lib/actions/interview-booking";
import { APP_TIME_ZONE } from "@/lib/format-date";

export interface BookableSlot {
  id: string;
  startsAt: string;
}

/**
 * Lo studente sceglie l'orario. Un click, una conferma, finito.
 *
 * Se qualcun altro prende lo stesso orario un istante prima, il server rifiuta e
 * qui compare il motivo: meglio un messaggio chiaro che due persone convocate
 * alla stessa ora.
 */
export function SlotPicker({
  inviteId,
  slots,
  currentSlotId,
  dateLocale,
}: {
  inviteId: string;
  slots: BookableSlot[];
  currentSlotId: string | null;
  dateLocale: string;
}) {
  const t = useTranslations("StudentInterviews");
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(() => {
    const byDay = new Map<string, BookableSlot[]>();
    for (const slot of slots) {
      const day = new Date(slot.startsAt).toLocaleDateString(dateLocale, {
        timeZone: APP_TIME_ZONE,
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      byDay.set(day, [...(byDay.get(day) ?? []), slot]);
    }
    return [...byDay.entries()];
  }, [slots, dateLocale]);

  async function pick(slotId: string) {
    setError(null);
    setPending(slotId);
    const result = await bookInterviewSlot({ inviteId, slotId });
    if (result.error) {
      setError(result.error);
      setPending(null);
      router.refresh();
      return;
    }
    router.refresh();
    setPending(null);
  }

  if (!slots.length) {
    return (
      <div className="rounded-lg border border-border bg-white p-6 text-center">
        <p className="text-body-sm text-ink-secondary">{t("noSlotsLeft")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && <p className="rounded-md bg-error-bg px-3 py-2 text-body-sm text-error">{error}</p>}

      {days.map(([day, daySlots]) => (
        <div key={day} className="overflow-hidden rounded-lg border border-border bg-white">
          <div className="border-b border-border bg-navy-50/50 px-3 py-1.5">
            <p className="text-eyebrow uppercase text-navy/70">{day}</p>
          </div>
          <div className="flex flex-wrap gap-2 p-3">
            {daySlots.map((slot) => {
              const isCurrent = slot.id === currentSlotId;
              const time = new Date(slot.startsAt).toLocaleTimeString(dateLocale, {
                timeZone: APP_TIME_ZONE,
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <button
                  key={slot.id}
                  onClick={() => pick(slot.id)}
                  disabled={pending !== null || isCurrent}
                  className={`rounded-md px-4 py-2 text-body-sm tabular-nums transition-colors duration-100 disabled:opacity-60 ${
                    isCurrent
                      ? "bg-petrol text-white"
                      : "border border-border text-navy hover:border-petrol hover:bg-petrol-50"
                  }`}
                >
                  {pending === slot.id ? "..." : time}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
