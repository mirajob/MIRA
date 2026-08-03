/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { hasWorkspaceAccess } from "@/lib/association-roles";
import { parseWindows } from "@/lib/interview-slots";
import { EditSessionForm } from "./edit-session-form";

interface Props {
  params: Promise<{ slug: string; sessionId: string }>;
}

/**
 * La modifica di un round sta su una pagina sua.
 *
 * Prima si apriva come pannello dentro la pagina del round, e sotto restavano
 * la griglia delle disponibilità e l'invito: si poteva agire su una versione
 * del round mentre se ne stava modificando un'altra.
 */
export default async function EditSessionPage({ params }: Props) {
  const { slug, sessionId } = await params;
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  const { data: session } = await (supabase.from("interview_sessions") as any)
    .select("*, association_profiles(slug), application_cycles(status)")
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

  // Un round di una selezione conclusa non si modifica.
  if (session.application_cycles?.status === "closed") {
    redirect(`/association/${slug}/colloqui/${sessionId}`);
  }

  const t = await getTranslations("Interviews");

  return (
    <div className="space-y-4">
      <Link
        href={`/association/${slug}/colloqui/${sessionId}`}
        className="text-body-sm text-ink-tertiary transition-colors hover:text-petrol"
      >
        &larr; {t("backToSession")}
      </Link>

      <EditSessionForm
        associationId={session.association_id}
        slug={slug}
        sessionId={sessionId}
        cycleId={session.application_cycle_id}
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
    </div>
  );
}
