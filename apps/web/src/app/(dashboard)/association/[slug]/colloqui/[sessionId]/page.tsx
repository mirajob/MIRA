/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { hasWorkspaceAccess } from "@/lib/association-roles";
import { SessionGrid, type GridSlot } from "./session-grid";
import { SessionActions } from "./session-actions";

interface Props {
  params: Promise<{ slug: string; sessionId: string }>;
}

/** Iniziali del nome, per stare dentro una casella della griglia. */
function initials(name: string | null, email: string | null): string {
  const source = (name ?? email ?? "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
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

  const { data: slots } = await (supabase.from("interview_slots") as any)
    .select(`
      id, starts_at, track, application_id,
      interview_slot_interviewers(user_id),
      applications(profiles!applications_student_user_id_fkey(full_name, email))
    `)
    .eq("session_id", sessionId)
    .order("starts_at", { ascending: true })
    .order("track", { ascending: true });

  // I nomi degli intervistatori si risolvono in un colpo solo: la griglia può avere
  // centinaia di caselle e una query per casella sarebbe insostenibile.
  const interviewerIds = [
    ...new Set(
      ((slots ?? []) as any[]).flatMap((s) =>
        (s.interview_slot_interviewers ?? []).map((i: any) => i.user_id)
      )
    ),
  ];
  const { data: people } = interviewerIds.length
    ? await (supabase.from("profiles") as any).select("id, full_name, email").in("id", interviewerIds)
    : { data: [] };
  const personById = new Map(((people ?? []) as any[]).map((p) => [p.id, p]));

  const profileId = (ctx.profile as any).id as string;

  const gridSlots: GridSlot[] = ((slots ?? []) as any[]).map((s) => ({
    id: s.id,
    startsAt: s.starts_at,
    track: s.track,
    interviewers: (s.interview_slot_interviewers ?? []).map((i: any) => {
      const person = personById.get(i.user_id);
      return { userId: i.user_id, label: initials(person?.full_name, person?.email) };
    }),
    candidateName: s.applications?.profiles?.full_name ?? (s.application_id ? "—" : null),
    mine: (s.interview_slot_interviewers ?? []).some((i: any) => i.user_id === profileId),
  }));

  const total = gridSlots.length;
  const covered = gridSlots.filter((s) => s.interviewers.length > 0).length;
  const booked = gridSlots.filter((s) => s.candidateName).length;

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
          {session.mode === "online" ? session.meeting_link : session.location}
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

        <div className="ml-auto">
          <SessionActions sessionId={sessionId} slug={slug} status={session.status} canManage={canManage} />
        </div>
      </div>

      <SessionGrid
        sessionId={sessionId}
        slug={slug}
        slots={gridSlots}
        tracks={session.parallel_tracks}
        dateLocale={dateLocale}
      />
    </div>
  );
}
