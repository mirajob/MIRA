import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@mira/supabase/server";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const profileId = (profile as Record<string, unknown>).id as string;

  const { data: roles } = await supabase
    .from("global_role_assignments")
    .select("role")
    .eq("user_id", profileId);

  const roleList = (roles ?? []).map((r) => (r as Record<string, unknown>).role as string);

  if (roleList.includes("mira_admin")) {
    return NextResponse.redirect(new URL("/admin", origin));
  }

  if (roleList.includes("student")) {
    return NextResponse.redirect(new URL("/student", origin));
  }

  return NextResponse.redirect(new URL("/student", origin));
}
