"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { createInterviewSession, updateInterviewSession } from "@/lib/actions/interview-sessions";
import { generateSlots, type InterviewWindow } from "@/lib/interview-slots";
import { DayPicker } from "@/components/day-picker";
import { APP_TIME_ZONE } from "@/lib/format-date";

/**
 * Creazione di un round di colloqui.
 *
 * I giorni si scelgono su un calendario, non digitando date: la prima versione
 * aveva dei campi data e non si capiva nemmeno che si potessero mettere più
 * giornate. L'orario ha un valore che vale per tutti i giorni scelti e si può
 * cambiare su quelli che fanno eccezione.
 */
export interface SessionInitialValues {
  title: string;
  description: string;
  mode: "online" | "in_person";
  linkMode: "shared" | "per_interview" | "auto";
  location: string;
  meetingLink: string;
  slotDurationMinutes: number;
  breakMinutes: number;
  parallelTracks: number;
  requiredInterviewers: number;
  windows: InterviewWindow[];
}

export function SessionForm({
  associationId,
  slug,
  cycleId,
  sessionId,
  initial,
  onDone,
}: {
  associationId: string;
  slug: string;
  cycleId: string;
  /** Presente quando si modifica un round esistente invece di crearne uno. */
  sessionId?: string;
  initial?: SessionInitialValues;
  onDone: () => void;
}) {
  const t = useTranslations("Interviews");
  const locale = useLocale();
  const dateLocale = locale === "it" ? "it-IT" : "en-US";
  const router = useRouter();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [mode, setMode] = useState<"online" | "in_person">(initial?.mode ?? "in_person");
  const [linkMode, setLinkMode] = useState<"shared" | "per_interview" | "auto">(
    initial?.linkMode ?? "auto"
  );
  const [location, setLocation] = useState(initial?.location ?? "");
  const [meetingLink, setMeetingLink] = useState(initial?.meetingLink ?? "");
  const [duration, setDuration] = useState(initial?.slotDurationMinutes ?? 20);
  const [pause, setPause] = useState(initial?.breakMinutes ?? 5);
  const [tracks, setTracks] = useState(initial?.parallelTracks ?? 1);
  const [requiredInterviewers, setRequiredInterviewers] = useState(
    initial?.requiredInterviewers ?? 1
  );

  const [defaultStart, setDefaultStart] = useState(initial?.windows[0]?.start ?? "15:00");
  const [defaultEnd, setDefaultEnd] = useState(initial?.windows[0]?.end ?? "19:00");
  const [days, setDays] = useState<string[]>(initial?.windows.map((w) => w.date) ?? []);
  const [perDay, setPerDay] = useState<Record<string, { start: string; end: string }>>(() =>
    Object.fromEntries(
      (initial?.windows ?? []).map((w) => [w.date, { start: w.start, end: w.end }])
    )
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const windows: InterviewWindow[] = useMemo(
    () =>
      [...days].sort().map((date) => ({
        date,
        start: perDay[date]?.start ?? defaultStart,
        end: perDay[date]?.end ?? defaultEnd,
      })),
    [days, perDay, defaultStart, defaultEnd]
  );

  const preview = useMemo(
    () =>
      generateSlots({
        windows,
        slotDurationMinutes: duration,
        breakMinutes: pause,
        parallelTracks: tracks,
      }),
    [windows, duration, pause, tracks]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      slug,
      title,
      description,
      mode,
      linkMode,
      location,
      meetingLink,
      slotDurationMinutes: duration,
      breakMinutes: pause,
      parallelTracks: tracks,
      requiredInterviewers,
      windows,
    };

    const result = sessionId
      ? await updateInterviewSession({ ...payload, sessionId })
      : await createInterviewSession({ ...payload, associationId, cycleId });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.refresh();
    onDone();
  }

  const field =
    "w-full rounded-md border border-border px-3 py-1.5 text-body-sm text-ink focus:border-petrol focus:outline-none";
  const label = "mb-1 block text-eyebrow uppercase text-navy/60";

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-border bg-white p-4">
      <p className="text-eyebrow uppercase text-navy/60">
        {sessionId ? t("editSessionHeading") : t("newSessionHeading")}
      </p>

      <p className="rounded-md bg-navy-50 px-3 py-2 text-body-sm text-ink-secondary">{t("howItWorks")}</p>

      {error && <p className="rounded-md bg-error-bg px-3 py-2 text-body-sm text-error">{error}</p>}

      {/* 1. Che round è */}
      <div className="space-y-3">
        <label className="block">
          <span className={label}>{t("titleLabel")}</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("titlePlaceholder")}
            className={field}
            required
          />
        </label>

        <label className="block">
          <span className={label}>{t("descriptionLabel")}</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder={t("descriptionPlaceholder")}
            className={field}
          />
        </label>
      </div>

      {/* 2. Dove si fa */}
      <div className="space-y-3 border-t border-border pt-4">
        <div>
          <span className={label}>{t("modeLabel")}</span>
          <div className="flex gap-1">
            {(["in_person", "online"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 rounded-md px-3 py-1.5 text-body-sm transition-colors duration-100 ${
                  mode === m ? "bg-navy text-white" : "bg-navy-50 text-navy hover:bg-navy-100"
                }`}
              >
                {m === "online" ? t("modeOnline") : t("modeInPerson")}
              </button>
            ))}
          </div>
        </div>

        {/* Stessa scelta per entrambe le modalità: un posto solo per tutti, oppure
            uno diverso per ogni colloquio, deciso dopo che il candidato prenota. */}
        <div className="space-y-2">
          <span className={label}>
            {mode === "online" ? t("linkModeLabel") : t("placeModeLabel")}
          </span>
          {(mode === "online"
            ? (["auto", "shared", "per_interview"] as const)
            : (["shared", "per_interview"] as const)
          ).map((lm) => (
            <label key={lm} className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="linkMode"
                checked={linkMode === lm}
                onChange={() => setLinkMode(lm)}
                className="mt-1"
              />
              <span>
                <span className="block text-body-sm text-ink">
                  {mode === "online"
                    ? lm === "auto"
                      ? t("linkModeAuto")
                      : lm === "shared"
                        ? t("linkModeShared")
                        : t("linkModePerInterview")
                    : lm === "shared"
                      ? t("placeModeShared")
                      : t("placeModePerInterview")}
                </span>
                <span className="block text-body-sm text-ink-tertiary">
                  {mode === "online"
                    ? lm === "auto"
                      ? t("linkModeAutoHint")
                      : lm === "shared"
                        ? t("linkModeSharedHint")
                        : t("linkModePerInterviewHint")
                    : lm === "shared"
                      ? t("placeModeSharedHint")
                      : t("placeModePerInterviewHint")}
                </span>
              </span>
            </label>
          ))}

          {linkMode === "shared" &&
            (mode === "online" ? (
              <input
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder={t("linkPlaceholder")}
                className={field}
              />
            ) : (
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t("locationPlaceholder")}
                className={field}
              />
            ))}
        </div>
      </div>

      {/* 3. Quando */}
      <div className="space-y-3 border-t border-border pt-4">
        <span className={label}>{t("daysLabel")}</span>
        <DayPicker selected={days} onChange={setDays} locale={dateLocale} />
        <p className="text-body-sm text-ink-tertiary">{t("daysHint")}</p>

        {days.length > 0 && (
          <div className="space-y-2 rounded-md bg-navy-50/60 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-body-sm text-ink">{t("defaultHours")}</span>
              <input
                type="time"
                value={defaultStart}
                onChange={(e) => setDefaultStart(e.target.value)}
                className={`${field} w-auto`}
              />
              <span className="text-body-sm text-ink-tertiary">{t("windowTo")}</span>
              <input
                type="time"
                value={defaultEnd}
                onChange={(e) => setDefaultEnd(e.target.value)}
                className={`${field} w-auto`}
              />
            </div>

            {[...days].sort().map((date) => {
              const current = perDay[date] ?? { start: defaultStart, end: defaultEnd };
              const custom = Boolean(perDay[date]);
              return (
                <div key={date} className="flex flex-wrap items-center gap-2">
                  <span className="min-w-[150px] text-body-sm text-navy">
                    {new Date(`${date}T12:00:00Z`).toLocaleDateString(dateLocale, {
                      timeZone: APP_TIME_ZONE,
                      weekday: "short",
                      day: "numeric",
                      month: "long",
                    })}
                  </span>
                  <input
                    type="time"
                    value={current.start}
                    onChange={(e) =>
                      setPerDay((p) => ({ ...p, [date]: { ...current, start: e.target.value } }))
                    }
                    className={`${field} w-auto`}
                  />
                  <span className="text-body-sm text-ink-tertiary">{t("windowTo")}</span>
                  <input
                    type="time"
                    value={current.end}
                    onChange={(e) =>
                      setPerDay((p) => ({ ...p, [date]: { ...current, end: e.target.value } }))
                    }
                    className={`${field} w-auto`}
                  />
                  {custom && (
                    <button
                      type="button"
                      onClick={() =>
                        setPerDay((p) => {
                          const next = { ...p };
                          delete next[date];
                          return next;
                        })
                      }
                      className="text-body-sm text-petrol hover:underline"
                    >
                      {t("resetDay")}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Come sono fatti i colloqui */}
      <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-4">
        <label className="block">
          <span className={label}>{t("durationLabel")}</span>
          <input
            type="number"
            min={5}
            max={180}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className={field}
          />
        </label>
        <label className="block">
          <span className={label}>{t("breakLabel")}</span>
          <input
            type="number"
            min={0}
            max={60}
            value={pause}
            onChange={(e) => setPause(Number(e.target.value))}
            className={field}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className={label}>{t("requiredInterviewersLabel")}</span>
          <input
            type="number"
            min={1}
            max={5}
            value={requiredInterviewers}
            onChange={(e) => setRequiredInterviewers(Number(e.target.value))}
            className={field}
          />
          <span className="mt-1 block text-body-sm text-ink-tertiary">
            {t("requiredInterviewersHint")}
          </span>
        </label>
      </div>

      <div className="rounded-md bg-navy-50 px-3 py-2">
        <p className="text-body-sm text-navy">
          {days.length ? t("previewCount", { count: preview.length }) : t("previewNoDays")}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading || !preview.length}
          className="rounded-md bg-navy px-4 py-1.5 text-body-sm text-white transition-colors duration-100 hover:bg-navy-700 disabled:opacity-40"
        >
          {loading ? t("creating") : sessionId ? t("saveChanges") : t("createCta")}
        </button>
        <button type="button" onClick={onDone} className="text-body-sm text-ink-secondary hover:underline">
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}
