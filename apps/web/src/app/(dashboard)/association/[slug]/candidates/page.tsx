/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServiceClient } from "@mira/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { APP_TIME_ZONE } from "@/lib/format-date";
import { parseWindows } from "@/lib/interview-slots";
import { CandidatesBoard, type CandidateRow } from "./candidates-board";
import type { RoundOption } from "./[applicationId]/candidate-actions";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ cycle?: string }>;
}

/**
 * I candidati della selezione, divisi per il punto in cui sono.
 *
 * Le colonne di prima (stato, valutazione, data) erano etichette da leggere e
 * interpretare. Le fasi invece si guardano: chi aspetta una risposta, chi è al
 * colloquio, chi è dentro, chi è fuori.
 */
export default async function CandidatesPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { cycle: cycleFilter } = await searchParams;
  const supabase = await createServiceClient();
  const t = await getTranslations("CandidatesList");
  const d = await getTranslations("CandidateDetail");
  const locale = await getLocale();
  const dateLocale = locale === "it" ? "it-IT" : "en-US";

  const { data: association } = await (supabase.from("association_profiles") as any)
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (!association) notFound();

  const { data: cycles } = await (supabase.from("application_cycles") as any)
    .select("id, title, status")
    .eq("association_id", association.id)
    .order("created_at", { ascending: false });

  const activeCycles = ((cycles ?? []) as any[]).filter((c) => c.status !== "closed");
  const showAll = cycleFilter === "all";
  const selectedCycle = showAll
    ? null
    : cycleFilter || activeCycles[0]?.id || (cycles ?? [])[0]?.id || null;

  let query = (supabase.from("applications") as any)
    .select(`
      id, status, submitted_at, application_cycle_id, selected_role_preferences,
      profiles(full_name, email)
    `)
    .eq("association_id", association.id)
    .neq("status", "draft")
    .order("submitted_at", { ascending: false });

  if (selectedCycle) query = query.eq("application_cycle_id", selectedCycle);

  const { data: applications } = await query;

  // I round della selezione mostrata: sono le opzioni di "convoca a colloquio".
  const { data: roundRows } = selectedCycle
    ? await (supabase.from("interview_sessions") as any)
        .select("id, title, round_index, description, mode, link_mode, location, meeting_link, windows")
        .eq("application_cycle_id", selectedCycle)
        .order("round_index", { ascending: true })
    : { data: [] };

  const dayFormat = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString(dateLocale, {
      timeZone: APP_TIME_ZONE,
      day: "numeric",
      month: "long",
    });

  const rounds: RoundOption[] = ((roundRows ?? []) as any[]).map((r) => {
    const days = [...new Set(parseWindows(r.windows).map((w) => w.date))].sort();
    const first = days[0];
    const last = days[days.length - 1];
    return {
      id: r.id,
      title: r.title,
      roundIndex: r.round_index,
      alreadyInvited: false,
      description: r.description ?? null,
      mode: r.mode,
      linkMode: r.link_mode,
      place: r.link_mode === "shared" ? (r.mode === "online" ? r.meeting_link : r.location) ?? null : null,
      daysLabel: !first ? null : first === last || !last ? dayFormat(first) : `${dayFormat(first)} - ${dayFormat(last)}`,
    };
  });

  // Lo stato del colloquio in una riga, per chi è già stato invitato.
  const applicationIds = ((applications ?? []) as any[]).map((a) => a.id);
  const { data: invites } = applicationIds.length
    ? await (supabase.from("interview_invites") as any)
        .select(`
          application_id, selected_time, session_id, slot_id,
          interview_sessions(title, round_index, mode, link_mode, location, meeting_link),
          interview_slots(meeting_link, interviewer_user_id)
        `)
        .in("application_id", applicationIds)
    : { data: [] };

  const inviteByApplication = new Map<string, any>();
  // I round a cui ognuno è già stato invitato: si tolgono dalla lista di
  // "convoca a colloquio", altrimenti si rimanda al round da cui esce.
  const invitedRoundsByApplication = new Map<string, string[]>();

  for (const invite of ((invites ?? []) as any[])) {
    const existing = inviteByApplication.get(invite.application_id);
    // Vince l'invito più avanti nella selezione: è lì che il candidato si trova.
    const laterRound =
      (invite.interview_sessions?.round_index ?? 0) > (existing?.interview_sessions?.round_index ?? -1);
    if (!existing || laterRound) {
      inviteByApplication.set(invite.application_id, invite);
    }
    if (invite.session_id) {
      invitedRoundsByApplication.set(invite.application_id, [
        ...(invitedRoundsByApplication.get(invite.application_id) ?? []),
        invite.session_id,
      ]);
    }
  }

  // Chi conduce, per scriverlo accanto al colloquio già fissato.
  const slotInterviewerIds = [
    ...new Set(
      ((invites ?? []) as any[]).map((i) => i.interview_slots?.interviewer_user_id).filter(Boolean)
    ),
  ];
  const { data: slotInterviewers } = slotInterviewerIds.length
    ? await (supabase.from("profiles") as any).select("id, full_name, email").in("id", slotInterviewerIds)
    : { data: [] };
  const slotInterviewerById = new Map(((slotInterviewers ?? []) as any[]).map((p) => [p.id, p]));

  const rows: CandidateRow[] = ((applications ?? []) as any[]).map((app) => {
    const invite = inviteByApplication.get(app.id);
    const summary = invite?.selected_time
      ? new Date(invite.selected_time).getTime() < Date.now()
        ? d("interviewDone", {
            date: new Date(invite.selected_time).toLocaleString(dateLocale, {
              timeZone: APP_TIME_ZONE,
              day: "numeric",
              month: "long",
            }),
          })
        : d("interviewBooked", {
            date: new Date(invite.selected_time).toLocaleString(dateLocale, {
              timeZone: APP_TIME_ZONE,
              weekday: "short",
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
            }),
          })
      : invite
        ? d("interviewInvitedNotBooked")
        : null;

    const startsAt = invite?.selected_time ? new Date(invite.selected_time).getTime() : null;
    const interviewState: CandidateRow["interviewState"] = !invite
      ? null
      : startsAt === null
        ? "toBook"
        : startsAt < Date.now()
          ? "done"
          : "booked";

    // Il posto: quello del singolo colloquio se c'è, altrimenti quello del round.
    const round = invite?.interview_sessions;
    const place =
      invite?.interview_slots?.meeting_link ??
      (round ? (round.mode === "online" ? round.meeting_link : round.location) : null) ??
      null;
    const interviewer = invite?.interview_slots?.interviewer_user_id
      ? slotInterviewerById.get(invite.interview_slots.interviewer_user_id)
      : null;

    return {
      applicationId: app.id,
      name: app.profiles?.full_name ?? "–",
      email: app.profiles?.email ?? "",
      position: app.selected_role_preferences?.[0] ?? null,
      status: app.status,
      interviewSummary: summary,
      roundId: invite?.session_id ?? null,
      roundIndex: round?.round_index ?? null,
      roundTitle: round?.title ?? null,
      interviewState,
      invitedRoundIds: invitedRoundsByApplication.get(app.id) ?? [],
      interviewPlace: interviewState === "toBook" ? null : place,
      interviewerName: interviewer?.full_name ?? interviewer?.email ?? null,
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-body-sm text-ink-secondary">{t("countLabel", { count: rows.length })}</p>

        {(cycles?.length ?? 0) > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {((cycles ?? []) as any[]).map((c) => (
              <Link
                key={c.id}
                href={`/association/${slug}/candidates?cycle=${c.id}`}
                className={`rounded-full px-3 py-1 text-body-sm transition-colors ${
                  selectedCycle === c.id ? "bg-navy text-white" : "bg-navy-50 text-navy hover:bg-navy-100"
                }`}
              >
                {c.title}
              </Link>
            ))}
            <Link
              href={`/association/${slug}/candidates?cycle=all`}
              className={`rounded-full px-3 py-1 text-body-sm transition-colors ${
                showAll ? "bg-navy text-white" : "bg-navy-50 text-navy hover:bg-navy-100"
              }`}
            >
              {t("allFilter")}
            </Link>
          </div>
        )}
      </div>

      <CandidatesBoard slug={slug} rows={rows} rounds={rounds} />
    </div>
  );
}
