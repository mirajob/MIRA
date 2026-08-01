"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createInterviewSession } from "@/lib/actions/interview-sessions";
import { generateSlots, type InterviewWindow } from "@/lib/interview-slots";

/**
 * Creazione di un round di colloqui. Il board descrive quando e come, e il numero
 * di slot che ne esce si vede prima di salvare: è l'unico modo per accorgersi che
 * quattro ore da venti minuti non bastano per sessanta candidati.
 */
export function SessionForm({
  associationId,
  slug,
  cycleId,
  onDone,
}: {
  associationId: string;
  slug: string;
  cycleId: string;
  onDone: () => void;
}) {
  const t = useTranslations("Interviews");
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<"online" | "in_person">("in_person");
  const [location, setLocation] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [duration, setDuration] = useState(20);
  const [pause, setPause] = useState(5);
  const [tracks, setTracks] = useState(1);
  const [windows, setWindows] = useState<InterviewWindow[]>([
    { date: "", start: "15:00", end: "19:00" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validWindows = windows.filter((w) => w.date && w.start && w.end);
  const preview = useMemo(
    () =>
      generateSlots({
        windows: validWindows,
        slotDurationMinutes: duration,
        breakMinutes: pause,
        parallelTracks: tracks,
      }),
    [validWindows, duration, pause, tracks]
  );

  function updateWindow(index: number, patch: Partial<InterviewWindow>) {
    setWindows((prev) => prev.map((w, i) => (i === index ? { ...w, ...patch } : w)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await createInterviewSession({
      associationId,
      slug,
      cycleId,
      title,
      description,
      mode,
      location,
      meetingLink,
      slotDurationMinutes: duration,
      breakMinutes: pause,
      parallelTracks: tracks,
      windows: validWindows,
    });

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

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-white p-4">
      <p className="text-eyebrow uppercase text-navy/60">{t("newSessionHeading")}</p>

      {error && <p className="rounded-md bg-error-bg px-3 py-2 text-body-sm text-error">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-eyebrow uppercase text-navy/60">{t("titleLabel")}</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("titlePlaceholder")}
            className={field}
            required
          />
        </label>

        <div>
          <span className="mb-1 block text-eyebrow uppercase text-navy/60">{t("modeLabel")}</span>
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
      </div>

      <label className="block">
        <span className="mb-1 block text-eyebrow uppercase text-navy/60">{t("descriptionLabel")}</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder={t("descriptionPlaceholder")}
          className={field}
        />
      </label>

      {mode === "in_person" ? (
        <label className="block">
          <span className="mb-1 block text-eyebrow uppercase text-navy/60">{t("locationLabel")}</span>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t("locationPlaceholder")}
            className={field}
          />
        </label>
      ) : (
        <label className="block">
          <span className="mb-1 block text-eyebrow uppercase text-navy/60">{t("linkLabel")}</span>
          <input
            value={meetingLink}
            onChange={(e) => setMeetingLink(e.target.value)}
            placeholder={t("linkPlaceholder")}
            className={field}
          />
        </label>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-eyebrow uppercase text-navy/60">{t("durationLabel")}</span>
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
          <span className="mb-1 block text-eyebrow uppercase text-navy/60">{t("breakLabel")}</span>
          <input
            type="number"
            min={0}
            max={60}
            value={pause}
            onChange={(e) => setPause(Number(e.target.value))}
            className={field}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-eyebrow uppercase text-navy/60">{t("tracksLabel")}</span>
          <input
            type="number"
            min={1}
            max={12}
            value={tracks}
            onChange={(e) => setTracks(Number(e.target.value))}
            className={field}
          />
        </label>
      </div>

      <div className="space-y-2">
        <span className="block text-eyebrow uppercase text-navy/60">{t("windowsLabel")}</span>
        {windows.map((w, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={w.date}
              onChange={(e) => updateWindow(i, { date: e.target.value })}
              className={`${field} w-auto`}
            />
            <input
              type="time"
              value={w.start}
              onChange={(e) => updateWindow(i, { start: e.target.value })}
              className={`${field} w-auto`}
            />
            <span className="text-body-sm text-ink-tertiary">{t("windowTo")}</span>
            <input
              type="time"
              value={w.end}
              onChange={(e) => updateWindow(i, { end: e.target.value })}
              className={`${field} w-auto`}
            />
            {windows.length > 1 && (
              <button
                type="button"
                onClick={() => setWindows((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-body-sm text-error hover:underline"
              >
                {t("windowRemove")}
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setWindows((prev) => [...prev, { date: "", start: "15:00", end: "19:00" }])}
          className="text-body-sm text-petrol hover:underline"
        >
          {t("windowAdd")}
        </button>
      </div>

      {/* Il conto degli slot prima di salvare: è il dato che dice se la griglia
          regge i candidati che devi vedere. */}
      <div className="rounded-md bg-navy-50 px-3 py-2">
        <p className="text-body-sm text-navy">{t("previewCount", { count: preview.length })}</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading || !preview.length}
          className="rounded-md bg-navy px-4 py-1.5 text-body-sm text-white transition-colors duration-100 hover:bg-navy-700 disabled:opacity-40"
        >
          {loading ? t("creating") : t("createCta")}
        </button>
        <button type="button" onClick={onDone} className="text-body-sm text-ink-secondary hover:underline">
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}
