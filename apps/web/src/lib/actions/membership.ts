"use server";

import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { canManageMembers } from "@/lib/association-access";
import { revalidatePath } from "next/cache";

/* eslint-disable @typescript-eslint/no-explicit-any */

const MAX_SECTIONS = 30;

async function guard(associationId: string) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();
  const profileId = (ctx.profile as any).id as string;

  if (!(await canManageMembers(supabase, associationId, profileId, ctx.isMiraAdmin))) {
    return { supabase, profileId, error: "Non hai i permessi" as const };
  }
  return { supabase, profileId, error: null };
}

async function revalidateBoard(supabase: any, associationId: string) {
  const { data } = await (supabase.from("association_profiles") as any)
    .select("slug")
    .eq("id", associationId)
    .maybeSingle();
  if (data?.slug) revalidatePath(`/association/${data.slug}/board`);
}

/**
 * Accende/spegne la gestione membership per l'associazione. E' opt-in: a toggle spento
 * la dashboard resta esattamente com'era prima di questa feature.
 */
export async function setMembershipEnabled(associationId: string, enabled: boolean) {
  const { supabase, error } = await guard(associationId);
  if (error) return { error };

  await (supabase.from("association_profiles") as any)
    .update({ membership_enabled: enabled })
    .eq("id", associationId);

  await revalidateBoard(supabase, associationId);
  return { success: true };
}

export async function createSection(associationId: string, name: string) {
  const { supabase, error } = await guard(associationId);
  if (error) return { error };

  const clean = name.trim();
  if (!clean) return { error: "Il nome della sezione è obbligatorio" };
  if (clean.length > 60) return { error: "Nome troppo lungo (max 60 caratteri)" };

  const { count } = await (supabase.from("association_sections") as any)
    .select("id", { count: "exact", head: true })
    .eq("association_id", associationId);

  if ((count ?? 0) >= MAX_SECTIONS) {
    return { error: `Puoi creare al massimo ${MAX_SECTIONS} sezioni` };
  }

  // Nuova sezione in fondo: position = max attuale + 1.
  const { data: last } = await (supabase.from("association_sections") as any)
    .select("position")
    .eq("association_id", associationId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error: insertErr } = await (supabase.from("association_sections") as any).insert({
    association_id: associationId,
    name: clean,
    position: (last?.position ?? -1) + 1,
  });

  // unique(association_id, name) a livello DB: intercetta il duplicato invece di
  // mostrare l'errore Postgres grezzo.
  if (insertErr) {
    return {
      error: insertErr.code === "23505"
        ? "Esiste già una sezione con questo nome"
        : "Errore nella creazione della sezione",
    };
  }

  await revalidateBoard(supabase, associationId);
  return { success: true };
}

export async function renameSection(associationId: string, sectionId: string, name: string) {
  const { supabase, error } = await guard(associationId);
  if (error) return { error };

  const clean = name.trim();
  if (!clean) return { error: "Il nome della sezione è obbligatorio" };
  if (clean.length > 60) return { error: "Nome troppo lungo (max 60 caratteri)" };

  const { error: updateErr } = await (supabase.from("association_sections") as any)
    .update({ name: clean })
    .eq("id", sectionId)
    .eq("association_id", associationId);

  if (updateErr) {
    return {
      error: updateErr.code === "23505"
        ? "Esiste già una sezione con questo nome"
        : "Errore nella rinomina",
    };
  }

  await revalidateBoard(supabase, associationId);
  return { success: true };
}

/**
 * Elimina una sezione. I membri NON vengono eliminati: section_id ha
 * "on delete set null", quindi tornano semplicemente in "Senza sezione".
 */
export async function deleteSection(associationId: string, sectionId: string) {
  const { supabase, error } = await guard(associationId);
  if (error) return { error };

  await (supabase.from("association_sections") as any)
    .delete()
    .eq("id", sectionId)
    .eq("association_id", associationId);

  await revalidateBoard(supabase, associationId);
  return { success: true };
}

/** Sposta una sezione su/giu' scambiando la position con quella adiacente. */
export async function moveSection(associationId: string, sectionId: string, direction: "up" | "down") {
  const { supabase, error } = await guard(associationId);
  if (error) return { error };

  const { data: sections } = await (supabase.from("association_sections") as any)
    .select("id, position")
    .eq("association_id", associationId)
    .order("position");

  const list = (sections ?? []) as { id: string; position: number }[];
  const index = list.findIndex((s) => s.id === sectionId);
  if (index === -1) return { error: "Sezione non trovata" };

  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= list.length) return { success: true };

  const current = list[index]!;
  const other = list[swapWith]!;

  // Le position possono essere duplicate o con buchi (dati vecchi): non scambio i
  // valori esistenti, riassegno l'indice della lista ordinata. Cosi' resta coerente
  // qualunque cosa ci fosse prima.
  const reordered = [...list];
  reordered[index] = other;
  reordered[swapWith] = current;

  for (let i = 0; i < reordered.length; i++) {
    await (supabase.from("association_sections") as any)
      .update({ position: i })
      .eq("id", reordered[i]!.id);
  }

  await revalidateBoard(supabase, associationId);
  return { success: true };
}

/** Assegna un membro a una sezione, o lo toglie da ogni sezione (sectionId null). */
export async function assignMemberToSection(
  associationId: string,
  membershipId: string,
  sectionId: string | null
) {
  const { supabase, error } = await guard(associationId);
  if (error) return { error };

  // La sezione deve appartenere a QUESTA associazione: senza il controllo si potrebbe
  // spostare un membro in una sezione di un'altra associazione passando un id arbitrario.
  if (sectionId) {
    const { data: section } = await (supabase.from("association_sections") as any)
      .select("id")
      .eq("id", sectionId)
      .eq("association_id", associationId)
      .maybeSingle();
    if (!section) return { error: "Sezione non valida" };
  }

  await (supabase.from("association_memberships") as any)
    .update({ section_id: sectionId })
    .eq("id", membershipId)
    .eq("association_id", associationId);

  await revalidateBoard(supabase, associationId);
  return { success: true };
}
