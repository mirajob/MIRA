import { getUserContext } from "@/lib/auth";
import { createServerClient } from "@mira/supabase/server";
import { redirect } from "next/navigation";
import { OnboardingFlow } from "./onboarding-flow";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function OnboardingPage() {
  const ctx = await getUserContext();
  if (!ctx.isStudent) redirect("/api/auth/redirect");

  const supabase = await createServerClient();
  const { data: student } = await supabase
    .from("student_profiles")
    .select("id, onboarding_completed")
    .eq("user_id", ctx.profile.id)
    .single();

  if ((student as any)?.onboarding_completed) {
    // Fase A completa non basta più: reindirizza solo se anche la Fase B lo è.
    // Fase B del rework = competenze, lingue, profilo personale (riga autodescrizione).
    const { data: blocks } = await (supabase.from("card_blocks") as any)
      .select("status")
      .eq("student_profile_id", (student as any).id)
      .in("block_type", ["competenze", "lingue", "autodescrizione"]);

    const faseBComplete = (blocks ?? []).length === 3 && (blocks ?? []).every((b: any) => b.status === "approved");
    if (faseBComplete) redirect("/student");
  }

  return (
    <div className="fixed inset-0 z-50 bg-paper">
      <OnboardingFlow userName={ctx.profile.full_name ?? "Studente"} />
    </div>
  );
}
