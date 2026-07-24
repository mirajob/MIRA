/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect, notFound } from "next/navigation";
import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { GUIDE_STEPS } from "@/lib/association-guide";
import type { GuideStepState } from "@/lib/association-guide";
import { GuidedHome } from "./guided-home";

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * Landing della dashboard associazione. Per le associazioni beta e' la Panoramica: MIRA
 * accoglie e accompagna tappa per tappa (pagina pubblica -> collaboratori -> membri ->
 * candidature). Il completamento di ogni tappa e' derivato dai dati reali, non salvato.
 * Le altre associazioni vanno dritte ai cicli, come prima.
 */
export default async function AssociationDashboardPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createServiceClient();

  const { data: association } = await (supabase.from("association_profiles") as any)
    .select("id, name, slug, public_page_status, beta_dashboard, onboarding_state")
    .eq("slug", slug)
    .maybeSingle();

  if (!association) notFound();
  if (!association.beta_dashboard) redirect(`/association/${slug}/cycles`);

  const ctx = await getUserContext();
  const currentUserId = (ctx.profile as any).id as string;

  const [{ data: memberships }, { count: cycleCount }] = await Promise.all([
    (supabase.from("association_memberships") as any)
      .select("user_id, role")
      .eq("association_id", association.id)
      .eq("status", "active"),
    (supabase.from("application_cycles") as any)
      .select("id", { count: "exact", head: true })
      .eq("association_id", association.id),
  ]);

  const active = (memberships ?? []) as Array<{ user_id: string; role: string }>;
  const otherAdmins = active.filter(
    (m) =>
      m.user_id !== currentUserId &&
      (m.role === "association_admin" || m.role === "association_president")
  ).length;
  const members = active.filter((m) => m.role === "association_member").length;

  const skipped: string[] = Array.isArray(association.onboarding_state?.skipped)
    ? association.onboarding_state.skipped
    : [];
  const dismissed = Boolean(association.onboarding_state?.dismissed);

  const doneByStep: Record<(typeof GUIDE_STEPS)[number], boolean> = {
    public_page: association.public_page_status === "published",
    collaborators: otherAdmins > 0,
    members: members > 0,
    cycles: (cycleCount ?? 0) > 0,
  };

  const hrefByStep: Record<(typeof GUIDE_STEPS)[number], string> = {
    public_page: `/association/${slug}/public-page`,
    collaborators: `/association/${slug}/board`,
    members: `/association/${slug}/board`,
    cycles: `/association/${slug}/cycles/new`,
  };

  const steps: GuideStepState[] = GUIDE_STEPS.map((step) => ({
    step,
    done: doneByStep[step],
    skipped: skipped.includes(step),
    href: hrefByStep[step],
  }));

  return (
    <GuidedHome
      associationId={association.id}
      associationName={association.name}
      steps={steps}
      dismissed={dismissed}
    />
  );
}
