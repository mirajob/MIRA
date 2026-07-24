"use server";

import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { canManagePage } from "@/lib/public-page-card";
import type { GuideStep } from "@/lib/association-guide";
import { revalidatePath } from "next/cache";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Il percorso guidato dell'associazione (Panoramica). Qui salviamo solo le decisioni
 * esplicite del board — tappe saltate, guida chiusa — mentre il completamento delle tappe
 * e' derivato dai dati reali nella pagina. Vedi lib/association-guide per le tappe.
 */

async function guard(associationId: string) {
  const supabase = await createServiceClient();
  const ctx = await getUserContext();
  const profileId = (ctx.profile as any).id as string;
  if (!(await canManagePage(supabase, associationId, profileId, ctx.isMiraAdmin))) {
    return { supabase, slug: null as string | null, error: "Non hai i permessi" as const };
  }
  const { data } = await (supabase.from("association_profiles") as any)
    .select("slug, onboarding_state")
    .eq("id", associationId)
    .maybeSingle();
  return { supabase, slug: (data?.slug as string) ?? null, state: data?.onboarding_state ?? {}, error: null };
}

function readState(raw: unknown): { skipped: string[]; dismissed: boolean } {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const skipped = Array.isArray(obj.skipped)
    ? (obj.skipped as unknown[]).filter((s): s is string => typeof s === "string")
    : [];
  return { skipped, dismissed: Boolean(obj.dismissed) };
}

export async function skipGuideStep(associationId: string, step: GuideStep) {
  const { supabase, slug, state, error } = await guard(associationId);
  if (error) return { error };

  const current = readState(state);
  if (!current.skipped.includes(step)) current.skipped.push(step);

  await (supabase.from("association_profiles") as any)
    .update({ onboarding_state: current })
    .eq("id", associationId);

  if (slug) revalidatePath(`/association/${slug}`);
  return { success: true };
}

/** Rimette una tappa saltata tra quelle da fare (link "riprendi" nella guida). */
export async function unskipGuideStep(associationId: string, step: GuideStep) {
  const { supabase, slug, state, error } = await guard(associationId);
  if (error) return { error };

  const current = readState(state);
  current.skipped = current.skipped.filter((s) => s !== step);

  await (supabase.from("association_profiles") as any)
    .update({ onboarding_state: current })
    .eq("id", associationId);

  if (slug) revalidatePath(`/association/${slug}`);
  return { success: true };
}

export async function dismissGuide(associationId: string) {
  const { supabase, slug, state, error } = await guard(associationId);
  if (error) return { error };

  const current = readState(state);
  current.dismissed = true;

  await (supabase.from("association_profiles") as any)
    .update({ onboarding_state: current })
    .eq("id", associationId);

  if (slug) revalidatePath(`/association/${slug}`);
  return { success: true };
}

export async function reopenGuide(associationId: string) {
  const { supabase, slug, state, error } = await guard(associationId);
  if (error) return { error };

  const current = readState(state);
  current.dismissed = false;

  await (supabase.from("association_profiles") as any)
    .update({ onboarding_state: current })
    .eq("id", associationId);

  if (slug) revalidatePath(`/association/${slug}`);
  return { success: true };
}
