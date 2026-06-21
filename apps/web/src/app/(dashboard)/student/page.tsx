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
    .select("onboarding_completed, profile_summary")
    .eq("user_id", ctx.profile.id)
    .single();

  const needsOnboarding = !student?.onboarding_completed;

  if (needsOnboarding) {
    redirect("/student/onboarding");
  }

  const { data: applications } = await supabase
    .from("applications")
    .select("id, status, submitted_at, association_profiles(name, slug)")
    .eq("student_user_id", ctx.profile.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const name = ctx.profile.full_name?.split(" ")[0] ?? "";

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display text-h1 text-navy">
          Ciao{name ? `, ${name}` : ""}
        </h1>
      </div>

      {(student as Record<string, unknown>)?.profile_summary && (
        <div className="rounded-lg border border-border bg-white p-6">
          <p className="text-body text-ink whitespace-pre-wrap">
            {(student as Record<string, unknown>).profile_summary as string}
          </p>
          <Link
            href="/student/profile"
            className="mt-3 inline-block text-body-sm text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700"
          >
            Vedi profilo completo →
          </Link>
        </div>
      )}

      <div className="rounded-lg border border-border bg-white p-6">
        <h2 className="font-sans text-h3 text-navy mb-3">Le tue candidature</h2>
        {!applications?.length ? (
          <p className="text-body text-ink-secondary">
            Non hai ancora candidature attive.
          </p>
        ) : (
          <div className="space-y-2">
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
    </div>
  );
}
