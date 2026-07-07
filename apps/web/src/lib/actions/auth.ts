"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@mira/supabase/server";

export async function signOut(formData?: FormData) {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  const redirectTo = formData?.get("redirect");
  redirect(typeof redirectTo === "string" && redirectTo.startsWith("/") ? redirectTo : "/login");
}
