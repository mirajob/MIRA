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
    // Chi non ha ancora completato l'onboarding va dritto all'inizio della card,
    // non alla home dashboard: è il punto in cui la gente si perde e non completa.
    const { data: studentProfile } = await (service.from("student_profiles") as any)
      .select("onboarding_completed, university")
      .eq("user_id", profileId)
      .maybeSingle();

    // L'accesso con Google non porta l'università (Google dà solo nome, email e foto)
    // e senza ateneo lo studente non vede associazioni a cui candidarsi, perché sono
    // scopate per università. Glielo chiediamo prima della card — solo a chi non l'ha
    // ancora finita, così nessun utente già a posto viene rimbalzato.
    if (!studentProfile?.onboarding_completed && !hasUniversity(studentProfile?.university)) {
      return NextResponse.redirect(new URL("/completa-profilo", origin));
    }

    const dest = studentProfile?.onboarding_completed ? "/student" : "/student/onboarding";
    return NextResponse.redirect(new URL(dest, origin));
  }

  // Nessun ruolo: profilo studente creato al volo. Il trigger DB provisiona solo i
  // domini universitari, quindi da qui passa chi si è registrato con Gmail o simili —
  // i dati che ha già dato al form di registrazione stanno nei metadata auth, e li
  // riusiamo invece di richiederglieli.
  const metadata = (user.user_metadata ?? {}) as { university?: string; degree_level?: string };
  await ensureStudentProfile(service, profileId, user.email, {
    university: metadata.university,
    degreeLevel: metadata.degree_level,
  });

  const dest = hasUniversity(metadata.university) ? "/student/onboarding" : "/completa-profilo";
  return NextResponse.redirect(new URL(dest, origin));
}

/** "Non specificata" è il fallback di ensureStudentProfile quando il dominio email non
 * dice nulla: vale come università mancante, non come scelta dello studente. */
function hasUniversity(university: string | null | undefined): boolean {
  const value = (university ?? "").trim();
  return value.length > 0 && value.toLowerCase() !== "non specificata";
}
