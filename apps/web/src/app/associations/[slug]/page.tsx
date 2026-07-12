/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerClient } from "@mira/supabase/server";
import { notFound, redirect } from "next/navigation";
import { PublicHeader } from "@/components/public-header";
import { AssociationPublicProfile } from "@/components/association-public-profile";
import { hasWorkspaceAccess } from "@/lib/association-roles";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function AssociationPublicPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createServerClient();

  const { data: association } = await (supabase.from("association_profiles") as any)
    .select("*")
    .eq("slug", slug)
    .eq("public_page_status", "published")
    .maybeSingle();

  if (!association) notFound();

  // Gli studenti loggati vedono questa pagina dentro la piattaforma (sidebar,
  // navigazione coerente) invece che come pagina pubblica scollegata.
  const { data: { user } } = await supabase.auth.getUser();
  let membership: { role: string; permissions?: unknown } | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (profile) {
      const pid = (profile as Record<string, unknown>).id as string;
      const { data: student } = await (supabase.from("student_profiles") as any)
        .select("id")
        .eq("user_id", pid)
        .maybeSingle();
      if (student) redirect(`/student/associazioni/${slug}`);

      const { data: m } = await (supabase.from("association_memberships") as any)
        .select("role, permissions")
        .eq("association_id", (association as Record<string, unknown>).id)
        .eq("user_id", pid)
        .eq("status", "active")
        .maybeSingle();
      membership = m;
    }
  }

  const { data: openCycles } = await (supabase.from("application_cycles") as any)
    .select("id, title, description, status, opens_at, closes_at, available_roles")
    .eq("association_id", association.id)
    .eq("status", "open")
    .order("closes_at", { ascending: true });

  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader />

      <main className="mx-auto max-w-reading px-6 py-12">
        <AssociationPublicProfile
          association={association}
          openCycles={openCycles ?? []}
          showManage={hasWorkspaceAccess(membership)}
        />
      </main>
    </div>
  );
}
