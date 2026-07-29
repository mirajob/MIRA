"use server";

import { createServerClient, createServiceClient } from "@mira/supabase/server";
import { ensureStudentProfile } from "@/lib/student-provisioning";
import { ensureCardBlocksExist } from "./card-blocks";
import { revalidatePath } from "next/cache";

/* eslint-disable @typescript-eslint/no-explicit-any */

const DEGREE_LEVELS = ["triennale", "magistrale", "ciclo_unico"] as const;

/**
 * I due campi che l'accesso con Google non può darci. Google restituisce solo nome,
 * email e foto: l'università va chiesta, e non è un dettaglio — le associazioni sono
 * scopate per ateneo, quindi senza questo dato lo studente non vedrebbe nulla a cui
 * candidarsi. Il livello serve all'Header della card.
 *
 * Scrive anche su card_blocks.header, così il blocco arriva già precompilato e allo
 * studente restano solo corso e anni.
 */
export async function completeStudentProfile(input: {
  university: string;
  degreeLevel: string;
}): Promise<{ error: string | null }> {
  const university = input.university.trim();
  if (!university) return { error: "missing_university" };
  if (!DEGREE_LEVELS.includes(input.degreeLevel as (typeof DEGREE_LEVELS)[number])) {
    return { error: "missing_degree_level" };
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" };

  const service = await createServiceClient();

  const { data: profile } = await (service.from("profiles") as any)
    .select("id")
    .eq("auth_user_id", user.id)
    .single();
  if (!profile) return { error: "not_authenticated" };

  const profileId = profile.id as string;

  // Chi arriva da Google può non avere ancora né student_profiles né il ruolo.
  await ensureStudentProfile(service, profileId, user.email, {
    university,
    degreeLevel: input.degreeLevel,
  });

  const { data: student, error: updateError } = await (service.from("student_profiles") as any)
    .update({ university, degree_level: input.degreeLevel })
    .eq("user_id", profileId)
    .select("id")
    .single();

  if (updateError || !student) {
    console.error("[MIRA] completeStudentProfile update failed:", updateError);
    return { error: "update_failed" };
  }

  // Prefill dell'Header: quello che sappiamo lo scriviamo noi, non lo richiediamo.
  // Le righe possono non esistere ancora (di norma le crea l'onboarding al primo load):
  // senza questa chiamata il prefill sarebbe un no-op e lo studente ridigiterebbe l'ateneo.
  await ensureCardBlocksExist(student.id as string);

  const { data: headerRow } = await (service.from("card_blocks") as any)
    .select("prose_content, status")
    .eq("student_profile_id", student.id)
    .eq("block_type", "header")
    .maybeSingle();

  if (headerRow && headerRow.status !== "approved") {
    const existing = (headerRow.prose_content ?? {}) as Record<string, unknown>;
    await (service.from("card_blocks") as any)
      .update({
        prose_content: { ...existing, universita: university, livello: input.degreeLevel },
      })
      .eq("student_profile_id", student.id)
      .eq("block_type", "header");
  }

  revalidatePath("/student");
  return { error: null };
}
