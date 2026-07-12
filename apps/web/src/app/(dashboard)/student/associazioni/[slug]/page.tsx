/* eslint-disable @typescript-eslint/no-explicit-any */
import { getUserContext } from "@/lib/auth";
import { createServerClient } from "@mira/supabase/server";
import { notFound } from "next/navigation";
import { AssociationPublicProfile } from "@/components/association-public-profile";
import { hasWorkspaceAccess } from "@/lib/association-roles";

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * La vetrina di un'associazione vista da un utente loggato: stesso contenuto della
 * pagina pubblica, ma dentro la piattaforma (sidebar desktop, top bar + tab mobile)
 * invece che come pagina scollegata con header pubblico.
 */
export default async function StudentAssociationPage({ params }: Props) {
  const { slug } = await params;
  const ctx = await getUserContext();
  const supabase = await createServerClient();

  const { data: association } = await (supabase.from("association_profiles") as any)
    .select("*")
    .eq("slug", slug)
    .eq("public_page_status", "published")
    .maybeSingle();

  if (!association) notFound();

  const { data: openCycles } = await (supabase.from("application_cycles") as any)
    .select("id, title, description, status, opens_at, closes_at, available_roles")
    .eq("association_id", association.id)
    .eq("status", "open")
    .order("closes_at", { ascending: true });

  const membership = ctx.memberships.find(
    (m: any) => m.association_id === association.id
  ) as { role: string; permissions?: unknown } | undefined;

  return (
    <div className="mx-auto max-w-reading px-2 py-4 sm:px-6 sm:py-6">
      <AssociationPublicProfile
        association={association}
        openCycles={openCycles ?? []}
        showManage={hasWorkspaceAccess(membership)}
      />
    </div>
  );
}
