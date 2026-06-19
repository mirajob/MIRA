import { getUserContext } from "@/lib/auth";
import { createServerClient } from "@mira/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function StudentHomePage() {
  const ctx = await getUserContext();
  if (!ctx.isStudent) redirect("/login");

  const supabase = await createServerClient();
  const { data: student } = await supabase
    .from("student_profiles")
    .select("onboarding_completed, transcript_uploaded, degree_program")
    .eq("user_id", ctx.profile.id)
    .single();

  const { data: applications } = await supabase
    .from("applications")
    .select("id, status, submitted_at, association_profiles(name, slug)")
    .eq("student_user_id", ctx.profile.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const needsOnboarding = !student?.onboarding_completed;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-h1 text-navy">
          Ciao{ctx.profile.full_name ? `, ${ctx.profile.full_name}` : ""}
        </h1>
        <p className="mt-1 text-body text-ink-secondary">Benvenuto su MIRA</p>
      </div>

      {needsOnboarding && (
        <div className="rounded-lg border-2 border-petrol bg-petrol-50 p-6">
          <h2 className="font-sans text-h3 text-navy">Completa il tuo profilo</h2>
          <p className="mt-2 text-body text-ink-secondary">
            Per candidarti alle associazioni devi prima completare il tuo profilo MIRA.
          </p>
          <Link
            href="/student/onboarding"
            className="mt-4 inline-block bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100"
          >
            Inizia onboarding
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-white p-6">
          <h2 className="font-sans text-h3 text-navy">Le tue candidature</h2>
          {!applications?.length ? (
            <p className="mt-2 text-body text-ink-secondary">
              Non hai ancora candidature attive.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {applications.map((app) => (
                <Link
                  key={app.id}
                  href={`/student/applications/${app.id}`}
                  className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-navy-50/50 transition-colors duration-100"
                >
                  <span className="text-body text-ink">
                    {(app.association_profiles as { name: string })?.name ?? "—"}
                  </span>
                  <span className="text-body-sm text-ink-tertiary">{app.status}</span>
                </Link>
              ))}
            </div>
          )}
          <Link
            href="/associations"
            className="mt-4 inline-block text-body-sm text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700"
          >
            Scopri le associazioni →
          </Link>
        </div>

        <div className="rounded-lg border border-border bg-white p-6">
          <h2 className="font-sans text-h3 text-navy">Il tuo profilo</h2>
          <div className="mt-3 space-y-2 text-body-sm">
            <div className="flex justify-between">
              <span className="text-ink-secondary">Corso</span>
              <span className="text-ink">{student?.degree_program ?? "Da completare"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-secondary">Onboarding</span>
              <span className={student?.onboarding_completed ? "text-success" : "text-warning"}>
                {student?.onboarding_completed ? "Completato" : "Da completare"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-secondary">Libretto</span>
              <span className={student?.transcript_uploaded ? "text-success" : "text-ink-tertiary"}>
                {student?.transcript_uploaded ? "Caricato" : "Non caricato"}
              </span>
            </div>
          </div>
          <Link
            href="/student/profile"
            className="mt-4 inline-block text-body-sm text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700"
          >
            Vai al profilo →
          </Link>
        </div>
      </div>
    </div>
  );
}
