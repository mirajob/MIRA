import { getUserContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createServerClient } from "@mira/supabase/server";
import Link from "next/link";

export default async function StudentProfilePage() {
  const ctx = await getUserContext();
  if (!ctx.isStudent) redirect("/login");

  const supabase = await createServerClient();
  const { data: studentProfile } = await supabase
    .from("student_profiles")
    .select("*")
    .eq("user_id", ctx.profile.id)
    .single();

  const sp = studentProfile as Record<string, unknown> | null;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="font-display text-h1 text-navy">Il tuo profilo MIRA</h1>

      {sp?.profile_summary ? (
        <div className="rounded-lg border border-border bg-white p-6">
          <p className="text-body text-ink whitespace-pre-wrap">
            {sp.profile_summary as string}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-white p-6 text-center">
          <p className="text-body text-ink-secondary">
            Il tuo profilo si costruisce parlando con MIRA.
          </p>
          <Link
            href="/student/onboarding"
            className="mt-4 inline-block bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 transition-colors duration-100"
          >
            Parla con MIRA
          </Link>
        </div>
      )}

      {sp?.degree_program && (
        <div className="rounded-lg border border-border bg-white p-6 space-y-3">
          <h2 className="font-sans text-h3 text-navy">Percorso accademico</h2>
          <div className="grid gap-3 sm:grid-cols-2 text-body">
            {sp.degree_program && (
              <div>
                <span className="text-ink-secondary">Corso: </span>
                <span className="text-ink">{sp.degree_program as string}</span>
              </div>
            )}
            {sp.degree_level && (
              <div>
                <span className="text-ink-secondary">Livello: </span>
                <span className="text-ink">{sp.degree_level as string}</span>
              </div>
            )}
            {sp.current_year && (
              <div>
                <span className="text-ink-secondary">Anno: </span>
                <span className="text-ink">{sp.current_year as number}°</span>
              </div>
            )}
          </div>
        </div>
      )}

      {((sp?.interests as string[])?.length > 0 || (sp?.goals as string[])?.length > 0) && (
        <div className="rounded-lg border border-border bg-white p-6 space-y-3">
          <h2 className="font-sans text-h3 text-navy">Interessi e obiettivi</h2>
          {(sp?.interests as string[])?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {(sp.interests as string[]).map((i, idx) => (
                <span key={idx} className="px-3 py-1 rounded-full bg-navy-50 text-body-sm text-navy">{i}</span>
              ))}
            </div>
          )}
          {(sp?.goals as string[])?.length > 0 && (
            <div className="mt-2">
              {(sp.goals as string[]).map((g, idx) => (
                <p key={idx} className="text-body text-ink-secondary">• {g}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
