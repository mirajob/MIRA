"use server";

import { createServerClient, createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { syncCardBlockStructuredData } from "@mira/ai";
import type { CardBlockType, HeaderProseContent, HeaderVisibility } from "@mira/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ALL_BLOCK_TYPES: CardBlockType[] = [
  "header",
  "disponibilita",
  "esperienze",
  "formazione",
  "competenze",
  "lingue",
  "autodescrizione",
  "interessi",
  "piano_carriera",
];

// Blocks whose prose is free text: structured_data comes from the AI resync module.
// header/disponibilita/lingue are structured enough to derive structured_data deterministically.
// formazione is not editable via updateCardBlockProseContent at all (transcript-only).
const PROSE_BLOCK_TYPES = new Set<CardBlockType>([
  "esperienze",
  "competenze",
  "autodescrizione",
  "interessi",
  "piano_carriera",
]);

async function getStudentProfileId(): Promise<string> {
  const ctx = await getUserContext();
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("user_id", (ctx.profile as any).id)
    .single();
  if (!data) throw new Error("Student profile not found");
  return (data as any).id as string;
}

// Default prose_content per block type — every renderer (onboarding preview, profile
// card, association card view) assumes this shape, never the raw {} column default.
// Missing this caused a client-side crash for any account created after the Step 1
// backfill (rows made only by this function, never touched by the backfill migration).
const DEFAULT_PROSE_CONTENT: Record<CardBlockType, unknown> = {
  header: { universita: "Università Bocconi", corso: null, livello: null, anno: null, laurea_anno: null, media_voti: null },
  disponibilita: { cosa_cerca: null, da_quando: null, dove: null, vincoli: null },
  esperienze: { items: [] },
  formazione: { items: [] },
  competenze: { items: [] },
  lingue: { items: [] },
  autodescrizione: { testo: null },
  interessi: { testo: null },
  piano_carriera: { stato: "esplorazione", testo: null },
};

/** Idempotent: creates any of the 9 rows missing for a student (e.g. accounts created after the Step 1 backfill). */
export async function ensureCardBlocksExist(studentProfileId: string) {
  const supabase = await createServiceClient();
  // Ogni riga deve avere lo STESSO insieme di chiavi: upsert() invia l'array come un unico
  // batch e PostgREST può fallire (o comportarsi in modo incoerente) se gli oggetti hanno
  // chiavi diverse tra loro — mai rendere `visibility` condizionale al block_type per questo.
  const rows = ALL_BLOCK_TYPES.map((block_type) => ({
    student_profile_id: studentProfileId,
    block_type,
    prose_content: DEFAULT_PROSE_CONTENT[block_type],
    visibility:
      block_type === "header" ? { media_voti: { associazioni: false, aziende: false } } : {},
  }));

  const { error } = await (supabase.from("card_blocks") as any).upsert(rows, {
    onConflict: "student_profile_id,block_type",
    ignoreDuplicates: true,
  });
  if (error) {
    console.error("[MIRA] ensureCardBlocksExist upsert failed:", error, "studentProfileId:", studentProfileId);
    throw new Error("Impossibile inizializzare i blocchi della card.");
  }

  // Verifica esplicita: con ignoreDuplicates:true, upsert() non ritorna le righe già esistenti
  // (ON CONFLICT DO NOTHING non produce output per quelle) — un conteggio è l'unico modo
  // affidabile di sapere se le 9 righe esistono davvero, invece di dedurlo dall'assenza di errori.
  const { count, error: countError } = await (supabase.from("card_blocks") as any)
    .select("block_type", { count: "exact", head: true })
    .eq("student_profile_id", studentProfileId);
  if (countError) {
    console.error("[MIRA] ensureCardBlocksExist count check failed:", countError);
  } else if (count !== ALL_BLOCK_TYPES.length) {
    console.error(
      `[MIRA] ensureCardBlocksExist: attese ${ALL_BLOCK_TYPES.length} righe per studentProfileId ${studentProfileId}, trovate ${count}.`
    );
    throw new Error("I blocchi della card non risultano tutti creati — riprova.");
  }
}

function stripMeta(item: Record<string, unknown>): Record<string, unknown> {
  const { id, verified, origin, ...rest } = item;
  return rest;
}

/** Per-item spec 3.2 rule: editing a verified item beyond what the transcript covers drops its badge. */
function applyVerifiedDropRule(
  oldItems: Array<Record<string, unknown>>,
  newItems: Array<Record<string, unknown>>
): Array<Record<string, unknown>> {
  const oldById = new Map(oldItems.map((item) => [item.id as string, item]));
  return newItems.map((item) => {
    const old = oldById.get(item.id as string);
    if (old?.verified && JSON.stringify(stripMeta(old)) !== JSON.stringify(stripMeta(item))) {
      return { ...item, verified: false };
    }
    return item;
  });
}

