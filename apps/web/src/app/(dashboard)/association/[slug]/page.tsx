/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect, notFound } from "next/navigation";
import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { ONBOARDING_STEPS, readOnboardingState } from "@/lib/association-guide";
import { loadTeamData } from "@/lib/association-team";
import { loadPublicPageCard } from "@/lib/actions/public-page-card";
import { loadCycleCard } from "@/lib/actions/cycle-card";
import { AssociationOnboarding } from "./association-onboarding";
import type { OnboardingData } from "./association-onboarding";

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * Landing della dashboard associazione. Per le associazioni beta ancora in onboarding, e' il
 * percorso guidato: MIRA costruisce le sezioni una alla volta, in ordine, inline (come
 * l'onboarding della MiraCard). Finito l'onboarding, o per le altre associazioni, si va
 * dritti ai cicli e la Panoramica non esiste piu'.
 */
export default async function AssociationDashboardPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createServiceClient();

  const { data: association } = await (supabase.from("association_profiles") as any)
    .select("id, name, slug, invite_code, beta_dashboard, onboarding_state")
    .eq("slug", slug)
    .maybeSingle();

  if (!association) notFound();

  const onboarding = readOnboardingState(association.onboarding_state);
  if (!association.beta_dashboard || !onboarding.active) {
    redirect(`/association/${slug}/cycles`);
  }

  const stepName = ONBOARDING_STEPS[onboarding.step];
  const ctx = await getUserContext();
  const currentUserId = (ctx.profile as any).id as string;

  // Carica solo i dati della tappa corrente: ad ogni avanzamento la landing si ricarica.
  const data: OnboardingData = {};

  if (stepName === "public_page") {
    const { state } = await loadPublicPageCard(association.id);
    data.page = state;
  } else if (stepName === "team") {
    const tDegree = await getTranslations("SignupPage");
    const degreeLevelLabel = (level: string | null) =>
      !level ? null : tDegree.has(`degreeLevels.${level}`) ? tDegree(`degreeLevels.${level}`) : level;
    data.team = await loadTeamData(supabase, association.id, currentUserId, degreeLevelLabel);
  } else if (stepName === "cycles") {
    const { data: draft } = await (supabase.from("application_cycles") as any)
      .select("id, build_state")
      .eq("association_id", association.id)
      .eq("status", "draft")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (draft) {
      const { state } = await loadCycleCard(draft.id);
      data.cycle = state;
    }
  }

  return (
    <AssociationOnboarding
      associationId={association.id}
      slug={slug}
      associationName={association.name}
      inviteCode={association.invite_code}
      stepName={stepName}
      stepIndex={onboarding.step}
      totalSteps={ONBOARDING_STEPS.length}
      data={data}
    />
  );
}
