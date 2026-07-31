/* eslint-disable @typescript-eslint/no-explicit-any */
import { getUserContext } from "@/lib/auth";
import { createServerClient, createServiceClient } from "@mira/supabase/server";
import { notFound } from "next/navigation";
import { AssociationPublicProfile } from "@/components/association-public-profile";
import { AssociationClaimBanner, type ExistingClaimRequest } from "@/components/association-claim-banner";
import { AssociationDraftAdminBar } from "@/components/association-draft-admin-bar";
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

  // Come sulla pagina pubblica: si carica senza filtrare per stato e il filtro si
  // applica dopo, così l'admin rivede la bozza nella resa reale invece che in
  // un'anteprima separata.
  const { data: association } = await (supabase.from("association_profiles") as any)
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!association) notFound();

  const isPublished = association.public_page_status === "published";
  if (!isPublished && !ctx.isMiraAdmin) notFound();

  const { data: openCycles } = await (supabase.from("application_cycles") as any)
    .select("id, title, description, status, opens_at, closes_at, available_roles")
    .eq("association_id", association.id)
    .eq("status", "open")
    .order("closes_at", { ascending: true });

  const membership = ctx.memberships.find(
    (m: any) => m.association_id === association.id
  ) as { role: string; permissions?: unknown } | undefined;

  const isSeeded = association.claim_status === "seeded";
  let existingRequest: ExistingClaimRequest | null = null;
  if (isSeeded) {
    const service = await createServiceClient();
    const { data: request } = await (service.from("association_claim_requests") as any)
      .select("status, rejected_reason")
      .eq("association_id", association.id)
      .eq("user_id", ctx.profile.id)
      .maybeSingle();
    if (request) {
      existingRequest = { status: request.status, rejectedReason: request.rejected_reason };
    }
  }

  return (
    <div className="mx-auto max-w-reading px-2 py-4 sm:px-6 sm:py-6">
      {ctx.isMiraAdmin && isSeeded && (
        <AssociationDraftAdminBar
          associationId={association.id}
          slug={slug}
          published={isPublished}
        />
      )}
      {isSeeded && (
        <AssociationClaimBanner
          associationId={association.id}
          associationName={association.name}
          isLoggedIn
          loginHref={`/login?redirect=/student/associazioni/${slug}`}
          existingRequest={existingRequest}
        />
      )}
      <AssociationPublicProfile
        association={association}
        openCycles={openCycles ?? []}
        showManage={hasWorkspaceAccess(membership)}
        backHref="/student/associazioni"
      />
    </div>
  );
}
