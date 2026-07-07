import { createServiceClient } from "@mira/supabase/server";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Every MIRA user is a student at heart — association board members and
 * presidents get a workspace on top of, not instead of, their MiraCard.
 * Call this whenever a profile gains an association role so the student
 * side exists immediately, rather than relying on the /api/auth/redirect
 * fallback to create it lazily on a later login.
 */
export async function ensureStudentProfile(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  profileId: string,
  email: string | null | undefined
) {
  const { data: existing } = await (supabase.from("student_profiles") as any)
    .select("id")
    .eq("user_id", profileId)
    .maybeSingle();

  if (!existing) {
    await (supabase.from("student_profiles") as any).insert({
      user_id: profileId,
      university_email: email,
      university: "Bocconi University",
    });
  }

  const { data: existingRole } = await (supabase.from("global_role_assignments") as any)
    .select("id")
    .eq("user_id", profileId)
    .eq("role", "student")
    .maybeSingle();

  if (!existingRole) {
    await (supabase.from("global_role_assignments") as any).insert({
      user_id: profileId,
      role: "student",
    });
  }
}
