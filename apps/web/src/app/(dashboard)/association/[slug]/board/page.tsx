/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { InviteCodeSection } from "./invite-code-section";
import { PendingBoardRequests } from "./pending-board-requests";
import { MembershipToggle } from "./membership-toggle";
import { MembersList } from "./members-list";
import { TeamPanel } from "./team-panel";
import { loadTeamData } from "@/lib/association-team";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function MembersPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createServiceClient();
  const ctx = await getUserContext();
  const currentUserId = (ctx.profile as any).id as string;
  const t = await getTranslations("Board");
  const tDegree = await getTranslations("SignupPage");

  const { data: association } = await (supabase.from("association_profiles") as any)
    .select("id, name, slug, invite_code, membership_enabled, beta_dashboard")
    .eq("slug", slug)
    .maybeSingle();

  if (!association) notFound();

  const membershipEnabled = Boolean(association.membership_enabled);
  const isBeta = Boolean(association.beta_dashboard);

  const degreeLevelLabel = (level: string | null) =>
    !level ? null : tDegree.has(`degreeLevels.${level}`) ? tDegree(`degreeLevels.${level}`) : level;

  const { people, sections, pendingRequests } = await loadTeamData(
    supabase,
    association.id,
    currentUserId,
    degreeLevelLabel
  );

  // Dashboard beta: MIRA spiega in cima e i membri sono card, raggruppati per sezione.
  // Niente toggle: la gestione membri e' sempre attiva per le associazioni beta.
  if (isBeta) {
    return (
      <TeamPanel
        associationId={association.id}
        slug={slug}
        currentCode={association.invite_code}
        people={people}
        sections={sections}
        pendingRequests={pendingRequests}
      />
    );
  }

  return (
    // Nessun titolo "Membri": lo dice gia' la voce di menu attiva qui sopra.
    <div className="space-y-4">
      <InviteCodeSection
        associationId={association.id}
        currentCode={association.invite_code}
        membershipEnabled={membershipEnabled}
      />

      <MembershipToggle associationId={association.id} enabled={membershipEnabled} />

      {pendingRequests.length > 0 && (
        <PendingBoardRequests associationId={association.id} requests={pendingRequests} />
      )}

      <MembersList
        associationId={association.id}
        slug={slug}
        sections={sections}
        people={people}
        membershipEnabled={membershipEnabled}
      />
    </div>
  );
}
