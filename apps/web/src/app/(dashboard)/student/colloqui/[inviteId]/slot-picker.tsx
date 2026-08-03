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
  // Ogni scelta passa da una conferma: il click su un orario fa partire una mail
  // e fissa un appuntamento vero, e sfiorare il pulsante sbagliato non deve
  // bastare a convocarti.
  const [confirming, setConfirming] = useState<string | null>(null);

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

  function requestPick(slotId: string) {
    setConfirming(slotId);
  }

  async function pick(slotId: string) {
    setError(null);
    setConfirming(null);
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

      {confirming && (
        <div className="rounded-lg border border-petrol/30 bg-petrol-50 px-4 py-3">
          <p className="text-body-sm text-ink">
            {t(currentSlotId ? "confirmMove" : "confirmBook", {
              date: new Date(
                slots.find((s) => s.id === confirming)?.startsAt ?? ""
              ).toLocaleString(dateLocale, {
                timeZone: APP_TIME_ZONE,
                weekday: "long",
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              }),
            })}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <button
              onClick={() => pick(confirming)}
              disabled={pending !== null}
              className="rounded-md bg-petrol px-4 py-1.5 text-body-sm text-white transition-colors duration-100 hover:bg-petrol-700 disabled:opacity-40"
            >
              {t(currentSlotId ? "confirmMoveCta" : "confirmBookCta")}
            </button>
            <button
              onClick={() => setConfirming(null)}
              className="text-body-sm text-ink-secondary hover:underline"
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      )}

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
                  onClick={() => requestPick(slot.id)}
                  disabled={pending !== null || isCurrent}
                  className={`rounded-md px-4 py-2 text-body-sm tabular-nums transition-colors duration-100 disabled:opacity-60 ${
                    isCurrent
                      ? "bg-petrol text-white"
                      : confirming === slot.id
                        ? "border-2 border-petrol bg-petrol-50 text-navy"
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
