import { getUserContext } from "@/lib/auth";
import { createServerClient } from "@mira/supabase/server";
import { redirect } from "next/navigation";
import { OnboardingChat } from "./onboarding-chat";

export default async function OnboardingPage() {
  const ctx = await getUserContext();
  if (!ctx.isStudent) redirect("/api/auth/redirect");

  const supabase = await createServerClient();
  const { data: student } = await supabase
    .from("student_profiles")
    .select("onboarding_completed")
    .eq("user_id", ctx.profile.id)
    .single();

  if (student?.onboarding_completed) {
    redirect("/student");
  }

  return (
    <div className="fixed inset-0 z-50 bg-paper">
      <OnboardingChat userName={ctx.profile.full_name ?? "Studente"} />
    </div>
  );
}
