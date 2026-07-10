/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServiceClient } from "@mira/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { APPLICATION_STATUS_LABELS } from "@mira/domain";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ cycle?: string }>;
}

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-petrol-50 text-petrol-700",
  in_review: "bg-warning-bg text-warning",
  interview: "bg-petrol-50 text-petrol-700",
  accepted: "bg-success-bg text-success",
  rejected: "bg-error-bg text-error",
  waitlisted: "bg-navy-50 text-navy",
  withdrawn: "bg-navy-50 text-ink-tertiary",
};

export default async function CandidatesPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { cycle: cycleFilter } = await searchParams;
  const supabase = await createServiceClient();
  const t = await getTranslations("CandidatesList");
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

  const openCycleIds = (cycles ?? []).filter((c: any) => c.status === "open").map((c: any) => c.id);
  const showAll = cycleFilter === "all";
  const effectiveFilter = showAll ? null : (cycleFilter || (openCycleIds.length === 1 ? openCycleIds[0] : null));

  let query = (supabase.from("applications") as any)
    .select(`
      id, status, submitted_at, last_status_change_at, application_cycle_id, selected_role_preferences,
      profiles(full_name, email),
      student_profiles(degree_program, current_year),
      application_cycles(title, status),
      candidate_ai_evaluations(id)
    `)
    .eq("association_id", association.id)
    .neq("status", "draft")
    .order("submitted_at", { ascending: false });

  if (effectiveFilter) {
    query = query.eq("application_cycle_id", effectiveFilter);
  }

  const { data: allApplications } = await query;

  const openApps = (allApplications ?? []).filter((a: any) => a.application_cycles?.status === "open");
  const closedApps = (allApplications ?? []).filter((a: any) => a.application_cycles?.status !== "open");
  const applications = showAll ? (allApplications ?? []) : (effectiveFilter ? (allApplications ?? []) : openApps);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-h2 text-navy">{t("heading")}</h2>
          <p className="mt-1 text-body text-ink-secondary">
            {t("countLabel", { count: applications?.length ?? 0 })}{effectiveFilter ? "" : t("openCyclesSuffix")}
          </p>
        </div>
        {(cycles?.length ?? 0) > 1 && (
          <div className="flex flex-wrap gap-2">
            {(cycles ?? []).filter((c: any) => c.status === "open").map((c: any) => (
              <Link
                key={c.id}
                href={`/association/${slug}/candidates?cycle=${c.id}`}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${effectiveFilter === c.id ? "bg-navy text-white" : "border border-border text-ink-secondary hover:text-navy"}`}
              >
                {c.title}
              </Link>
            ))}
            <Link
              href={`/association/${slug}/candidates?cycle=all`}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${cycleFilter === "all" ? "bg-navy text-white" : "border border-border text-ink-tertiary hover:text-navy"}`}
            >
              {t("allFilter")}
            </Link>
          </div>
        )}
      </div>

      {!applications?.length ? (
        <div className="rounded-lg border border-border bg-white p-8 text-center">
          <p className="text-body text-ink-secondary">{t("noApplications")}</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-white overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">{t("tableHeaders.candidate")}</th>
                <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">{t("tableHeaders.position")}</th>
                <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">{t("tableHeaders.status")}</th>
                <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">{t("tableHeaders.evaluation")}</th>
                <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">{t("tableHeaders.date")}</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app: any) => {
                const profile = app.profiles as { full_name: string | null; email: string } | null;
                const studentProfile = app.student_profiles as { degree_program: string | null; current_year: number | null } | null;
                const cycle = app.application_cycles as { title: string } | null;
                const aiEval = (app.candidate_ai_evaluations as Array<Record<string, unknown>>)?.[0];

                return (
                  <tr key={app.id} className="border-b border-border last:border-0 hover:bg-navy-50/50">
                    <td className="py-4 px-4">
                      <Link href={`/association/${slug}/candidates/${app.id}`} className="block">
                        <p className="text-body font-medium text-navy hover:text-petrol transition-colors">
                          {profile?.full_name ?? "—"}
                        </p>
                        <p className="text-body-sm text-ink-tertiary">{profile?.email}</p>
                      </Link>
                    </td>
                    <td className="py-4 px-4 text-body-sm text-ink">
                      {app.selected_role_preferences?.[0] || t("genericPosition")}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-body-sm font-medium ${STATUS_COLORS[app.status] ?? "bg-navy-50 text-navy"}`}>
                        {APPLICATION_STATUS_LABELS[app.status] ?? app.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-body-sm text-ink">
                      {aiEval ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-eyebrow font-medium uppercase bg-petrol-50 text-petrol-700">
                          {t("evaluated")}
                        </span>
                      ) : (
                        <span className="text-ink-tertiary">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-body-sm text-ink-secondary">
                      {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString(dateLocale) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
