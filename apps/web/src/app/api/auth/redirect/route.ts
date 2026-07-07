import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createServiceClient } from "@mira/supabase/server";
import { ensureStudentProfile } from "@/lib/student-provisioning";

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

  if (roleList.includes("company_user")) {
    const { data: membership } = await (service.from("company_memberships") as any)
      .select("company_id, company_profiles(slug, verification_status)")
      .eq("user_id", profileId)
      .eq("status", "active")
      .maybeSingle();
    const company = (membership as any)?.company_profiles;
    if (company?.verification_status === "verified") {
      return NextResponse.redirect(new URL(`/company/${company.slug}`, origin));
    }
    return NextResponse.redirect(new URL("/aziende/pending", origin));
  }

  if (roleList.includes("student")) {
    return NextResponse.redirect(new URL("/student", origin));
  }

  // No role assigned — create student profile and role on the fly
  await ensureStudentProfile(service, profileId, user.email);

  return NextResponse.redirect(new URL("/student", origin));
}
