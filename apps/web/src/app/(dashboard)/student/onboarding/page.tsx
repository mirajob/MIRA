import { getUserContext } from "@/lib/auth";
import { createServerClient } from "@mira/supabase/server";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "./onboarding-wizard";

export default async function OnboardingPage() {
  const ctx = await getUserContext();
  if (!ctx.isStudent) redirect("/login");

  const supabase = await createServerClient();
  const { data: student } = await supabase
    .from("student_profiles")
    .select("*")
    .eq("user_id", ctx.profile.id)
    .single();

  if (student?.onboarding_completed) {
    redirect("/student");
  }

  return (
    <div className="mx-auto max-w-reading">
      <div className="mb-8">
        <p className="text-eyebrow text-navy/60 uppercase mb-2">Onboarding</p>
        <h1 className="font-display text-display-md text-navy">
          Completa il tuo profilo MIRA
        </h1>
        <p className="mt-2 text-body text-ink-secondary">
          Queste informazioni servono per candidarti alle associazioni e costruire il tuo profilo.
        </p>
      </div>

      <OnboardingWizard
        student={{
          degreeProgram: student?.degree_program ?? "",
          degreeLevel: student?.degree_level ?? "",
          currentYear: student?.current_year ?? null,
          graduationYear: student?.graduation_year ?? null,
          interests: (student?.interests as string[]) ?? [],
          goals: (student?.goals as string[]) ?? [],
          transcriptUploaded: student?.transcript_uploaded ?? false,
          onboardingAnswers: (student?.onboarding_answers as Record<string, string>) ?? {},
        }}
      />
    </div>
  );
}
