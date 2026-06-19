import { createServerClient } from "@mira/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { APPLICATION_STATUS_LABELS } from "@mira/domain";

interface Props {
  params: Promise<{ slug: string }>;
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

export default async function CandidatesPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createServerClient();

  const { data: association } = await supabase
    .from("association_profiles")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (!association) notFound();

  const { data: applications } = await supabase
    .from("applications")
    .select(`
      id, status, submitted_at, last_status_change_at,
      profiles(full_name, email),
      student_profiles(degree_program, current_year),
      application_cycles(title),
      candidate_ai_evaluations(overall_fit_category, confidence)
    `)
    .eq("association_id", association.id)
    .neq("status", "draft")
    .order("submitted_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-h2 text-navy">Candidati</h2>
        <p className="mt-1 text-body text-ink-secondary">
          {applications?.length ?? 0} candidature ricevute
        </p>
      </div>

      {!applications?.length ? (
        <div className="rounded-lg border border-border bg-white p-8 text-center">
          <p className="text-body text-ink-secondary">Nessuna candidatura ancora ricevuta</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-white overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">Candidato</th>
                <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">Corso</th>
                <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">Ciclo</th>
                <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">Stato</th>
                <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">AI Fit</th>
                <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">Data</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => {
                const profile = app.profiles as { full_name: string | null; email: string } | null;
                const studentProfile = app.student_profiles as { degree_program: string | null; current_year: number | null } | null;
                const cycle = app.application_cycles as { title: string } | null;
                const aiEval = (app.candidate_ai_evaluations as Array<{ overall_fit_category: string; confidence: string }>)?.[0];

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
                      {studentProfile?.degree_program ?? "—"}
                      {studentProfile?.current_year && ` · ${studentProfile.current_year}° anno`}
                    </td>
                    <td className="py-4 px-4 text-body-sm text-ink">
                      {cycle?.title ?? "—"}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-body-sm font-medium ${STATUS_COLORS[app.status] ?? "bg-navy-50 text-navy"}`}>
                        {APPLICATION_STATUS_LABELS[app.status] ?? app.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-body-sm text-ink">
                      {aiEval ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-eyebrow font-medium uppercase ${
                          aiEval.overall_fit_category === "strong_fit" ? "bg-success-bg text-success"
                          : aiEval.overall_fit_category === "good_fit" ? "bg-petrol-50 text-petrol-700"
                          : aiEval.overall_fit_category === "uncertain_fit" ? "bg-warning-bg text-warning"
                          : "bg-error-bg text-error"
                        }`}>
                          {aiEval.overall_fit_category?.replace("_", " ")}
                        </span>
                      ) : (
                        <span className="text-ink-tertiary">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-body-sm text-ink-secondary">
                      {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString("it-IT") : "—"}
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
