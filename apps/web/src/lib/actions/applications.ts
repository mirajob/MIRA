"use server";

import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { evaluateCandidate } from "./candidates";

export async function submitApplication(cycleId: string, formData: FormData) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  const { data: student } = await supabase
    .from("student_profiles")
    .select("id, onboarding_completed")
    .eq("user_id", ctx.profile.id)
    .single();

  if (!student) return { error: "Profilo studente non trovato" };
  if (!student.onboarding_completed) return { error: "Completa l'onboarding prima di candidarti" };

  const { data: cycle } = await supabase
    .from("application_cycles")
    .select("id, association_id, status")
    .eq("id", cycleId)
    .single();

  if (!cycle) return { error: "Ciclo non trovato" };
  if (cycle.status !== "open") return { error: "Le candidature per questo ciclo sono chiuse" };

  const { data: existing } = await supabase
    .from("applications")
    .select("id")
    .eq("application_cycle_id", cycleId)
    .eq("student_user_id", ctx.profile.id)
    .maybeSingle();

  if (existing) return { error: "Hai già inviato una candidatura per questo ciclo" };

  const { data: application, error: appError } = await supabase
    .from("applications")
    .insert({
      application_cycle_id: cycleId,
      association_id: cycle.association_id,
      student_user_id: ctx.profile.id,
      student_profile_id: student.id,
      status: "submitted",
      submitted_at: new Date().toISOString(),
      last_status_change_at: new Date().toISOString(),
      privacy_consent: { accepted: true, timestamp: new Date().toISOString() },
    })
    .select()
    .single();

  if (appError) return { error: appError.message };

  const { data: questions } = await supabase
    .from("application_questions")
    .select("id")
    .eq("application_cycle_id", cycleId)
    .order("order_index");

  if (questions) {
    for (const q of questions) {
      const answerText = formData.get(`answer_${q.id}`) as string;
      if (answerText) {
        await supabase.from("application_answers").insert({
          application_id: application.id,
          question_id: q.id,
          answer_text: answerText,
        });
      }
    }
  }

  await supabase.from("application_status_events").insert({
    application_id: application.id,
    new_status: "submitted",
    changed_by_user_id: ctx.profile.id,
    visible_to_candidate: true,
  });

  // Trigger AI evaluation in background (don't await — let it run async)
  evaluateCandidate(application.id).catch((err) =>
    console.error("Background AI evaluation failed:", err)
  );

  revalidatePath("/student");
  return { success: true, applicationId: application.id };
}