/**
 * Updates a card block's prose_content. Never accepts writes for `formazione` (transcript-only,
 * read-only in this step). For `header`, only corso/livello/anno/laurea_anno are writable here —
 * media_voti is transcript-verified and always preserved from the existing row.
 *
 * structured_data resync for free-text blocks is best-effort and non-blocking: prose_content is
 * saved synchronously below regardless of the AI call's outcome (matches the existing fire-and-forget
 * pattern used for pathway analysis in chat-onboarding.ts).
 */
export async function updateCardBlockProseContent(
  blockType: Exclude<CardBlockType, "formazione">,
  proseContent: unknown
) {
  const studentProfileId = await getStudentProfileId();
  const supabase = await createServiceClient();

  const { data: current } = await (supabase.from("card_blocks") as any)
    .select("prose_content, status")
    .eq("student_profile_id", studentProfileId)
    .eq("block_type", blockType)
    .single();

  if (!current) throw new Error("Card block not found");

  let nextProseContent: unknown = proseContent;

  if (blockType === "header") {
    const incoming = proseContent as Partial<HeaderProseContent>;
    const existing = current.prose_content as HeaderProseContent;
    nextProseContent = {
      universita: incoming.universita ?? existing.universita ?? null,
      corso: incoming.corso ?? existing.corso ?? null,
      livello: incoming.livello ?? existing.livello ?? null,
      anno: incoming.anno ?? existing.anno ?? null,
      laurea_anno: incoming.laurea_anno ?? existing.laurea_anno ?? null,
      media_voti: existing.media_voti ?? null, // transcript-only, never writable here
      formazione_precedente: incoming.formazione_precedente ?? existing.formazione_precedente ?? null,
    };
  } else if (blockType === "esperienze" || blockType === "competenze" || blockType === "lingue") {
    const incomingItems = (proseContent as { items: Array<Record<string, unknown>> }).items ?? [];
    const existingItems = ((current.prose_content as { items: Array<Record<string, unknown>> })?.items) ?? [];
    nextProseContent = { items: applyVerifiedDropRule(existingItems, incomingItems) };
  }

  const nextStatus = current.status === "approved" ? "approved" : "draft";
  const isProse = PROSE_BLOCK_TYPES.has(blockType);

  const { error } = await (supabase.from("card_blocks") as any)
    .update({
      prose_content: nextProseContent,
      status: nextStatus,
      ...(isProse ? {} : { structured_data: nextProseContent }),
    })
    .eq("student_profile_id", studentProfileId)
    .eq("block_type", blockType);

  if (error) throw error;

  revalidatePath("/student");

  if (isProse) {
    // Fire-and-forget: prose is already saved above. A failed sync just leaves
    // structured_data stale until the next successful edit retries it.
    syncCardBlockStructuredData(blockType as any, nextProseContent)
      .then(async (structuredData) => {
        const client = await createServiceClient();
        await (client.from("card_blocks") as any)
          .update({ structured_data: structuredData })
          .eq("student_profile_id", studentProfileId)
          .eq("block_type", blockType);
      })
      .catch((err) => {
        console.error(`[MIRA] card_block_sync failed for ${blockType}:`, err);
      });
  }

  return { success: true };
}

/** Writes only card_blocks.visibility for the header block — no dual-write to student_profiles.privacy_settings. */
export async function updateHeaderVisibility(visibility: HeaderVisibility) {
  const studentProfileId = await getStudentProfileId();
  const supabase = await createServiceClient();

  const { error } = await (supabase.from("card_blocks") as any)
    .update({ visibility })
    .eq("student_profile_id", studentProfileId)
    .eq("block_type", "header");
  if (error) throw error;

  revalidatePath("/student");
  return { success: true };
}

/**
 * Approva uno o più blocchi insieme (es. Header + Formazione, che condividono un solo
 * Conferma: gli esami sono una sezione espandibile dentro Header, non un blocco a sé).
 */
export async function approveCardBlock(blockType: CardBlockType | CardBlockType[]) {
  const studentProfileId = await getStudentProfileId();
  const supabase = await createServiceClient();
  const blockTypes = Array.isArray(blockType) ? blockType : [blockType];

  const { error } = await (supabase.from("card_blocks") as any)
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("student_profile_id", studentProfileId)
    .in("block_type", blockTypes);
  if (error) throw error;

  revalidatePath("/student");
  return { success: true };
}
