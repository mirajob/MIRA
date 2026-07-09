"use server";

import { redirect } from "next/navigation";
import { createServerClient, createServiceClient } from "@mira/supabase/server";

export async function signOut(formData?: FormData) {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  const redirectTo = formData?.get("redirect");
  redirect(typeof redirectTo === "string" && redirectTo.startsWith("/") ? redirectTo : "/login");
}

/**
 * Distinguishes company vs. student accounts so the login page can enforce
 * the "Sono un'azienda" / "Sono uno studente" toggle instead of silently
 * letting either account type in through the wrong mode.
 */
export async function checkAccountType(email: string): Promise<"company" | "student" | "other" | "unknown"> {
  const supabase = await createServiceClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();

  if (!profile) return "unknown";

  const { data: roles } = await supabase
    .from("global_role_assignments")
    .select("role")
    .eq("user_id", (profile as { id: string }).id);

  const roleNames = (roles ?? []).map((r) => (r as { role: string }).role);
  if (roleNames.includes("company_user")) return "company";
  if (roleNames.includes("student")) return "student";
  return "other";
}
