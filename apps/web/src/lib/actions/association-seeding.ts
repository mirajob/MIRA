"use server";

import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Pagine associazione seminate da MIRA: azioni riservate all'admin.
 *
 * Il ciclo di vita è draft → published, e la pubblicazione è sempre una decisione
 * umana: le pagine nascono da fonti pubbliche e nessuno le vede finché l'admin non
 * le ha lette una per una. Vedi la migrazione 20260731000001_association_seeding.
 */

async function requireAdmin() {
  const ctx = await getUserContext();
  if (!ctx.isMiraAdmin) return null;
  return ctx;
}

function revalidateSeeded(slug?: string) {
  revalidatePath("/admin/associations");
  revalidatePath("/admin/associations/seminate");
  revalidatePath("/associations");
  if (slug) {
    revalidatePath(`/associations/${slug}`);
    revalidatePath(`/student/associazioni/${slug}`);
  }
}

/** Rende la pagina visibile agli studenti dell'ateneo dell'associazione. */
export async function publishSeededAssociation(associationId: string) {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Non autorizzato." };

  const supabase = await createServiceClient();

  const { data: association } = await (supabase.from("association_profiles") as any)
    .select("slug, name, university")
    .eq("id", associationId)
    .maybeSingle();

  if (!association) return { error: "Associazione non trovata." };

  // Senza università la pagina non comparirebbe a nessuno studente: la lista
  // studente filtra per ateneo, quindi pubblicarla sarebbe un falso positivo.
  if (!association.university) {
    return { error: `${association.name}: manca l'università, la pagina non sarebbe visibile a nessuno.` };
  }

  const { error } = await (supabase.from("association_profiles") as any)
    .update({ public_page_status: "published" })
    .eq("id", associationId);

  if (error) return { error: error.message };

  revalidateSeeded(association.slug);
  return { success: true };
}

/** Riporta la pagina in bozza: torna visibile solo all'admin. */
export async function unpublishSeededAssociation(associationId: string) {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Non autorizzato." };

  const supabase = await createServiceClient();

  const { data: association } = await (supabase.from("association_profiles") as any)
    .select("slug")
    .eq("id", associationId)
    .maybeSingle();

  const { error } = await (supabase.from("association_profiles") as any)
    .update({ public_page_status: "draft" })
    .eq("id", associationId);

  if (error) return { error: error.message };

  revalidateSeeded(association?.slug);
  return { success: true };
}

/** Pubblica in blocco: usato dopo aver riletto un lotto intero. */
export async function publishSeededAssociations(associationIds: string[]) {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Non autorizzato." };
  if (!associationIds.length) return { error: "Nessuna associazione selezionata." };

  const supabase = await createServiceClient();

  const { data: rows } = await (supabase.from("association_profiles") as any)
    .select("id, name, university")
    .in("id", associationIds);

  const missingUniversity = (rows ?? []).filter((r: any) => !r.university);
  if (missingUniversity.length) {
    return {
      error: `Manca l'università per: ${missingUniversity.map((r: any) => r.name).join(", ")}.`,
    };
  }

  const { error } = await (supabase.from("association_profiles") as any)
    .update({ public_page_status: "published" })
    .in("id", associationIds);

  if (error) return { error: error.message };

  revalidateSeeded();
  return { success: true, count: associationIds.length };
}
