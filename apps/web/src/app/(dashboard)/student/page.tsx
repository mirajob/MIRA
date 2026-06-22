import { getUserContext } from "@/lib/auth";
import { createServerClient } from "@mira/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { RoadmapBanner } from "@/components/roadmap-banner";
import { ProfileChat } from "@/components/profile-chat";

export default async function StudentHomePage() {
  const ctx = await getUserContext();
  if (!ctx.isStudent) redirect("/api/auth/redirect");

  const supabase = await createServerClient();
  const { data: student } = await supabase
    .from("student_profiles")
    .select("onboarding_completed, onboarding_answers, profile_summary, degree_program, degree_level, current_year, transcript_uploaded, transcript_summary")
    .eq("user_id", ctx.profile.id)
    .single();

  if (!student?.onboarding_completed) {
    redirect("/student/onboarding");
  }

  const s = student as Record<string, unknown>;
  const answers = s.onboarding_answers as Record<string, unknown> | null;
  const roadmapDismissed = answers?.roadmap_dismissed === true;
  const ts = s.transcript_summary as Record<string, unknown> | null;
  const name = ctx.profile.full_name?.split(" ")[0] ?? "";

  return (
    <div className="mx-auto max-w-2xl px-6 py-6 space-y-5">
      <h1 className="font-display text-h2 text-navy">
        Ciao{name ? `, ${name}` : ""}
      </h1>

      {!roadmapDismissed && <RoadmapBanner />}

      <div className="rounded-lg border border-border bg-white p-5">
        <p className="text-eyebrow text-navy/60 uppercase mb-2">Il tuo profilo MIRA</p>
        {s.profile_summary ? (
          <p className="text-body text-ink whitespace-pre-wrap">
            {s.profile_summary as string}
          </p>
        ) : (
          <p className="text-body text-ink-secondary">
            Il tuo profilo si sta costruendo — continua a parlare con MIRA qui sotto.
          </p>
        )}
        <div className="mt-3 flex items-center gap-4 text-body-sm text-ink-secondary">
          {s.degree_program && <span>{s.degree_program as string}</span>}
          {ts?.weighted_average && <span>Media: {(ts.weighted_average as number).toFixed(1)}/30</span>}
          {s.transcript_uploaded && <span>Libretto caricato</span>}
        </div>
        <Link
          href="/student/profile"
          className="mt-3 inline-block text-body-sm text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700"
        >
          Dettagli accademici →
        </Link>
      </div>

      <div className="rounded-lg border border-border bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-eyebrow text-navy/60 uppercase">Parla con MIRA</p>
        </div>
        <ProfileChat userName={ctx.profile.full_name ?? "Studente"} />
      </div>
    </div>
  );
}
