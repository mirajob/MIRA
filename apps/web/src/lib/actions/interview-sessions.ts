"use server";

import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import {
  generateSlots,
  mergeBlocksIntoRanges,
  parseWindows,
  type InterviewWindow,
} from "@/lib/interview-slots";
import { revalidatePath } from "next/cache";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Sessioni di colloquio: un round di selezione con la sua modalità, la sua griglia
 * di orari e il panel che la copre.
 *
 * Chi può gestirle: gli amministratori dell'associazione, o chi ha il permesso
 * manage_interview_slots. Coprire uno slot invece è aperto a chiunque abbia accesso
 * alla dashboard: prendersi un turno non è un atto amministrativo.
 */

async function loadMembership(associationId: string) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  const { data: membership } = await (supabase.from("association_memberships") as any)
    .select("role, permissions")
    .eq("association_id", associationId)
    .eq("user_id", (ctx.profile as any).id)
    .eq("status", "active")
    .maybeSingle();

  return { ctx, supabase, membership };
}

function canManage(
  membership: { role: string; permissions?: unknown } | null,
  isMiraAdmin: boolean
): boolean {
  if (isMiraAdmin) return true;
  if (!membership) return false;
  if (membership.role === "association_admin" || membership.role === "association_president") {
    return true;
  }
  const perms = membership.permissions as Record<string, boolean> | null;
  return Boolean(perms?.manage_interview_slots);
}

function revalidateSession(slug: string, sessionId?: string) {
  revalidatePath(`/association/${slug}/colloqui`);
  if (sessionId) revalidatePath(`/association/${slug}/colloqui/${sessionId}`);
}

