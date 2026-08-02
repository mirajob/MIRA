"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { setSlotMeetingLink } from "@/lib/actions/interview-booking";
import { APP_TIME_ZONE } from "@/lib/format-date";

export interface BookedInterview {
  slotId: string;
  startsAt: string;
  candidateName: string;
  candidateEmail: string;
  interviewerName: string | null;
  /** Link del singolo colloquio, se la sessione lavora in per_interview. */
  meetingLink: string | null;
}

/**
 * I colloqui fissati: quando, con chi, e chi li conduce.
 *
 * È la lista che serve il giorno prima dei colloqui, e finora non esisteva: i
 * nomi comparivano sparsi dentro la griglia delle disponibilità, dove si trovano
 * solo scorrendo. Qui c'è anche il campo del link, perché quando ogni colloquio
 * ha il suo è questo il momento in cui lo si incolla.
 */
export function BookedInterviews({
  slug,
  sessionId,
  interviews,
  needsLink,
  placeIsLink,
  dateLocale,
}: {
  slug: string;
  sessionId: string;
  interviews: BookedInterview[];
  /** true quando ogni colloquio ha il suo posto, deciso dopo la prenotazione. */
  needsLink: boolean;
  /** true se quel posto è un link, false se è un'aula. */
  placeIsLink: boolean;
  dateLocale: string;
}) {
  const t = useTranslations("Interviews");
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  async function saveLink(slotId: string) {
    setSaving(slotId);
    const result = await setSlotMeetingLink({
      slotId,
      slug,
      sessionId,
      link: drafts[slotId] ?? "",
    });
    if (result.error) window.alert(result.error);
    else {
      // La bozza si toglie, non si svuota: con la stringa vuota il campo mostrava
      // "" invece del link appena salvato, e sembrava che si fosse cancellato.
      setDrafts((d) => {
        const next = { ...d };
        delete next[slotId];
        return next;
      });
    }
    router.refresh();
    setSaving(null);
  }

  if (!interviews.length) {
    return (
      <div className="rounded-lg border border-border bg-white px-4 py-3">
        <p className="text-eyebrow uppercase text-navy/60">{t("bookedHeading")}</p>
        <p className="mt-1 text-body-sm text-ink-secondary">{t("bookedEmpty")}</p>
      </div>
    );
  }

  const missingLinks = needsLink ? interviews.filter((i) => !i.meetingLink).length : 0;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      <div className="flex flex-wrap items-baseline gap-3 border-b border-border bg-navy-50/50 px-3 py-1.5">
        <p className="text-eyebrow uppercase text-navy/70">
          {t("bookedHeading")} ({interviews.length})
        </p>
        {missingLinks > 0 && (
          <p className="text-body-sm text-warning">{placeIsLink ? t("missingLinks", { count: missingLinks }) : t("missingPlaces", { count: missingLinks })}</p>
        )}
      </div>

      <div className="divide-y divide-border">
        {interviews.map((interview) => {
          const when = new Date(interview.startsAt).toLocaleString(dateLocale, {
            timeZone: APP_TIME_ZONE,
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <div key={interview.slotId} className="px-3 py-2.5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-body-sm tabular-nums text-navy">{when}</span>
                <span className="text-body-sm font-medium text-navy">{interview.candidateName}</span>
                <span className="text-body-sm text-ink-tertiary">{interview.candidateEmail}</span>
                <span className="ml-auto text-body-sm text-ink-secondary">
                  {interview.interviewerName
                    ? t("conductedBy", { name: interview.interviewerName })
                    : t("noInterviewerAssigned")}
                </span>
              </div>

              {needsLink && (
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <input
                    value={drafts[interview.slotId] ?? interview.meetingLink ?? ""}
                    onChange={(e) =>
                      setDrafts((d) => ({ ...d, [interview.slotId]: e.target.value }))
                    }
                    placeholder={placeIsLink ? t("linkPlaceholder") : t("locationPlaceholder")}
                    className="min-w-[240px] flex-1 rounded-md border border-border px-3 py-1 text-body-sm text-ink focus:border-petrol focus:outline-none"
                  />
                  <button
                    onClick={() => saveLink(interview.slotId)}
                    disabled={saving === interview.slotId}
                    className="rounded-md bg-navy px-3 py-1 text-body-sm text-white transition-colors duration-100 hover:bg-navy-700 disabled:opacity-40"
                  >
                    {saving === interview.slotId ? t("working") : t("saveLink")}
                  </button>
                  {interview.meetingLink && (
                    <span className="text-body-sm text-success">{t("linkSent")}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
