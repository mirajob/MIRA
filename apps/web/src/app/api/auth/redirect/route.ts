import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createServiceClient } from "@mira/supabase/server";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const service = await createServiceClient();

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const { data: profile } = await (service.from("profiles") as any)
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const profileId = profile.id as string;

  const { data: roles } = await (service.from("global_role_assignments") as any)
    .select("role")
    .eq("user_id", profileId);

  const roleList = (roles ?? []).map((r: any) => r.role as string);

  if (roleList.includes("mira_admin")) {
    return NextResponse.redirect(new URL("/admin", origin));
  }

  if (roleList.includes("student")) {
    return NextResponse.redirect(new URL("/student", origin));
  }

  // No role assigned — create student profile and role on the fly
  const { data: existingStudent } = await (service.from("student_profiles") as any)
    .select("id")
    .eq("user_id", profileId)
    .maybeSingle();

  if (!existingStudent) {
    await (service.from("student_profiles") as any).insert({
      user_id: profileId,
      university_email: user.email,
      university: "Bocconi University",
    });
  }

  await (service.from("global_role_assignments") as any).insert({
    user_id: profileId,
    role: "student",
  });

  return NextResponse.redirect(new URL("/student", origin));
}
