/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServiceClient } from "@mira/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { CycleStatusButton } from "./cycle-status-button";
import { displayCycleStatus } from "@/lib/cycle-card";
import { APP_TIME_ZONE } from "@/lib/format-date";

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * Le selezioni dell'associazione.
 *
 * Il nome vecchio, "ciclo di candidatura", non diceva niente e i tre momenti si
 * confondevano fra loro. Una selezione ha una finestra in cui si raccolgono le
 * candidature; quando scade la raccolta finisce ma la selezione no, perché i
 * colloqui continuano; e finisce davvero solo quando il board la conclude.
 */
export default async function CyclesPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createServiceClient();
  const t = await getTranslations("Cycles");
  const locale = await getLocale();
  const dateLocale = locale === "it" ? "it-IT" : "en-US";

  const { data: association } = await (supabase.from("association_profiles") as any)
    .select("id, name")
    .eq("slug", slug)
    .maybeSingle();

  if (!association) notFound();

  // Nessuna chiusura automatica alla scadenza: scaduta la data la selezione
  // resta in corso, smette solo di ricevere candidature. Chiuderla e' una
  // decisione del board, non del calendario.
  const { data: cycles } = await (supabase.from("application_cycles") as any)
    .select("*, application_questions(id), applications(id)")
    .eq("association_id", association.id)
    .order("created_at", { ascending: false });

  const current = ((cycles ?? []) as any[]).filter((c) => c.status !== "closed");
  const past = ((cycles ?? []) as any[]).filter((c) => c.status === "closed");

  const badgeClass: Record<string, string> = {
    open: "bg-success-bg text-success",
    scheduled: "bg-warning-bg text-warning",
    applications_closed: "bg-petrol-50 text-petrol-700",
    draft: "bg-navy-50 text-ink-tertiary",
    closed: "bg-navy-50 text-ink-tertiary",
  };

  function renderCycle(cycle: any) {
    const questionCount = (cycle.application_questions as unknown[])?.length ?? 0;
    const applicationCount = (cycle.applications as unknown[])?.length ?? 0;
    const state = displayCycleStatus(cycle.status, cycle.opens_at, cycle.closes_at);
    const live = cycle.status !== "closed";

    const dateLine = (value: string | null) =>
      value
        ? new Date(value).toLocaleDateString(dateLocale, {
            timeZone: APP_TIME_ZONE,
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : null;

    return (
      <div
        key={cycle.id}
        className={`rounded-lg border bg-white p-5 ${live ? "border-border" : "border-border opacity-70"}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-sans text-h3 text-navy">{cycle.title || t("untitledDraft")}</h3>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${badgeClass[state] ?? ""}`}
              >
                {t(`statusLabels.${state}`)}
              </span>
            </div>

            {/* Cosa vuol dire quello stato, in una riga */}
            <p className="mt-1 text-body-sm text-ink-secondary">
              {state === "open"
                ? t("explainOpen", { date: dateLine(cycle.closes_at) ?? "—" })
                : state === "scheduled"
                  ? t("explainScheduled", { date: dateLine(cycle.opens_at) ?? "—" })
                  : state === "applications_closed"
                    ? t("explainApplicationsClosed")
                    : state === "closed"
                      ? t("explainClosed")
                      : t("explainDraft")}
            </p>

            <p className="mt-1 text-body-sm text-ink-tertiary">
              {t("questionsCount", { count: questionCount })} · {t("applicationsCount", { count: applicationCount })}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={`/association/${slug}/cycles/${cycle.id}`}
              className="rounded-md border border-border px-3 py-1.5 text-body-sm text-navy transition-colors hover:bg-navy-50"
            >
              {live ? t("edit") : t("details")}
            </Link>
            {live && (
              <CycleStatusButton
                associationId={association.id}
                cycleId={cycle.id}
                currentStatus={cycle.status}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <h2 className="font-display text-h2 text-navy">{t("heading")}</h2>
          <p className="mt-1 text-body-sm text-ink-secondary">{t("explainer")}</p>
        </div>

        {/* Una selezione per volta: due aperte insieme confondono i candidati. */}
        {current.length === 0 ? (
          <Link
            href={`/association/${slug}/cycles/new`}
            className="shrink-0 rounded-md bg-navy px-5 py-2.5 text-label text-white transition-colors duration-100 hover:bg-navy-700 active:scale-[0.98]"
          >
            {t("newCycle")}
          </Link>
        ) : (
          <p className="max-w-[240px] shrink-0 text-body-sm text-ink-tertiary">{t("oneCycleAtATime")}</p>
        )}
      </div>

      {current.length === 0 && past.length === 0 ? (
        <div className="rounded-lg border border-border bg-white p-8 text-center">
          <p className="text-body text-ink-secondary">{t("noCycles")}</p>
        </div>
      ) : (
        <>
          {current.length > 0 && <div className="space-y-3">{current.map(renderCycle)}</div>}

          {past.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer select-none text-body-sm text-ink-tertiary transition-colors hover:text-ink-secondary">
                {t("history", { count: past.length })}
              </summary>
              <div className="mt-3 space-y-3">{past.map(renderCycle)}</div>
            </details>
          )}
        </>
      )}
    </div>
  );
}
