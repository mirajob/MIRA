import { redirect } from "next/navigation";
import { createServerClient } from "@mira/supabase/server";

export async function getUser() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function requireAuth() {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function getProfile() {
  const user = await requireAuth();
  const supabase = await createServerClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  return profile;
}

export async function getGlobalRoles() {
  const user = await requireAuth();
  const supabase = await createServerClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile) return [];

  const { data: roles } = await supabase
    .from("global_role_assignments")
    .select("role")
    .eq("user_id", profile.id);

  return (roles ?? []).map((r) => r.role);
}

export async function getAssociationMemberships() {
  const user = await requireAuth();
  const supabase = await createServerClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile) return [];

  const { data: memberships } = await supabase
    .from("association_memberships")
    .select("*, association_profiles(id, name, slug, logo_url)")
    .eq("user_id", profile.id)
    .eq("status", "active");

  return memberships ?? [];
}

export async function getUserContext() {
  const user = await requireAuth();
  const supabase = await createServerClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile) redirect("/login");

  const { data: roles } = await supabase
    .from("global_role_assignments")
    .select("role")
    .eq("user_id", profile.id);

  const { data: memberships } = await supabase
    .from("association_memberships")
    .select("*, association_profiles(id, name, slug, logo_url)")
    .eq("user_id", profile.id)
    .eq("status", "active");

  return {
    user,
    profile,
    globalRoles: (roles ?? []).map((r) => r.role),
    memberships: memberships ?? [],
    isMiraAdmin: (roles ?? []).some((r) => r.role === "mira_admin"),
    isStudent: (roles ?? []).some((r) => r.role === "student"),
  };
}
