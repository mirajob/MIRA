import { getUserContext } from "@/lib/auth";
import { createServerClient } from "@mira/supabase/server";
import { redirect } from "next/navigation";

export default async function PercorsoPage() {
  const ctx = await getUserContext();
  if (!ctx.isStudent) redirect("/api/auth/redirect");

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const supabase = await createServerClient();
  const { data: student } = await (supabase.from("student_profiles") as any)
    .select("transcript_summary, interests, experiences")
    .eq("user_id", (ctx.profile as any).id)
    .single();

  const ts = student?.transcript_summary as Record<string, any> | null;
  const interests = (student?.interests as string[]) ?? [];
  const experiences = (student?.experiences as string[]) ?? [];

  // Extract competenze from courses
  const courses = (ts?.courses ?? []) as Array<{ course_name: string; credits: number; grade_numeric: number | null }>;
  const competenze = extractCompetenze(courses, experiences);

  return (
    <div className="mx-auto max-w-2xl px-6 py-6 space-y-5">
      <h1 className="font-display text-h2 text-navy">Il tuo percorso</h1>

      <div className="rounded-lg border border-border bg-white p-5">
        <h2 className="font-sans text-h3 text-navy mb-3">Le tue competenze</h2>
        {competenze.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {competenze.map((c, i) => (
              <span key={i} className="px-3 py-1.5 rounded-full bg-navy-50 text-body-sm text-navy font-medium">
                {c}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-body-sm text-ink-secondary">
            Le competenze verranno dedotte dal tuo libretto e dalle conversazioni con MIRA.
          </p>
        )}
        {interests.length > 0 && (
          <div className="mt-4">
            <p className="text-body-sm text-ink-secondary mb-2">I tuoi interessi:</p>
            <div className="flex flex-wrap gap-2">
              {interests.map((i, idx) => (
                <span key={idx} className="px-3 py-1 rounded-full bg-petrol-50 text-body-sm text-petrol-700">
                  {i}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-white p-5">
        <h2 className="font-sans text-h3 text-navy mb-2">Orientamento</h2>
        <p className="text-body text-ink-secondary">
          Presto MIRA analizzerà il tuo profilo per mostrarti quali carriere, magistrali e percorsi fanno per te — basandosi su evidenze reali, non consigli generici.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-white p-5">
        <h2 className="font-sans text-h3 text-navy mb-2">Simulazioni</h2>
        <p className="text-body text-ink-secondary">
          Le simulazioni di lavoro arriveranno presto — esercizi realistici che imitano task veri. Servono a capire come ragioni e a creare evidenze concrete nel tuo profilo.
        </p>
      </div>
    </div>
  );
}

function extractCompetenze(
  courses: Array<{ course_name: string; credits: number; grade_numeric: number | null }>,
  experiences: string[]
): string[] {
  const competenze: string[] = [];
  const courseNames = courses.map((c) => c.course_name.toLowerCase());

  const mapping: Record<string, string[]> = {
    "Financial Statements Analysis": ["financial accounting", "bilancio", "accounting"],
    "Microeconomics": ["microeconomics", "microeconomia"],
    "Macroeconomics": ["macroeconomics", "macroeconomia"],
    "Statistical Analysis": ["statistics", "statistica"],
    "Corporate Finance": ["corporate finance"],
    "Financial Markets": ["financial markets", "mercati finanziari"],
    "Management Fundamentals": ["management", "gestione"],
    "Legal Foundations": ["legal system", "diritto", "introduction to the legal"],
    "Programming": ["computer science", "informatica", "programming"],
    "Mathematical Modeling": ["mathematics", "matematica", "calculus"],
    "Economic History": ["economic history", "storia economica"],
    "Marketing Strategy": ["marketing"],
    "Public Economics": ["public finance", "public economics", "economia pubblica"],
  };

  for (const [competenza, keywords] of Object.entries(mapping)) {
    if (keywords.some((kw) => courseNames.some((cn) => cn.includes(kw)))) {
      competenze.push(competenza);
    }
  }

  if (experiences.some((e) => e.toLowerCase().includes("trading") || e.toLowerCase().includes("invest"))) {
    competenze.push("Trading & Investments");
  }

  return competenze;
}
