"use server";

import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function saveOnboardingStep(formData: FormData) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  const step = formData.get("step") as string;

  const updates: Record<string, unknown> = {};

  if (step === "basics") {
    updates.degree_program = formData.get("degreeProgram") as string;
    updates.degree_level = formData.get("degreeLevel") as string;
    updates.current_year = parseInt(formData.get("currentYear") as string) || null;
    updates.graduation_year = parseInt(formData.get("graduationYear") as string) || null;
  }

  if (step === "profile") {
    const interests = (formData.get("interests") as string)?.split(",").map(s => s.trim()).filter(Boolean) ?? [];
    const goals = (formData.get("goals") as string)?.split(",").map(s => s.trim()).filter(Boolean) ?? [];

    updates.interests = interests;
    updates.goals = goals;
    updates.onboarding_answers = {
      ...(updates.onboarding_answers as Record<string, unknown> ?? {}),
      previous_experiences: formData.get("previousExperiences") as string,
      association_motivation: formData.get("associationMotivation") as string,
      working_style: formData.get("workingStyle") as string,
      availability: formData.get("availability") as string,
      languages: formData.get("languages") as string,
      skills: formData.get("skills") as string,
    };
  }

  const { error } = await supabase
    .from("student_profiles")
    .update(updates)
    .eq("user_id", ctx.profile.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/student/onboarding");
  return { success: true };
}

export async function completeOnboarding() {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  const { data: student } = await supabase
    .from("student_profiles")
    .select("degree_program, transcript_uploaded")
    .eq("user_id", ctx.profile.id)
    .single();

  if (!student?.degree_program) {
    return { error: "Completa i dati accademici prima di continuare" };
  }

  await supabase
    .from("student_profiles")
    .update({
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq("user_id", ctx.profile.id);

  await supabase
    .from("profiles")
    .update({ onboarding_started_at: new Date().toISOString() })
    .eq("id", ctx.profile.id);

  revalidatePath("/student");
  revalidatePath("/student/onboarding");
  return { success: true };
}

export async function uploadTranscript(formData: FormData) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  const file = formData.get("file") as File;
  if (!file || file.size === 0) {
    return { error: "Seleziona un file" };
  }

  if (file.size > 10 * 1024 * 1024) {
    return { error: "Il file non può superare i 10MB" };
  }

  const allowedTypes = ["application/pdf", "image/png", "image/jpeg"];
  if (!allowedTypes.includes(file.type)) {
    return { error: "Formato non supportato. Carica un PDF o un'immagine." };
  }

  const ext = file.name.split(".").pop();
  const path = `${ctx.profile.id}/transcript_${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("student-transcripts")
    .upload(path, file, { upsert: true });

  if (uploadError) {
    return { error: `Errore nel caricamento: ${uploadError.message}` };
  }

  await supabase.from("uploaded_files").insert({
    owner_user_id: ctx.profile.id,
    bucket: "student-transcripts",
    file_path: path,
    file_type: file.type,
    file_name: file.name,
    file_size: file.size,
    visibility_scope: "private_to_student",
    linked_entity_type: "student_profile",
  });

  const { data: studentProfile } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("user_id", ctx.profile.id)
    .single();

  if (studentProfile) {
    await supabase.from("student_transcripts").insert({
      student_profile_id: studentProfile.id,
      extraction_status: "pending",
    });

    await supabase
      .from("student_profiles")
      .update({ transcript_uploaded: true })
      .eq("user_id", ctx.profile.id);
  }

  revalidatePath("/student/onboarding");
  revalidatePath("/student/transcript");
  return { success: true };
}
