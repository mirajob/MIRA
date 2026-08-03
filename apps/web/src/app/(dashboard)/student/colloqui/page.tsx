/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { APP_TIME_ZONE } from "@/lib/format-date";
import { PageBar } from "@/components/page-bar";

/**
 * I colloqui dello studente: quelli da fissare, quelli in programma e quelli
 * passati. Prima di questa pagina un invito viveva solo dentro un'email.
 */
export default async function StudentInterviewsPage() {
  const ctx = await getUserContext();
  if (!ctx.isStudent && !ctx.isMiraAdmin) redirect("/api/auth/redirect");

  const t = await getTranslations("StudentInterviews");
  const locale = await getLocale();
  const dateLocale = locale === "it" ? "it-IT" : "en-US";
  const supabase = await createServiceClient();
  const profileId = (ctx.profile as any).id as string;

  const { data: invites } = await (supabase.from("interview_invites") as any)
    .select(`
      id, slot_id, selected_time, location_or_link, status,
      interview_sessions(title, mode, location, meeting_link, status, association_profiles(name, slug))
    `)
    .eq("candidate_user_id", profileId)
    .order("created_at", { ascending: false });

  const rows = ((invites ?? []) as any[]).filter((i) => i.interview_sessions);
  const now = Date.now();

  const toBook = rows.filter((i) => !i.selected_time);
  const upcoming = rows
    .filter((i) => i.selected_time && new Date(i.selected_time).getTime() > now)
    .sort((a, b) => a.selected_time.localeCompare(b.selected_time));
  const past = rows
    .filter((i) => i.selected_time && new Date(i.selected_time).getTime() <= now)
    .sort((a, b) => b.selected_time.localeCompare(a.selected_time));

  function whenLabel(value: string) {
    return new Date(value).toLocaleString(dateLocale, {
      timeZone: APP_TIME_ZONE,
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function InterviewRow({ invite, muted }: { invite: any; muted?: boolean }) {
    const session = invite.interview_sessions;
    const place =
      session.mode === "in_person"
        ? session.location
        : invite.location_or_link ?? session.meeting_link;

    return (
      <Link
        href={`/student/colloqui/${invite.id}`}
        className={`block rounded-lg border border-border bg-white px-4 py-3 transition-colors duration-100 hover:border-border-strong ${
          muted ? "opacity-70" : ""
        }`}
      >
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-body-sm font-medium text-navy">
            {session.association_profiles?.name}
          </span>
          <span className="text-body-sm text-ink-secondary">{session.title}</span>
          <span className="ml-auto text-body-sm text-ink-tertiary">
            {session.mode === "online" ? t("online") : t("inPerson")}
          </span>
        </div>

        {invite.selected_time ? (
          <p className="mt-1 text-body-sm text-ink">{whenLabel(invite.selected_time)}</p>
        ) : (
          <p className="mt-1 text-body-sm text-petrol">{t("chooseNow")}</p>
        )}

        {place && invite.selected_time && (
          <p className="mt-0.5 truncate text-body-sm text-ink-tertiary">{place}</p>
        )}
      </Link>
    );
  }

  return (
    <div className="space-y-4">
      <PageBar title={t("pageTitle")} />
      <p className="max-w-2xl text-body-sm text-ink-secondary">{t("pageSubtitle")}</p>

      {!rows.length && (
        <div className="rounded-lg border border-border bg-white p-8 text-center">
          <p className="text-body text-ink-secondary">{t("empty")}</p>
        </div>
      )}

      {toBook.length > 0 && (
        <div>
          <h2 className="text-body font-medium text-navy mb-3">{t("toBookHeading")}</h2>
          <div className="space-y-2">
            {toBook.map((i) => (
              <InterviewRow key={i.id} invite={i} />
            ))}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div>
          <h2 className="text-body font-medium text-navy mb-3">{t("upcomingHeading")}</h2>
          <div className="space-y-2">
            {upcoming.map((i) => (
              <InterviewRow key={i.id} invite={i} />
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer select-none text-body-sm text-ink-tertiary transition-colors hover:text-ink-secondary">
            {t("pastHeading", { count: past.length })}
          </summary>
          <div className="mt-3 space-y-2">
            {past.map((i) => (
              <InterviewRow key={i.id} invite={i} muted />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
