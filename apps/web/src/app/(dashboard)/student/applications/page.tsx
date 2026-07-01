import { getUserContext } from "@/lib/auth";
import { createServerClient } from "@mira/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { APPLICATION_STATUS_LABELS } from "@mira/domain";
import { MarkNotificationsRead } from "./mark-read";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-navy-50 text-ink-tertiary",
  submitted: "bg-petrol-50 text-petrol-700",
  in_review: "bg-warning-bg text-warning",
  interview: "bg-petrol-50 text-petrol-700",
  accepted: "bg-success-bg text-success",
  rejected: "bg-error-bg text-error",
  waitlisted: "bg-navy-50 text-navy",
  withdrawn: "bg-navy-50 text-ink-tertiary",
};

export default async function StudentApplicationsPage() {
  const ctx = await getUserContext();
  if (!ctx.isStudent) redirect("/api/auth/redirect");

  const supabase = await createServerClient();

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const { data: applications } = await (supabase.from("applications") as any)
    .select(`
      id, status, submitted_at, last_status_change_at,
      association_profiles(name, slug, logo_url),
      application_cycles(title),
      interview_invites(id, selected_time, location_or_link, status)
    `)
    .eq("student_user_id", ctx.profile.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl px-6 py-6 space-y-6">
      <MarkNotificationsRead />

      <div>
        <h1 className="font-display text-h2 text-navy">Le tue candidature</h1>
        <p className="mt-1 text-body text-ink-secondary">
          Segui lo stato delle tue candidature alle associazioni
        </p>
      </div>

      {!applications?.length ? (
        <div className="rounded-lg border border-border bg-white p-8 text-center space-y-3">
          <p className="text-body text-ink-secondary">Non hai ancora candidature.</p>
          <Link
            href="/student/associazioni"
            className="inline-block text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700 text-body-sm"
          >
            Scopri le associazioni →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {(applications as any[]).map((app) => {
            const assoc = app.association_profiles as { name: string; slug: string; logo_url: string | null } | null;
            const cycle = app.application_cycles as { title: string } | null;
            const interviews = (app.interview_invites ?? []) as Array<{
              id: string; selected_time: string | null; location_or_link: string | null; status: string;
            }>;
            const upcomingInterview = interviews.find((i) => i.selected_time && i.status !== "cancelled");

            return (
              <Link
                key={app.id}
                href={`/student/applications/${app.id}`}
                className="block rounded-lg border border-border bg-white p-5 hover:border-navy/30 hover:shadow-sm transition-all duration-100"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {assoc?.logo_url ? (
                      <img src={assoc.logo_url} alt="" className="h-9 w-9 rounded-md object-cover shrink-0 mt-0.5" />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-navy text-white text-label font-semibold shrink-0 mt-0.5">
                        {assoc?.name?.charAt(0) ?? "?"}
                      </div>
                    )}
                    <div>
                      <p className="font-sans text-h3 text-navy">{assoc?.name ?? "Associazione"}</p>
                      <p className="text-body-sm text-ink-tertiary mt-0.5">
                        {cycle?.title}
                        {app.submitted_at && ` · Inviata il ${new Date(app.submitted_at).toLocaleDateString("it-IT")}`}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUS_COLORS[app.status] ?? "bg-navy-50 text-navy"}`}>
                    {APPLICATION_STATUS_LABELS[app.status] ?? app.status}
                  </span>
                </div>

                {upcomingInterview && (
                  <div className="mt-3 rounded-md bg-petrol-50 px-3 py-2">
                    <p className="text-xs font-medium text-navy">Colloquio programmato</p>
                    <p className="text-body-sm text-ink mt-0.5">
                      {new Date(upcomingInterview.selected_time!).toLocaleDateString("it-IT", {
                        weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                    {upcomingInterview.location_or_link && (
                      <p className="text-body-sm text-ink-secondary">{upcomingInterview.location_or_link}</p>
                    )}
                  </div>
                )}

                {app.status === "accepted" && (
                  <div className="mt-3 rounded-md bg-success-bg px-3 py-2">
                    <p className="text-body-sm text-success font-medium">
                      Congratulazioni! Sei stato accettato.
                    </p>
                  </div>
                )}

                <p className="mt-3 text-xs text-ink-tertiary">Vedi dettagli →</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
