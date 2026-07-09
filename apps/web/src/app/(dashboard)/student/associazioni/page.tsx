import { getUserContext } from "@/lib/auth";
import { createServerClient } from "@mira/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { APPLICATION_STATUS_LABELS } from "@mira/domain";
import { JoinByCode } from "@/components/join-by-code";
import { WORKSPACE_ROLES } from "@/lib/association-roles";
import { MarkAssociationNotificationsRead } from "./mark-read";

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

export default async function StudentAssociazioniPage() {
  const ctx = await getUserContext();
  if (!ctx.isStudent) redirect("/api/auth/redirect");

  const t = await getTranslations("Associazioni");
  const c = await getTranslations("Common");
  const locale = await getLocale();
  const dateLocale = locale === "it" ? "it-IT" : "en-US";

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const supabase = await createServerClient();
  const profileId = (ctx.profile as any).id as string;

  const { data: associations } = await (supabase.from("association_profiles") as any)
    .select("id, name, slug, category, short_description, logo_url, sectors")
    .eq("public_page_status", "published")
    .order("name");

  const { data: openCycles } = await (supabase.from("application_cycles") as any)
    .select("id, title, closes_at, association_id")
    .eq("status", "open");

  const { data: myApplications } = await (supabase.from("applications") as any)
    .select(`
      id, status, association_id, application_cycle_id, submitted_at,
      association_profiles(name, slug, logo_url),
      application_cycles(title, status),
      interview_invites(id, selected_time, location_or_link, status)
    `)
    .eq("student_user_id", profileId)
    .order("submitted_at", { ascending: false });

  const { data: myMemberships } = await (supabase.from("association_memberships") as any)
    .select("association_id, role, joined_at, association_profiles(name, slug, verification_status, public_page_status)")
    .eq("user_id", profileId)
    .eq("status", "active");

  const { data: studentProfile } = await (supabase.from("student_profiles") as any)
    .select("onboarding_completed")
    .eq("user_id", profileId)
    .maybeSingle();

  const cyclesByAssoc = new Map<string, any[]>();
  for (const c of openCycles ?? []) {
    const list = cyclesByAssoc.get(c.association_id) ?? [];
    list.push(c);
    cyclesByAssoc.set(c.association_id, list);
  }

  // Only track applications to OPEN cycles for the "already applied" state on each association card
  const appsByAssoc = new Map<string, any>();
  const openCycleIds = new Set((openCycles ?? []).map((c: any) => c.id));
  for (const a of myApplications ?? []) {
    if (openCycleIds.has(a.application_cycle_id) && !appsByAssoc.has(a.association_id)) {
      appsByAssoc.set(a.association_id, a);
    }
  }

  const membershipByAssoc = new Map<string, any>();
  for (const m of myMemberships ?? []) {
    membershipByAssoc.set(m.association_id, m);
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-6 space-y-6">
      <MarkAssociationNotificationsRead />

      <div>
        <h1 className="font-display text-h2 text-navy">{t("pageTitle")}</h1>
        <p className="mt-1 text-body text-ink-secondary">
          {t("pageSubtitle")}
        </p>
      </div>

      <JoinByCode />

      {(() => {
        const pendingPages = (myMemberships ?? []).filter(
          (m: any) => WORKSPACE_ROLES.includes(m.role) && m.association_profiles?.public_page_status === "draft"
        );
        const showOnboardingPrompt = (myMemberships ?? []).length > 0 && !studentProfile?.onboarding_completed;

        if (pendingPages.length === 0 && !showOnboardingPrompt) return null;

        return (
          <div className="rounded-lg border border-petrol/30 bg-petrol-50 p-5 space-y-3">
            <h2 className="font-sans text-h3 text-navy">{t("todoHeading")}</h2>

            {pendingPages.map((m: any) => (
              <div key={m.association_id} className="flex items-center justify-between gap-3 rounded-md bg-white px-4 py-3">
                <span className="text-body text-ink">
                  {t.rich("pageNotPublic", {
                    name: m.association_profiles.name,
                    strong: (chunks) => <strong className="text-navy">{chunks}</strong>,
                  })}
                </span>
                <Link
                  href={`/association/${m.association_profiles.slug}/public-page`}
                  className="flex-shrink-0 bg-navy text-white px-4 py-1.5 rounded-md text-body-sm hover:bg-navy-700 transition-colors duration-100"
                >
                  {t("completePageCta")}
                </Link>
              </div>
            ))}

            {showOnboardingPrompt && (
              <Link
                href="/student/onboarding"
                className="block rounded-md bg-white px-4 py-3 text-body-sm text-petrol-700 hover:bg-petrol-100/50 transition-colors"
              >
                {t("completeProfileCta")}
              </Link>
            )}
          </div>
        );
      })()}

      {/* Le tue candidature */}
      <div>
        <h2 className="font-sans text-h3 text-navy mb-3">{t("myApplicationsHeading")}</h2>

        {!myApplications?.length ? (
          <div className="rounded-lg border border-border bg-white p-6 text-center">
            <p className="text-body-sm text-ink-secondary">{t("noApplications")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(myApplications as any[]).map((app) => {
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
                  className="block rounded-lg border border-border bg-white p-4 hover:border-navy/30 hover:shadow-sm transition-all duration-100"
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
                        <p className="font-sans text-h3 text-navy">{assoc?.name ?? c("associationFallback")}</p>
                        <p className="text-body-sm text-ink-tertiary mt-0.5">
                          {cycle?.title}
                          {app.submitted_at && c("submittedOn", { date: new Date(app.submitted_at).toLocaleDateString(dateLocale) })}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUS_COLORS[app.status] ?? "bg-navy-50 text-navy"}`}>
                      {APPLICATION_STATUS_LABELS[app.status] ?? app.status}
                    </span>
                  </div>

                  {upcomingInterview && (
                    <div className="mt-3 rounded-md bg-petrol-50 px-3 py-2">
                      <p className="text-xs font-medium text-navy">{t("interviewScheduled")}</p>
                      <p className="text-body-sm text-ink mt-0.5">
                        {new Date(upcomingInterview.selected_time!).toLocaleDateString(dateLocale, {
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
                      <p className="text-body-sm text-success font-medium">{t("congratsAccepted")}</p>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Tutte le associazioni */}
      <div>
        <h2 className="font-sans text-h3 text-navy mb-3">{t("allAssociationsHeading")}</h2>
        <div className="space-y-4">
          {(associations ?? []).map((assoc: any) => {
            const cycles = cyclesByAssoc.get(assoc.id) ?? [];
            const myApp = appsByAssoc.get(assoc.id);
            const membership = membershipByAssoc.get(assoc.id);
            const hasOpenCycle = cycles.length > 0;

            return (
              <div key={assoc.id} className="rounded-lg border border-border bg-white p-5">
                <div className="flex items-start gap-3">
                  {assoc.logo_url ? (
                    <img src={assoc.logo_url} alt="" className="h-10 w-10 rounded-md object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-navy text-white text-label font-semibold shrink-0">
                      {assoc.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-sans text-h3 text-navy">{assoc.name}</h3>
                      {membership && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-petrol-50 text-petrol-700">
                          {c.has(`boardRoles.${membership.role}`) ? c(`boardRoles.${membership.role}`) : membership.role}
                        </span>
                      )}
                    </div>
                    {assoc.category && (
                      <p className="text-body-sm text-ink-tertiary">
                        {assoc.category.charAt(0).toUpperCase() + assoc.category.slice(1).replace("_", " ")}
                      </p>
                    )}
                  </div>
                </div>

                {assoc.short_description && (
                  <p className="mt-2 text-body-sm text-ink-secondary">{assoc.short_description}</p>
                )}

                {assoc.sectors?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {assoc.sectors.map((s: string) => (
                      <span key={s} className="px-2 py-0.5 rounded-full text-xs font-medium bg-navy-50 text-navy">
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex items-center gap-3">
                  <Link
                    href={`/associations/${assoc.slug}`}
                    className="text-body-sm text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700"
                  >
                    {t("viewPage")}
                  </Link>

                  {membership ? (
                    <Link
                      href={`/association/${assoc.slug}`}
                      className="bg-petrol text-white px-4 py-1.5 rounded-md text-body-sm hover:bg-petrol-700 transition-colors duration-100"
                    >
                      {t("manage")}
                    </Link>
                  ) : myApp ? (
                    <span className="text-body-sm text-ink-secondary">
                      {t("applicationStatus", { status: APPLICATION_STATUS_LABELS[myApp.status] ?? myApp.status })}
                    </span>
                  ) : hasOpenCycle ? (
                    <Link
                      href={`/associations/${assoc.slug}/apply?cycle=${cycles[0].id}`}
                      className="bg-navy text-white px-4 py-1.5 rounded-md text-body-sm hover:bg-navy-700 transition-colors duration-100"
                    >
                      {t("applyNow")}
                    </Link>
                  ) : (
                    <span className="text-body-sm text-ink-tertiary">{t("applicationsClosed")}</span>
                  )}
                </div>
              </div>
            );
          })}

          {!(associations?.length) && (
            <div className="rounded-lg border border-border bg-white p-8 text-center">
              <p className="text-body text-ink-secondary">{t("noAssociationsAvailable")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
