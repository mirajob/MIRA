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
import { InvitePanel, type InvitableCandidate } from "./invite-panel";
import { BookedInterviews, type BookedInterview } from "./booked-interviews";

interface Props {
  params: Promise<{ slug: string; sessionId: string }>;
}

export default async function InterviewSessionPage({ params }: Props) {
  const { slug, sessionId } = await params;
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  const { data: session } = await (supabase.from("interview_sessions") as any)
    .select("*, association_profiles(id, slug), application_cycles(title, status)")
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

  // Round di una selezione conclusa: si guarda cosa è successo, non si tocca più
  // niente. Mostrarlo attivo faceva sembrare che ci fosse ancora da lavorarci.
  const archived = session.application_cycles?.status === "closed";

  const t = await getTranslations("Interviews");
  const locale = await getLocale();
  const dateLocale = locale === "it" ? "it-IT" : "en-US";
  const profileId = (ctx.profile as any).id as string;

  const { data: slots } = await (supabase.from("interview_slots") as any)
    .select(`
      id, starts_at, ends_at, track, application_id, interviewer_user_id, meeting_link,
      applications(profiles!applications_student_user_id_fkey(full_name, email))
    `)
    .eq("session_id", sessionId)
    .order("starts_at", { ascending: true });

  const { data: availability } = await (supabase.from("interview_availability") as any)
    .select("user_id, starts_at, ends_at")
    .eq("session_id", sessionId);

  const peopleIds = [
    ...new Set([
      ...((availability ?? []) as any[]).map((a) => a.user_id),
      ...((slots ?? []) as any[]).map((s) => s.interviewer_user_id).filter(Boolean),
    ]),
  ];
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

  // Le fasce gia' passate spariscono: la griglia serve a dire quando ci sarai,
  // e su un orario di ieri non c'e' piu' niente da dichiarare.
  const nowMs = Date.now();
  const blocks: AvailabilityBlock[] = [...byTime.entries()]
    .filter(([startsAt]) => new Date(startsAt).getTime() >= nowMs)
    .map(([startsAt, group]) => {
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

  // Chi si può invitare a questo round: i candidati del ciclo che non sono stati
  // scartati o ritirati. Chi è già stato invitato resta in elenco col suo stato.
  const { data: candidates } = await (supabase.from("applications") as any)
    .select("id, status, profiles!applications_student_user_id_fkey(full_name, email)")
    .eq("application_cycle_id", session.application_cycle_id)
    .not("status", "in", "(rejected,withdrawn,draft)");

  const { data: invites } = await (supabase.from("interview_invites") as any)
    .select("application_id, slot_id")
    .eq("session_id", sessionId);

  const inviteByApplication = new Map(
    ((invites ?? []) as any[]).map((i) => [i.application_id, i])
  );

  const invitableCandidates: InvitableCandidate[] = ((candidates ?? []) as any[]).map((a) => {
    const invite = inviteByApplication.get(a.id);
    return {
      applicationId: a.id,
      name: a.profiles?.full_name ?? "—",
      email: a.profiles?.email ?? "",
      invited: Boolean(invite),
      booked: Boolean(invite?.slot_id),
    };
  });

  // I colloqui fissati, in ordine di orario: è la lista che serve il giorno prima.
  const bookedInterviews: BookedInterview[] = ((slots ?? []) as any[])
    .filter((s) => s.application_id)
    .map((s) => {
      const interviewer = s.interviewer_user_id ? personById.get(s.interviewer_user_id) : null;
      return {
        slotId: s.id,
        startsAt: s.starts_at,
        candidateName: s.applications?.profiles?.full_name ?? "—",
        candidateEmail: s.applications?.profiles?.email ?? "",
        interviewerName: interviewer?.full_name ?? interviewer?.email ?? null,
        meetingLink: s.meeting_link ?? null,
      };
    });


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

      </div>

      <div className="flex flex-wrap items-center gap-3">
        {canManage && !archived && (
          <Link
            href={`/association/${slug}/colloqui/${sessionId}/modifica`}
            className="text-body-sm font-medium text-navy hover:underline"
          >
            {t("editSession")}
          </Link>
        )}
        <SessionActions sessionId={sessionId} slug={slug} canManage={canManage && !archived} />
      </div>

      <BookedInterviews
        slug={slug}
        sessionId={sessionId}
        interviews={bookedInterviews}
        needsLink={session.link_mode === "per_interview"}
        placeIsLink={session.mode === "online"}
        dateLocale={dateLocale}
      />

      {!archived && <InvitePanel
        sessionId={sessionId}
        slug={slug}
        candidates={invitableCandidates}
        sessionOpen={session.status !== "closed"}
        placeMissing={
          session.link_mode === "shared" &&
          !(session.mode === "in_person" ? session.location : session.meeting_link)
        }
        placeIsLink={session.mode === "online"}
        preview={{
          sessionTitle: session.title,
          description: session.description ?? null,
          mode: session.mode,
          linkMode: session.link_mode,
          place: session.mode === "in_person" ? session.location ?? null : session.meeting_link ?? null,
        }}
      />}

      {archived ? (
        <p className="rounded-lg border border-border bg-white px-4 py-3 text-body-sm text-ink-secondary">
          {t("archivedRound")}
        </p>
      ) : (
      <AvailabilityGrid
        sessionId={sessionId}
        slug={slug}
        blocks={blocks}
        requiredInterviewers={session.required_interviewers}
        dateLocale={dateLocale}
      />
      )}
    </div>
  );
}
