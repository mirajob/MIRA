import { NextResponse } from "next/server";
import { createServerClient } from "@mira/supabase/server";

export async function GET() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  }

  const profileId = (profile as Record<string, unknown>).id as string;

  const { data: roles } = await supabase
    .from("global_role_assignments")
    .select("role")
    .eq("user_id", profileId);

  const roleList = (roles ?? []).map((r) => (r as Record<string, unknown>).role as string);

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (roleList.includes("mira_admin")) {
    return NextResponse.redirect(new URL("/admin", base));
  }

  if (roleList.includes("student")) {
    return NextResponse.redirect(new URL("/student", base));
  }

  // Fallback: no role assigned yet
  return NextResponse.redirect(new URL("/student", base));
}
