/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerClient } from "@mira/supabase/server";
import { notFound, redirect } from "next/navigation";
import { PublicHeader } from "@/components/public-header";
import { AssociationPublicProfile } from "@/components/association-public-profile";
import { AssociationSeededNotice } from "@/components/association-seeded-notice";
import { AssociationDraftAdminBar } from "@/components/association-draft-admin-bar";
import { hasWorkspaceAccess } from "@/lib/association-roles";
import { SEEDED_CONTACT_EMAIL } from "@/lib/seeded-associations";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function AssociationPublicPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createServerClient();

  // La pagina si carica senza filtrare per stato: il filtro lo applichiamo dopo aver
  // capito chi guarda, perché l'admin MIRA deve poter rivedere una pagina in bozza
  // esattamente com'è, senza un'anteprima parallela che potrebbe divergere.
  const { data: association } = await (supabase.from("association_profiles") as any)
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!association) notFound();

  // Gli studenti loggati vedono questa pagina dentro la piattaforma (sidebar,
  // navigazione coerente) invece che come pagina pubblica scollegata.
  const { data: { user } } = await supabase.auth.getUser();
  let membership: { role: string; permissions?: unknown } | null = null;
  let isMiraAdmin = false;
  let isStudent = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (profile) {
      const pid = (profile as Record<string, unknown>).id as string;

      const { data: roles } = await supabase
        .from("global_role_assignments")
        .select("role")
        .eq("user_id", pid);
      isMiraAdmin = (roles ?? []).some((r) => (r as Record<string, string>).role === "mira_admin");

      const { data: student } = await (supabase.from("student_profiles") as any)
        .select("id")
        .eq("user_id", pid)
        .maybeSingle();
      isStudent = Boolean(student);

      const { data: m } = await (supabase.from("association_memberships") as any)
        .select("role, permissions")
        .eq("association_id", (association as Record<string, unknown>).id)
        .eq("status", "active")
        .eq("user_id", pid)
        .maybeSingle();
      membership = m;
    }
  }

  // Una pagina in bozza non esiste per nessuno tranne l'admin MIRA. Il controllo
  // precede il redirect verso la vista studente perché un non-admin deve vedere un
  // 404 pulito su questo URL, non un rimbalzo su una pagina che poi fa 404 a sua volta.
  const isPublished = association.public_page_status === "published";
  if (!isPublished && !isMiraAdmin) notFound();

  if (isStudent) redirect(`/student/associazioni/${slug}`);

  const { data: openCycles } = await (supabase.from("application_cycles") as any)
    .select("id, title, description, status, opens_at, closes_at, available_roles")
    .eq("association_id", association.id)
    .eq("status", "open")
    .order("closes_at", { ascending: true });

  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader />

      <main className="mx-auto max-w-reading px-6 py-12">
        {isMiraAdmin && association.claim_status === "seeded" && (
          <AssociationDraftAdminBar
            associationId={association.id}
            slug={slug}
            published={isPublished}
          />
        )}
        {association.claim_status === "seeded" && (
          <AssociationSeededNotice contactEmail={SEEDED_CONTACT_EMAIL} />
        )}
        <AssociationPublicProfile
          association={association}
          openCycles={openCycles ?? []}
          showManage={hasWorkspaceAccess(membership)}
        />
      </main>
    </div>
  );
}
