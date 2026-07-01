"use server";

import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function updatePrivacySettings(settings: {
  show_grades_to_associations: boolean;
  show_grades_to_companies: boolean;
}) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  await supabase
    .from("student_profiles")
    .update({ privacy_settings: settings })
    .eq("user_id", ctx.profile.id);

  revalidatePath("/student/profile");
  return { success: true };
}
