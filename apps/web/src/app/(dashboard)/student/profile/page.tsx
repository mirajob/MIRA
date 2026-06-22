import { getUserContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createServerClient } from "@mira/supabase/server";

export default async function StudentProfilePage() {
  const ctx = await getUserContext();
  if (!ctx.isStudent) redirect("/api/auth/redirect");

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const supabase = await createServerClient();
  const profileId = (ctx.profile as any).id as string;

  const { data: student } = await (supabase.from("student_profiles") as any)
    .select("degree_program, degree_level, current_year, transcript_summary, transcript_uploaded, profile_summary")
    .eq("user_id", profileId)
    .single();

  const { data: courses } = await (supabase.from("student_courses") as any)
    .select("course_name, course_code, credits, grade, grade_numeric, is_pass_fail, academic_year")
    .eq("student_profile_id", profileId)
    .order("academic_year", { ascending: true });

  const ts = student?.transcript_summary as Record<string, any> | null;
  const courseList = (courses ?? []) as Array<{
    course_name: string;
    course_code: string;
    credits: number;
    grade: string;
    grade_numeric: number | null;
    is_pass_fail: boolean;
    academic_year: string;
  }>;

  return (
    <div className="mx-auto max-w-2xl px-6 py-6 space-y-5">
      <h1 className="font-display text-h2 text-navy">Dettagli accademici</h1>

      <div className="rounded-lg border border-border bg-white p-5">
        <div className="grid gap-3 sm:grid-cols-3 text-body-sm">
          <div>
            <span className="text-ink-tertiary">Corso</span>
            <p className="text-ink font-medium">{student?.degree_program || "—"}</p>
          </div>
          <div>
            <span className="text-ink-tertiary">Livello</span>
            <p className="text-ink font-medium">{student?.degree_level || "—"}</p>
          </div>
          <div>
            <span className="text-ink-tertiary">Media ponderata</span>
            <p className="text-ink font-medium">
              {ts?.weighted_average ? `${(ts.weighted_average as number).toFixed(1)}/30` : "—"}
            </p>
          </div>
        </div>
        {ts && (
          <div className="mt-3 grid gap-3 sm:grid-cols-3 text-body-sm">
            <div>
              <span className="text-ink-tertiary">Crediti totali</span>
              <p className="text-ink font-medium">{ts.total_credits ?? 0} CFU</p>
            </div>
            <div>
              <span className="text-ink-tertiary">Esami completati</span>
              <p className="text-ink font-medium">{ts.courses?.length ?? courseList.length}</p>
            </div>
            <div>
              <span className="text-ink-tertiary">Libretto</span>
              <p className="text-ink font-medium">{student?.transcript_uploaded ? "Caricato" : "Non caricato"}</p>
            </div>
          </div>
        )}
      </div>

      {courseList.length > 0 && (
        <div className="rounded-lg border border-border bg-white overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="font-sans text-h3 text-navy">Esami sostenuti</h2>
          </div>
          <div className="divide-y divide-border">
            {courseList.map((c, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-body-sm text-ink font-medium">{c.course_name}</p>
                  <p className="text-xs text-ink-tertiary">{c.credits} CFU{c.academic_year ? ` • ${c.academic_year}` : ""}</p>
                </div>
                <span className={`text-body-sm font-medium ${c.is_pass_fail ? "text-ink-secondary" : c.grade_numeric && c.grade_numeric >= 28 ? "text-success" : "text-ink"}`}>
                  {c.grade}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
