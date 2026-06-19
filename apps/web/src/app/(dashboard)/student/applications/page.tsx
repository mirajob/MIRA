import { getUserContext } from "@/lib/auth";
import { createServerClient } from "@mira/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { APPLICATION_STATUS_LABELS } from "@mira/domain";

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
  if (!ctx.isStudent) redirect("/login");

  const supabase = await createServerClient();

  const { data: applications } = await supabase
    .from("applications")
    .select(`
      id, status, submitted_at, last_status_change_at,
      association_profiles(name, slug),
      application_cycles(title),
      interview_invites(id, selected_time, location_or_link, status)
    `)
    .eq("student_user_id", ctx.profile.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-h1 text-navy">Le tue candidature</h1>
        <p className="mt-1 text-body text-ink-secondary">
          Segui lo stato delle tue candidature alle associazioni
        </p>
      </div>

      {!applications?.length ? (
        <div className="rounded-lg border border-border bg-white p-8 text-center">
          <p className="text-body text-ink-secondary">Non hai ancora candidature.</p>
          <Link
            href="/associations"
            className="mt-4 inline-block text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700"
          >
            Scopri le associazioni →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            const assoc = app.association_profiles as { name: string; slug: string } | null;
            const cycle = app.application_cycles as { title: string } | null;
            const interviews = app.interview_invites as Array<{
              id: string; selected_time: string | null; location_or_link: string | null; status: string;
            }>;

            return (
              <div key={app.id} className="rounded-lg border border-border bg-white p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-sans text-h3 text-navy">{assoc?.name ?? "Associazione"}</h2>
                    <p className="text-body-sm text-ink-tertiary mt-1">
                      {cycle?.title}
                      {app.submitted_at && ` · Inviata il ${new Date(app.submitted_at).toLocaleDateString("it-IT")}`}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-body-sm font-medium ${STATUS_COLORS[app.status] ?? "bg-navy-50 text-navy"}`}>
                    {APPLICATION_STATUS_LABELS[app.status] ?? app.status}
                  </span>
                </div>

                {interviews?.length > 0 && (
                  <div className="mt-4 rounded-md bg-petrol-50 p-4">
                    <p className="text-label text-navy mb-1">Colloquio programmato</p>
                    {interviews.map((inv) => (
                      <div key={inv.id} className="text-body-sm text-ink">
                        {inv.selected_time && (
                          <p>
                            {new Date(inv.selected_time).toLocaleDateString("it-IT", {
                              weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit"
                            })}
                          </p>
                        )}
                        {inv.location_or_link && <p>{inv.location_or_link}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {app.status === "accepted" && (
                  <div className="mt-4 rounded-md bg-success-bg p-4">
                    <p className="text-body-sm text-success font-medium">
                      Congratulazioni! La tua candidatura è stata accettata.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
