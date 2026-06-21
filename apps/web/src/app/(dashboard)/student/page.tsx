import { getUserContext } from "@/lib/auth";
import { createServerClient } from "@mira/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function StudentHomePage() {
  const ctx = await getUserContext();
  if (!ctx.isStudent) redirect("/api/auth/redirect");

  const supabase = await createServerClient();
  const { data: student } = await supabase
    .from("student_profiles")
    .select("onboarding_completed, profile_summary, degree_program, transcript_uploaded")
    .eq("user_id", ctx.profile.id)
    .single();

  if (!student?.onboarding_completed) {
    redirect("/student/onboarding");
  }

  const { data: applications } = await supabase
    .from("applications")
    .select("id, status, submitted_at, association_profiles(name, slug)")
    .eq("student_user_id", ctx.profile.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const name = ctx.profile.full_name?.split(" ")[0] ?? "";
  const s = student as Record<string, unknown>;

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 space-y-6">
      <h1 className="font-display text-h1 text-navy">
        Ciao{name ? `, ${name}` : ""}
      </h1>

      {s.profile_summary && (
        <div className="rounded-lg border border-border bg-white p-6">
          <p className="text-eyebrow text-navy/60 uppercase mb-2">Il tuo profilo MIRA</p>
          <p className="text-body text-ink whitespace-pre-wrap">
            {s.profile_summary as string}
          </p>
          {s.degree_program && (
            <p className="mt-3 text-body-sm text-ink-secondary">
              {s.degree_program as string} {s.transcript_uploaded ? "• Libretto caricato" : ""}
            </p>
          )}
          <Link
            href="/student/profile"
            className="mt-3 inline-block text-body-sm text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700"
          >
            Profilo completo →
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/associations"
          className="rounded-lg border border-border bg-white p-6 hover:border-petrol transition-colors duration-100"
        >
          <h2 className="font-sans text-h3 text-navy">Associazioni</h2>
          <p className="mt-1 text-body-sm text-ink-secondary">Scopri e candidati</p>
        </Link>

        <Link
          href="/student/applications"
          className="rounded-lg border border-border bg-white p-6 hover:border-petrol transition-colors duration-100"
        >
          <h2 className="font-sans text-h3 text-navy">Candidature</h2>
          <p className="mt-1 text-body-sm text-ink-secondary">
            {applications?.length ? `${applications.length} candidatur${applications.length === 1 ? "a" : "e"}` : "Nessuna candidatura"}
          </p>
        </Link>
      </div>
    </div>
  );
}
