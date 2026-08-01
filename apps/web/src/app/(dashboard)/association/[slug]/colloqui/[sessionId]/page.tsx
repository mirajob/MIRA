/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { hasWorkspaceAccess } from "@/lib/association-roles";
import { personInitials, rangeCoversBlock } from "@/lib/interview-slots";
import { parseWindows } from "@/lib/interview-slots";
import { AvailabilityGrid, type AvailabilityBlock } from "./availability-grid";
import { SessionActions } from "./session-actions";
import { EditSessionPanel } from "./edit-session-panel";

interface Props {
  params: Promise<{ slug: string; sessionId: string }>;
}

export default async function InterviewSessionPage({ params }: Props) {
  const { slug, sessionId } = await params;
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  const { data: session } = await (supabase.from("interview_sessions") as any)
    .select("*, association_profiles(id, slug), application_cycles(title)")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session || session.association_profiles?.slug !== slug) notFound();

  const { data: membership } = await (supabase.from("association_memberships") as any)
    .select("role, permissions")
    .eq("association_id", session.association_id)
    .eq("user_id", (ctx.profile as any).id)
    .eq("status", "active")
    .maybeSingle();

  if (!ctx.isMiraAdmin && !hasWorkspaceAccess(membership)) redirect("/student");

  const canManage =
    ctx.isMiraAdmin ||
    membership?.role === "association_admin" ||
    membership?.role === "association_president" ||
    Boolean((membership?.permissions as Record<string, boolean> | null)?.manage_interview_slots);

  const t = await getTranslations("Interviews");
  const locale = await getLocale();
  const dateLocale = locale === "it" ? "it-IT" : "en-US";
  const profileId = (ctx.profile as any).id as string;

  const { data: slots } = await (supabase.from("interview_slots") as any)
    .select(`
      id, starts_at, ends_at, track, application_id,
      applications(profiles!applications_student_user_id_fkey(full_name))
    `)
    .eq("session_id", sessionId)
    .order("starts_at", { ascending: true });

  const { data: availability } = await (supabase.from("interview_availability") as any)
    .select("user_id, starts_at, ends_at")
    .eq("session_id", sessionId);

  const peopleIds = [...new Set(((availability ?? []) as any[]).map((a) => a.user_id))];
  const { data: people } = peopleIds.length
    ? await (supabase.from("profiles") as any).select("id, full_name, email").in("id", peopleIds)
    : { data: [] };
  const personById = new Map(((people ?? []) as any[]).map((p) => [p.id, p]));

  // Le fasce si mostrano una volta sola anche quando i colloqui in parallelo sono
  // più di uno: la disponibilità è "a quest'ora ci sono", non "ci sono nell'aula 2".
  const byTime = new Map<string, any[]>();
  for (const slot of (slots ?? []) as any[]) {
    byTime.set(slot.starts_at, [...(byTime.get(slot.starts_at) ?? []), slot]);
  }

  const blocks: AvailabilityBlock[] = [...byTime.entries()].map(([startsAt, group]) => {
    const block = { startsAt, endsAt: group[0].ends_at };
    const covering = ((availability ?? []) as any[]).filter((a) => rangeCoversBlock(a, block));
    const booked = group.find((s: any) => s.application_id);

    return {
      startsAt,
      endsAt: group[0].ends_at,
      others: covering
        .filter((a) => a.user_id !== profileId)
        .map((a) => {
          const person = personById.get(a.user_id);
          return {
            userId: a.user_id,
            initials: personInitials(person?.full_name, person?.email),
            name: person?.full_name ?? person?.email ?? "—",
          };
        }),
      mine: covering.some((a) => a.user_id === profileId),
      bookedName: booked?.applications?.profiles?.full_name ?? (booked ? "—" : null),
    };
  });

  const total = blocks.length;
  const covered = blocks.filter(
    (b) => b.others.length + (b.mine ? 1 : 0) >= session.required_interviewers
  ).length;
  const booked = blocks.filter((b) => b.bookedName).length;

  return (
    <div className="space-y-4">
      <div>
        <Link
          href={`/association/${slug}/colloqui`}
          className="text-body-sm text-ink-tertiary transition-colors hover:text-petrol"
        >
          &larr; {t("backToSessions")}
        </Link>

        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-eyebrow uppercase text-navy/50">
            {t("roundLabel", { index: session.round_index })}
          </span>
          <h1 className="font-display text-h2 text-navy">{session.title}</h1>
          <span className="text-body-sm text-ink-tertiary">
            {session.mode === "online" ? t("modeOnline") : t("modeInPerson")}
          </span>
        </div>

        {session.description && (
          <p className="mt-1 text-body-sm text-ink-secondary">{session.description}</p>
        )}
        <p className="mt-0.5 text-body-sm text-ink-tertiary">
          {session.mode === "in_person"
            ? session.location
            : session.link_mode === "shared"
              ? session.meeting_link
              : t("linkModePerInterview")}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border bg-white px-4 py-3">
        <div>
          <p className="text-eyebrow uppercase text-navy/50">{t("statTotal")}</p>
          <p className="text-body font-medium text-navy tabular-nums">{total}</p>
        </div>
        <div>
          <p className="text-eyebrow uppercase text-navy/50">{t("statCovered")}</p>
          <p className={`text-body font-medium tabular-nums ${covered < total ? "text-warning" : "text-navy"}`}>
            {covered}
          </p>
        </div>
        <div>
          <p className="text-eyebrow uppercase text-navy/50">{t("statBooked")}</p>
          <p className="text-body font-medium text-navy tabular-nums">{booked}</p>
        </div>
        {session.required_interviewers > 1 && (
          <div>
            <p className="text-eyebrow uppercase text-navy/50">{t("statRequired")}</p>
            <p className="text-body font-medium text-navy tabular-nums">
              {session.required_interviewers}
            </p>
          </div>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-4">
          {canManage && (
            <EditSessionPanel
              associationId={session.association_id}
              slug={slug}
              cycleId={session.application_cycle_id}
              sessionId={sessionId}
              initial={{
                title: session.title,
                description: session.description ?? "",
                mode: session.mode,
                linkMode: session.link_mode,
                location: session.location ?? "",
                meetingLink: session.meeting_link ?? "",
                slotDurationMinutes: session.slot_duration_minutes,
                breakMinutes: session.break_minutes,
                parallelTracks: session.parallel_tracks,
                requiredInterviewers: session.required_interviewers,
                windows: parseWindows(session.windows),
              }}
            />
          )}
          <SessionActions sessionId={sessionId} slug={slug} status={session.status} canManage={canManage} />
        </div>
      </div>

      <AvailabilityGrid
        sessionId={sessionId}
        slug={slug}
        blocks={blocks}
        requiredInterviewers={session.required_interviewers}
        dateLocale={dateLocale}
      />
    </div>
  );
}