export async function createInterviewSession(input: {
  associationId: string;
  slug: string;
  cycleId: string;
  title: string;
  description?: string;
  mode: "online" | "in_person";
  linkMode: "shared" | "per_interview" | "auto";
  location?: string;
  meetingLink?: string;
  slotDurationMinutes: number;
  breakMinutes: number;
  parallelTracks: number;
  requiredInterviewers: number;
  windows: InterviewWindow[];
}) {
  const { ctx, supabase, membership } = await loadMembership(input.associationId);
  if (!canManage(membership, ctx.isMiraAdmin)) return { error: "Non hai i permessi." };

  if (!input.title.trim()) return { error: "Dai un titolo alla sessione." };
  // Il posto serve solo se e' uno per tutti: in per_interview arriva dopo,
  // colloquio per colloquio, sia che sia un'aula sia che sia un link.
  if (input.linkMode === "shared" && input.mode === "in_person" && !input.location?.trim()) {
    return { error: "Con un luogo solo per tutti serve indicare dove." };
  }
  // In modalità per_interview il link non esiste ancora: lo mette chi conduce dopo
  // la prenotazione. Serve solo se la stanza è una sola per tutti.
  if (input.mode === "online" && input.linkMode === "shared" && !input.meetingLink?.trim()) {
    return { error: "Con una stanza sola serve il link, oppure scegli un link per colloquio." };
  }

  const windows = parseWindows(input.windows);
  if (!windows.length) return { error: "Aggiungi almeno una giornata di colloqui." };

  // Il round successivo si numera da solo: il board non deve tenere il conto.
  const { data: existing } = await (supabase.from("interview_sessions") as any)
    .select("round_index")
    .eq("application_cycle_id", input.cycleId)
    .order("round_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: session, error } = await (supabase.from("interview_sessions") as any)
    .insert({
      association_id: input.associationId,
      application_cycle_id: input.cycleId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      round_index: (existing?.round_index ?? 0) + 1,
      mode: input.mode,
      link_mode: input.linkMode,
      location: input.mode === "in_person" ? input.location?.trim() || null : null,
      meeting_link:
        input.mode === "online" && input.linkMode === "shared"
          ? input.meetingLink!.trim()
          : null,
      slot_duration_minutes: input.slotDurationMinutes,
      break_minutes: input.breakMinutes,
      parallel_tracks: input.parallelTracks,
      required_interviewers: input.requiredInterviewers,
      windows,
      status: "draft",
      created_by_user_id: (ctx.profile as any).id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const generated = await regenerateSlots(session.id);
  if (generated.error) return generated;

  revalidateSession(input.slug);
  return { success: true, sessionId: session.id as string };
}

/**
 * Modifica di un round già creato.
 *
 * Mancava, e non era un dettaglio: una volta creata la sessione non si poteva più
 * cambiare né un orario né una data. La griglia si rigenera dopo la modifica, e
 * gli slot già prenotati restano dov'erano.
 */
export async function updateInterviewSession(input: {
  sessionId: string;
  slug: string;
  title: string;
  description?: string;
  mode: "online" | "in_person";
  linkMode: "shared" | "per_interview" | "auto";
  location?: string;
  meetingLink?: string;
  slotDurationMinutes: number;
  breakMinutes: number;
  parallelTracks: number;
  requiredInterviewers: number;
  windows: InterviewWindow[];
}) {
  const supabase = await createServiceClient();

  const { data: session } = await (supabase.from("interview_sessions") as any)
    .select("association_id")
    .eq("id", input.sessionId)
    .maybeSingle();

  if (!session) return { error: "Sessione non trovata." };

  const { ctx, membership } = await loadMembership(session.association_id);
  if (!canManage(membership, ctx.isMiraAdmin)) return { error: "Non hai i permessi." };

  if (!input.title.trim()) return { error: "Dai un titolo alla sessione." };
  // Il posto serve solo se e' uno per tutti: in per_interview arriva dopo,
  // colloquio per colloquio, sia che sia un'aula sia che sia un link.
  if (input.linkMode === "shared" && input.mode === "in_person" && !input.location?.trim()) {
    return { error: "Con un luogo solo per tutti serve indicare dove." };
  }
  if (input.mode === "online" && input.linkMode === "shared" && !input.meetingLink?.trim()) {
    return { error: "Con una stanza sola serve il link, oppure scegli un link per colloquio." };
  }

  const windows = parseWindows(input.windows);
  if (!windows.length) return { error: "Serve almeno una giornata di colloqui." };

  // Se ci sono colloqui prenotati fuori dalle nuove giornate, la modifica li
  // lascerebbe orfani: meglio dirlo che scoprirlo dopo.
  const { data: bookedSlots } = await (supabase.from("interview_slots") as any)
    .select("starts_at")
    .eq("session_id", input.sessionId)
    .not("application_id", "is", null);

  const newDays = new Set(windows.map((w) => w.date));
  const orphaned = ((bookedSlots ?? []) as any[]).filter((s) => {
    const day = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Rome",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(s.starts_at));
    return !newDays.has(day);
  });

  if (orphaned.length) {
    return {
      error: `Ci sono ${orphaned.length} colloqui prenotati in giornate che stai togliendo. Spostali o annullali prima.`,
    };
  }

  const { error } = await (supabase.from("interview_sessions") as any)
    .update({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      mode: input.mode,
      link_mode: input.linkMode,
      location: input.mode === "in_person" ? input.location?.trim() || null : null,
      meeting_link:
        input.mode === "online" && input.linkMode === "shared" ? input.meetingLink!.trim() : null,
      slot_duration_minutes: input.slotDurationMinutes,
      break_minutes: input.breakMinutes,
      parallel_tracks: input.parallelTracks,
      required_interviewers: input.requiredInterviewers,
      windows,
    })
    .eq("id", input.sessionId);

  if (error) return { error: error.message };

  const generated = await regenerateSlots(input.sessionId);
  if (generated.error) return generated;

  revalidateSession(input.slug, input.sessionId);
  return { success: true };
}

/**
 * Ricostruisce la griglia dalle finestre della sessione.
 *
 * Gli slot già prenotati non si toccano: cancellarli scaricherebbe su uno studente
 * la conseguenza di una modifica fatta dal board. Vengono rimossi solo quelli
 * ancora liberi, e reinseriti secondo le finestre nuove.
 */
export async function regenerateSlots(sessionId: string) {
  const supabase = await createServiceClient();

  const { data: session } = await (supabase.from("interview_sessions") as any)
    .select("id, association_id, windows, slot_duration_minutes, break_minutes, parallel_tracks")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) return { error: "Sessione non trovata." };

  const { ctx, membership } = await loadMembership(session.association_id);
  if (!canManage(membership, ctx.isMiraAdmin)) return { error: "Non hai i permessi." };

  await (supabase.from("interview_slots") as any)
    .delete()
    .eq("session_id", sessionId)
    .is("application_id", null);

  const slots = generateSlots({
    windows: parseWindows(session.windows),
    slotDurationMinutes: session.slot_duration_minutes,
    breakMinutes: session.break_minutes,
    parallelTracks: session.parallel_tracks,
  });

  if (!slots.length) return { success: true, count: 0 };

  // Gli slot prenotati sopravvivono al giro sopra: ignoreDuplicates evita di
  // scontrarsi con loro sul vincolo (session_id, starts_at, track).
  const { error } = await (supabase.from("interview_slots") as any).upsert(
    slots.map((s) => ({
      session_id: sessionId,
      starts_at: s.startsAt,
      ends_at: s.endsAt,
      track: s.track,
      status: "open",
    })),
    { onConflict: "session_id,starts_at,track", ignoreDuplicates: true }
  );

  if (error) return { error: error.message };
  return { success: true, count: slots.length };
}

/** Apre la sessione: da qui gli slot coperti diventano prenotabili. */
export async function setInterviewSessionStatus(input: {
  sessionId: string;
  slug: string;
  status: "draft" | "open" | "closed";
}) {
  const supabase = await createServiceClient();

  const { data: session } = await (supabase.from("interview_sessions") as any)
    .select("association_id, mode, location, meeting_link")
    .eq("id", input.sessionId)
    .maybeSingle();

  if (!session) return { error: "Sessione non trovata." };

  const { ctx, membership } = await loadMembership(session.association_id);
  if (!canManage(membership, ctx.isMiraAdmin)) return { error: "Non hai i permessi." };

  if (input.status === "open") {
    // Aprire una sessione senza disponibilità significa far prenotare orari in cui
    // non c'è nessuno ad aspettare lo studente.
    const { count } = await (supabase.from("interview_availability") as any)
      .select("id", { count: "exact", head: true })
      .eq("session_id", input.sessionId);

    if (!count) {
      return { error: "Nessuno del board ha ancora dato la sua disponibilità: la sessione resterebbe vuota." };
    }
  }

  const { error } = await (supabase.from("interview_sessions") as any)
    .update({ status: input.status })
    .eq("id", input.sessionId);

  if (error) return { error: error.message };

  revalidateSession(input.slug, input.sessionId);
  return { success: true };
}

/**
 * Le disponibilità di chi guarda, per questa sessione.
 *
 * Arrivano dall'interfaccia come blocchi cliccati e vengono salvate come fasce
 * continue: nessuno ragiona per caselle, si ragiona per "giovedì dalle 15 alle 17".
 * Si riscrive tutto l'insieme invece di aggiungere e togliere il singolo pezzo,
 * così quello che vedi sullo schermo è esattamente quello che finisce salvato.
 */
export async function setMyAvailability(input: {
  sessionId: string;
  slug: string;
  blocks: { startsAt: string; endsAt: string }[];
}) {
  const supabase = await createServiceClient();

  const { data: session } = await (supabase.from("interview_sessions") as any)
    .select("association_id")
    .eq("id", input.sessionId)
    .maybeSingle();

  if (!session) return { error: "Sessione non trovata." };

  const { ctx, membership } = await loadMembership(session.association_id);
  // Dare la propria disponibilità non è amministrare: basta far parte del board.
  if (!membership && !ctx.isMiraAdmin) return { error: "Non fai parte di questa associazione." };

  const profileId = (ctx.profile as any).id as string;
  const ranges = mergeBlocksIntoRanges(input.blocks);

  await (supabase.from("interview_availability") as any)
    .delete()
    .eq("session_id", input.sessionId)
    .eq("user_id", profileId);

  if (ranges.length) {
    const { error } = await (supabase.from("interview_availability") as any).insert(
      ranges.map((r) => ({
        session_id: input.sessionId,
        user_id: profileId,
        starts_at: r.startsAt,
        ends_at: r.endsAt,
      }))
    );
    if (error) return { error: error.message };
  }

  revalidateSession(input.slug, input.sessionId);
  return { success: true, ranges: ranges.length };
}

/**
 * Il posto valido per tutti i colloqui del round, impostato al momento
 * dell'invito.
 *
 * Serve a mandare una mail sola: se il posto si conosce prima, la conferma di
 * prenotazione lo contiene già e non serve la seconda email con i dettagli.
 */
export async function setSessionSharedPlace(input: {
  sessionId: string;
  slug: string;
  place: string;
}) {
  const supabase = await createServiceClient();

  const { data: session } = await (supabase.from("interview_sessions") as any)
    .select("association_id, mode")
    .eq("id", input.sessionId)
    .maybeSingle();

  if (!session) return { error: "Sessione non trovata." };

  const { ctx, membership } = await loadMembership(session.association_id);
  if (!canManage(membership, ctx.isMiraAdmin)) return { error: "Non hai i permessi." };
  if (!input.place.trim()) return { error: "Indica dove si fanno i colloqui." };

  const { error } = await (supabase.from("interview_sessions") as any)
    .update({
      link_mode: "shared",
      location: session.mode === "in_person" ? input.place.trim() : null,
      meeting_link: session.mode === "online" ? input.place.trim() : null,
    })
    .eq("id", input.sessionId);

  if (error) return { error: error.message };

  revalidateSession(input.slug, input.sessionId);
  return { success: true };
}

/** Il link della propria stanza permanente, usato su tutti i colloqui che si conducono. */
export async function setMyMeetingLink(link: string) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  const { error } = await (supabase.from("profiles") as any)
    .update({ meeting_link: link.trim() || null })
    .eq("id", (ctx.profile as any).id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteInterviewSession(input: { sessionId: string; slug: string }) {
  const supabase = await createServiceClient();

  const { data: session } = await (supabase.from("interview_sessions") as any)
    .select("association_id")
    .eq("id", input.sessionId)
    .maybeSingle();

  if (!session) return { error: "Sessione non trovata." };

  const { ctx, membership } = await loadMembership(session.association_id);
  if (!canManage(membership, ctx.isMiraAdmin)) return { error: "Non hai i permessi." };

  // Con colloqui già prenotati la cancellazione lascerebbe degli studenti con un
  // appuntamento sparito e nessuna spiegazione.
  const { count } = await (supabase.from("interview_slots") as any)
    .select("id", { count: "exact", head: true })
    .eq("session_id", input.sessionId)
    .not("application_id", "is", null);

  if (count) {
    return { error: `Ci sono ${count} colloqui già prenotati: annullali prima di eliminare la sessione.` };
  }

  const { error } = await (supabase.from("interview_sessions") as any)
    .delete()
    .eq("id", input.sessionId);

  if (error) return { error: error.message };

  revalidateSession(input.slug);
  return { success: true };
}
