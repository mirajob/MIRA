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
    .select("id, degree_program, degree_level, current_year, transcript_summary, transcript_uploaded, profile_summary, university")
    .eq("user_id", profileId)
    .single();

  const studentProfileId = student?.id as string | undefined;

  const { data: courses } = studentProfileId
    ? await (supabase.from("student_courses") as any)
        .select("course_name, course_code, credits, grade, grade_numeric, is_pass_fail, academic_year")
        .eq("student_profile_id", studentProfileId)
        .order("created_at", { ascending: true })
    : { data: [] };

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

  const degreeName = ts?.degree_program || student?.degree_program || "—";
  const degreeLevel = ts?.degree_level || student?.degree_level || "—";
  const university = student?.university || "Bocconi University";
  const weightedAvg = ts?.weighted_average;
  const totalCredits = ts?.total_credits ?? courseList.reduce((sum: number, c) => sum + (c.credits || 0), 0);
  const tsCourses = (ts?.courses ?? []) as Array<{ course_name: string; course_code?: string; credits: number; grade: string; grade_numeric: number | null; is_pass_fail: boolean; academic_year?: string }>;
  const displayCourses = courseList.length > 0 ? courseList : tsCourses;
  const gradedExams = displayCourses.filter((c) => c.grade_numeric !== null);
  const passFail = displayCourses.filter((c) => c.is_pass_fail);

  return (
    <div className="mx-auto max-w-2xl px-6 py-6 space-y-5">
      <h1 className="font-display text-h2 text-navy">Dettagli accademici</h1>

      <div className="rounded-lg border border-border bg-white p-5 space-y-4">
        <div>
          <p className="text-ink-tertiary text-body-sm">Università</p>
          <p className="text-ink font-medium">{university}</p>
        </div>
        <div>
          <p className="text-ink-tertiary text-body-sm">Corso di laurea</p>
          <p className="text-ink font-medium">{degreeName}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-ink-tertiary text-body-sm">Livello</p>
            <p className="text-ink font-medium">{degreeLevel === "triennale" ? "Triennale (Bachelor)" : degreeLevel === "magistrale" ? "Magistrale (Master)" : degreeLevel}</p>
          </div>
          <div>
            <p className="text-ink-tertiary text-body-sm">Anno</p>
            <p className="text-ink font-medium">{student?.current_year ? `${student.current_year}°` : "—"}</p>
          </div>
          <div>
            <p className="text-ink-tertiary text-body-sm">Media ponderata</p>
            <p className="text-ink font-medium">{weightedAvg ? `${Number(weightedAvg).toFixed(1)}/30` : "—"}</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-ink-tertiary text-body-sm">Crediti totali</p>
            <p className="text-ink font-medium">{totalCredits} CFU</p>
          </div>
          <div>
            <p className="text-ink-tertiary text-body-sm">Esami con voto</p>
            <p className="text-ink font-medium">{gradedExams.length}</p>
          </div>
          <div>
            <p className="text-ink-tertiary text-body-sm">Idoneità/Pass</p>
            <p className="text-ink font-medium">{passFail.length}</p>
          </div>
        </div>
      </div>

      <div className="rounded-md bg-paper border border-border px-4 py-3">
        <p className="text-body-sm text-ink-secondary">
          Hai fatto nuovi esami? Scrivi a MIRA nella chat "voglio aggiornare il libretto" e potrai caricare il PDF aggiornato.
        </p>
      </div>

      {displayCourses.length > 0 && (
        <div className="rounded-lg border border-border bg-white overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="font-sans text-h3 text-navy">Esami sostenuti</h2>
          </div>
          <div className="divide-y divide-border">
            {displayCourses.map((c, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-body-sm text-ink font-medium">{c.course_name}</p>
                  <p className="text-xs text-ink-tertiary">
                    {c.credits} CFU
                    {c.course_code ? ` • ${c.course_code}` : ""}
                    {c.academic_year ? ` • ${c.academic_year}` : ""}
                  </p>
                </div>
                <span className={`text-body-sm font-semibold ml-3 ${
                  c.is_pass_fail ? "text-ink-secondary" :
                  c.grade_numeric && c.grade_numeric >= 30 ? "text-success font-bold" :
                  c.grade_numeric && c.grade_numeric >= 28 ? "text-success" :
                  "text-ink"
                }`}>
                  {c.grade}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {displayCourses.length === 0 && (
        <div className="rounded-lg border border-border bg-white p-5 text-center">
          <p className="text-body text-ink-secondary">
            Nessun esame registrato. Carica il tuo libretto durante l&apos;onboarding per vedere i tuoi esami qui.
          </p>
        </div>
      )}
    </div>
  );
}
