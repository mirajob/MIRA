"use server";

import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { canManagePage } from "@/lib/public-page-card";
import { ONBOARDING_STEPS, readOnboardingState } from "@/lib/association-guide";
import { revalidatePath } from "next/cache";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Avanzamento dell'onboarding guidato dell'associazione. Il completamento delle singole
 * sezioni resta derivato dai dati reali; qui teniamo solo a che punto del percorso e' il
 * board (passo corrente) e se lo ha concluso.
 */

async function guard(associationId: string) {
  const supabase = await createServiceClient();
  const ctx = await getUserContext();
  const profileId = (ctx.profile as any).id as string;
  if (!(await canManagePage(supabase, associationId, profileId, ctx.isMiraAdmin))) {
    return { supabase, slug: null as string | null, state: {}, error: "Non hai i permessi" as const };
  }
  const { data } = await (supabase.from("association_profiles") as any)
    .select("slug, onboarding_state")
    .eq("id", associationId)
    .maybeSingle();
  return { supabase, slug: (data?.slug as string) ?? null, state: data?.onboarding_state ?? {}, error: null };
}

async function write(associationId: string, step: number, completed: boolean) {
  const { supabase, slug, error } = await guard(associationId);
  if (error) return { error };
  await (supabase.from("association_profiles") as any)
    .update({ onboarding_state: { step, completed } })
    .eq("id", associationId);
  if (slug) {
    revalidatePath(`/association/${slug}`);
    revalidatePath(`/association/${slug}/board`);
  }
  return { success: true };
}

/** Passa alla tappa successiva; oltre l'ultima, conclude l'onboarding. */
export async function advanceOnboarding(associationId: string) {
  const { state, error } = await guard(associationId);
  if (error) return { error };
  const current = readOnboardingState(state);
  const nextStep = current.step + 1;
  const completed = nextStep >= ONBOARDING_STEPS.length;
  return write(associationId, Math.min(nextStep, ONBOARDING_STEPS.length), completed);
}

/** Torna alla tappa precedente (link "indietro" nel percorso). */
export async function goBackOnboarding(associationId: string) {
  const { state, error } = await guard(associationId);
  if (error) return { error };
  const current = readOnboardingState(state);
  return write(associationId, Math.max(0, current.step - 1), false);
}

/** Conclude subito l'onboarding: da qui il board vede le sezioni normali. */
export async function finishOnboarding(associationId: string) {
  const { state, error } = await guard(associationId);
  if (error) return { error };
  const current = readOnboardingState(state);
  return write(associationId, current.step, true);
}
