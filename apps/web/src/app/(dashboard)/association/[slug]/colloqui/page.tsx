/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { hasWorkspaceAccess } from "@/lib/association-roles";
import { APP_TIME_ZONE } from "@/lib/format-date";
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

  // Conteggi per sessione: slot totali, coperti da almeno un intervistatore, prenotati.
  const sessionIds = ((sessions ?? []) as any[]).map((s) => s.id);
  const { data: slots } = sessionIds.length
    ? await (supabase.from("interview_slots") as any)
        .select("id, session_id, application_id, starts_at, interview_slot_interviewers(user_id)")
        .in("session_id", sessionIds)
    : { data: [] };

  const stats = new Map<string, { total: number; covered: number; booked: number; first: string | null }>();
  for (const slot of (slots ?? []) as any[]) {
    const entry = stats.get(slot.session_id) ?? { total: 0, covered: 0, booked: 0, first: null };
    entry.total++;
    if ((slot.interview_slot_interviewers ?? []).length > 0) entry.covered++;
    if (slot.application_id) entry.booked++;
    if (!entry.first || slot.starts_at < entry.first) entry.first = slot.starts_at;
    stats.set(slot.session_id, entry);
  }

  const cycleOptions: CycleOption[] = ((cycles ?? []) as any[]).map((c) => ({
    id: c.id,
    title: c.title,
  }));

  const statusClass: Record<string, string> = {
    draft: "bg-amber-100 text-amber-700",
    open: "bg-emerald-100 text-emerald-700",
    closed: "bg-navy-50 text-ink-tertiary",
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-eyebrow uppercase text-navy/60">{t("eyebrow")}</p>
        <h1 className="font-display text-h2 text-navy">{t("heading")}</h1>
        <p className="mt-0.5 text-body-sm text-ink-secondary">{t("subhead")}</p>
      </div>

      <NewSessionPanel associationId={association.id} slug={slug} cycles={cycleOptions} />

      {!(sessions ?? []).length ? (
        <div className="rounded-lg border border-border bg-white p-6 text-center">
          <p className="text-body-sm text-ink-secondary">{t("noSessions")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {((sessions ?? []) as any[]).map((session) => {
            const s = stats.get(session.id) ?? { total: 0, covered: 0, booked: 0, first: null };
            return (
              <Link
                key={session.id}
                href={`/association/${slug}/colloqui/${session.id}`}
                className="block rounded-lg border border-border bg-white px-4 py-3 transition-colors duration-100 hover:border-border-strong"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-eyebrow uppercase text-navy/50">
                    {t("roundLabel", { index: session.round_index })}
                  </span>
                  <span className="text-body-sm font-medium text-navy">{session.title}</span>
                  <span className="text-body-sm text-ink-tertiary">
                    {session.mode === "online" ? t("modeOnline") : t("modeInPerson")}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass[session.status] ?? ""}`}
                  >
                    {t(`status.${session.status}`)}
                  </span>
                  <span className="ml-auto text-body-sm text-ink-tertiary">
                    {session.application_cycles?.title}
                  </span>
                </div>

                <p className="mt-1 text-body-sm text-ink-secondary">
                  {s.first
                    ? t("startsOn", {
                        date: new Date(s.first).toLocaleString(dateLocale, {
                          timeZone: APP_TIME_ZONE,
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          hour: "2-digit",
                          minute: "2-digit",
                        }),
                      })
                    : t("noSlots")}
                </p>

                <p className="mt-0.5 text-body-sm text-ink-tertiary">
                  {t("slotSummary", { total: s.total, covered: s.covered, booked: s.booked })}
                  {s.covered < s.total && (
                    <span className="ml-2 text-warning">
                      {t("uncoveredWarning", { count: s.total - s.covered })}
                    </span>
                  )}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
