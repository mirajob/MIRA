/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { hasWorkspaceAccess } from "@/lib/association-roles";
import { APP_TIME_ZONE } from "@/lib/format-date";
import { parseWindows, rangeCoversBlock } from "@/lib/interview-slots";
import { NewSessionPanel, type CycleOption } from "./new-session-panel";

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * I round di colloquio dell'associazione. Ogni riga dice le due cose che servono a
 * capire se la sessione è pronta: quanti slot sono coperti da qualcuno del board e
 * quanti sono già prenotati.
 */
export default async function AssociationInterviewsPage({ params }: Props) {
  const { slug } = await params;
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  const { data: association } = await (supabase.from("association_profiles") as any)
    .select("id, name")
    .eq("slug", slug)
    .maybeSingle();

  if (!association) notFound();

  const { data: membership } = await (supabase.from("association_memberships") as any)
    .select("role, permissions")
    .eq("association_id", association.id)
    .eq("user_id", (ctx.profile as any).id)
    .eq("status", "active")
    .maybeSingle();

  if (!ctx.isMiraAdmin && !hasWorkspaceAccess(membership)) redirect("/student");

  const t = await getTranslations("Interviews");
  const locale = await getLocale();
  const dateLocale = locale === "it" ? "it-IT" : "en-US";

  const { data: cycles } = await (supabase.from("application_cycles") as any)
    .select("id, title, status")
    .eq("association_id", association.id)
    .order("created_at", { ascending: false });

  const { data: sessions } = await (supabase.from("interview_sessions") as any)
    .select("*, application_cycles(title)")
    .eq("association_id", association.id)
    .order("round_index", { ascending: true });

  // Conteggi per sessione. La copertura non è più una proprietà dello slot ma il
  // risultato dell'incrocio con le disponibilità dichiarate dal board.
  const sessionIds = ((sessions ?? []) as any[]).map((s) => s.id);
  const { data: slots } = sessionIds.length
    ? await (supabase.from("interview_slots") as any)
        .select(`
          id, session_id, application_id, starts_at, ends_at, meeting_link, interviewer_user_id,
          applications(profiles!applications_student_user_id_fkey(full_name, email))
        `)
        .in("session_id", sessionIds)
        .order("starts_at", { ascending: true })
    : { data: [] };

  const { data: availability } = sessionIds.length
    ? await (supabase.from("interview_availability") as any)
        .select("session_id, user_id, starts_at, ends_at")
        .in("session_id", sessionIds)
    : { data: [] };

  const availabilityBySession = new Map<string, any[]>();
  for (const a of (availability ?? []) as any[]) {
    availabilityBySession.set(a.session_id, [...(availabilityBySession.get(a.session_id) ?? []), a]);
  }

  const requiredBySession = new Map<string, number>(
    ((sessions ?? []) as any[]).map((s) => [s.id, s.required_interviewers ?? 1])
  );

  // Chi conduce, per scriverne il nome accanto al colloquio di oggi.
  const interviewerIds = [
    ...new Set(((slots ?? []) as any[]).map((s) => s.interviewer_user_id).filter(Boolean)),
  ];
  const { data: interviewers } = interviewerIds.length
    ? await (supabase.from("profiles") as any).select("id, full_name, email").in("id", interviewerIds)
    : { data: [] };
  const interviewerById = new Map(((interviewers ?? []) as any[]).map((p) => [p.id, p]));

  // I colloqui di oggi: sono l'unica cosa che serve leggere di corsa da questa
  // pagina, quindi stanno attaccati al round con l'ora, chi viene e dove.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  interface TodayInterview {
    startsAt: string;
    candidateName: string;
    interviewerName: string | null;
    place: string | null;
  }
  const todayBySession = new Map<string, TodayInterview[]>();

  const stats = new Map<string, { total: number; covered: number; booked: number; done: number; upcoming: number; first: string | null }>();
  // Un orario con più colloqui in parallelo conta una volta sola nella copertura:
  // una persona non può condurne due insieme.
  const countedTimes = new Map<string, Set<string>>();

  const nowMs = Date.now();

  for (const slot of (slots ?? []) as any[]) {
    const entry =
      stats.get(slot.session_id) ?? { total: 0, covered: 0, booked: 0, done: 0, upcoming: 0, first: null };
    entry.total++;
    if (slot.application_id) {
      entry.booked++;
      const startsMs = new Date(slot.starts_at).getTime();
      if (startsMs < nowMs) entry.done++;
      else entry.upcoming++;

      // Solo i colloqui di oggi non ancora finiti: uno che si è chiuso mezz'ora
      // fa non è più una cosa da fare, e lasciarlo nell'avviso rosso lo rende
      // rumore che poi non si guarda più.
      const endsMs = new Date(slot.ends_at).getTime();
      if (startsMs >= startOfToday.getTime() && startsMs < endOfToday.getTime() && endsMs > nowMs) {
        const interviewer = slot.interviewer_user_id ? interviewerById.get(slot.interviewer_user_id) : null;
        const sessionRow = ((sessions ?? []) as any[]).find((x) => x.id === slot.session_id);
        todayBySession.set(slot.session_id, [
          ...(todayBySession.get(slot.session_id) ?? []),
          {
            startsAt: slot.starts_at,
            candidateName:
              slot.applications?.profiles?.full_name ?? slot.applications?.profiles?.email ?? "–",
            interviewerName: interviewer?.full_name ?? interviewer?.email ?? null,
            place:
              slot.meeting_link ??
              (sessionRow?.mode === "online" ? sessionRow?.meeting_link : sessionRow?.location) ??
              null,
          },
        ]);
      }
    }
    if (!entry.first || slot.starts_at < entry.first) entry.first = slot.starts_at;

    const seen = countedTimes.get(slot.session_id) ?? new Set<string>();
    if (!seen.has(slot.starts_at)) {
      seen.add(slot.starts_at);
      countedTimes.set(slot.session_id, seen);
      const covering = (availabilityBySession.get(slot.session_id) ?? []).filter((a) =>
        rangeCoversBlock(a, { startsAt: slot.starts_at, endsAt: slot.ends_at })
      );
      if (covering.length >= (requiredBySession.get(slot.session_id) ?? 1)) entry.covered++;
    }

    stats.set(slot.session_id, entry);
  }

  // Una selezione conclusa non riceve piu' round: i suoi finiscono nello storico.
  const activeCycleIds = new Set(
    ((cycles ?? []) as any[]).filter((c) => c.status !== "closed").map((c) => c.id)
  );

  const cycleOptions: CycleOption[] = ((cycles ?? []) as any[])
    .filter((c) => c.status !== "closed")
    .map((c) => ({ id: c.id, title: c.title }));

  const allSessions = (sessions ?? []) as any[];
  const currentSessions = allSessions.filter((x) => activeCycleIds.has(x.application_cycle_id));
  const pastSessions = allSessions.filter((x) => !activeCycleIds.has(x.application_cycle_id));

  const statusClass: Record<string, string> = {
    draft: "bg-amber-100 text-amber-700",
    open: "bg-emerald-100 text-emerald-700",
    closed: "bg-navy-50 text-ink-tertiary",
  };

  function renderSession(session: any, archived = false) {
    const st =
      stats.get(session.id) ?? { total: 0, covered: 0, booked: 0, done: 0, upcoming: 0, first: null };
    const today = todayBySession.get(session.id) ?? [];
    const days = (parseWindows(session.windows) ?? []).map((w) => w.date).sort();
    const dayLabel = (iso: string) =>
      new Date(`${iso}T12:00:00Z`).toLocaleDateString(dateLocale, {
        timeZone: APP_TIME_ZONE,
        day: "numeric",
        month: "long",
      });

    // Una frase che dice cosa manca per andare avanti, invece di far entrare in
    // ogni round per scoprirlo.
    const nextStep = archived
      ? { text: t("archivedSummary", { booked: st.booked }), tone: "text-ink-tertiary" }
      : st.covered === 0
        ? { text: t("stepNoAvailability"), tone: "text-warning" }
        : st.booked === 0
          ? { text: t("stepInviteCandidates"), tone: "text-petrol" }
          : st.upcoming === 0
            ? { text: t("stepAllDone", { done: st.done }), tone: "text-ink-tertiary" }
            : {
                text:
                  st.done > 0
                    ? t("stepUpcomingAndDone", { upcoming: st.upcoming, done: st.done })
                    : t("stepUpcoming", { upcoming: st.upcoming }),
                tone: "text-ink-secondary",
              };

    return (
      <div key={session.id}>
      <Link
        href={`/association/${slug}/colloqui/${session.id}`}
        className="block rounded-lg border border-border bg-white px-4 py-3 transition-colors duration-100 hover:border-border-strong"
      >
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-eyebrow uppercase text-navy/50">
            {t("roundLabel", { index: session.round_index })}
          </span>
          <span className="text-body font-medium text-navy">{session.title}</span>
          <span className="ml-auto text-body-sm text-ink-tertiary">
            {session.application_cycles?.title}
          </span>
        </div>

        <p className="mt-1 text-body-sm text-ink-secondary">
          {session.mode === "online" ? t("modeOnline") : t("modeInPerson")}
          {days.length > 0 && (
            <>
              {" · "}
              {days.length === 1
                ? t("oneDay", { date: dayLabel(days[0]!) })
                : t("manyDays", {
                    count: days.length,
                    from: dayLabel(days[0]!),
                    to: dayLabel(days[days.length - 1]!),
                  })}
            </>
          )}
        </p>

        <p className={`mt-0.5 text-body-sm ${nextStep.tone}`}>{nextStep.text}</p>
      </Link>

      {/* I colloqui di oggi, attaccati al round: con chi, a che ora, e dove si
          entra. È l'unica cosa che serve leggere di corsa la mattina stessa. */}
      {today.length > 0 && (
        <div className="rounded-b-lg border border-t-0 border-error/40 bg-error-bg px-4 py-2.5">
          <p className="text-body-sm font-medium text-error">{t("todayHeading", { count: today.length })}</p>
          <div className="mt-1 space-y-1">
            {today.map((it) => (
              <div key={it.startsAt + it.candidateName} className="flex flex-wrap items-baseline gap-x-2 text-body-sm">
                <span className="font-medium tabular-nums text-ink">
                  {new Date(it.startsAt).toLocaleTimeString(dateLocale, {
                    timeZone: APP_TIME_ZONE,
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="text-ink">{it.candidateName}</span>
                {it.interviewerName && (
                  <span className="text-ink-tertiary">{t("todayWith", { name: it.interviewerName })}</span>
                )}
                {it.place &&
                  (it.place.startsWith("http") ? (
                    <a
                      href={it.place}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-petrol hover:underline"
                    >
                      {t("todayJoin")}
                    </a>
                  ) : (
                    <span className="text-ink-secondary">{it.place}</span>
                  ))}
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="max-w-3xl text-body-sm text-ink-secondary">{t("subhead")}</p>

      <NewSessionPanel slug={slug} cycles={cycleOptions} />

      {currentSessions.length === 0 ? (
        <div className="rounded-lg border border-border bg-white p-6 text-center">
          <p className="text-body-sm text-ink-secondary">
            {cycleOptions.length ? t("noRoundsForCurrent", { cycle: cycleOptions[0]!.title }) : t("noOpenSelection")}
          </p>
        </div>
      ) : (
        <div className="space-y-2">{currentSessions.map((x: any) => renderSession(x))}</div>
      )}

      {pastSessions.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer select-none text-body-sm text-ink-tertiary transition-colors hover:text-ink-secondary">
            {t("pastRounds", { count: pastSessions.length })}
          </summary>
          <div className="mt-3 space-y-2 opacity-70">{pastSessions.map((x: any) => renderSession(x, true))}</div>
        </details>
      )}
    </div>
  );
}
