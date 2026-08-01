"use server";

import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { generateSlots, parseWindows, type InterviewWindow } from "@/lib/interview-slots";
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
  location?: string;
  meetingLink?: string;
  slotDurationMinutes: number;
  breakMinutes: number;
  parallelTracks: number;
  windows: InterviewWindow[];
}) {
  const { ctx, supabase, membership } = await loadMembership(input.associationId);
  if (!canManage(membership, ctx.isMiraAdmin)) return { error: "Non hai i permessi." };

  if (!input.title.trim()) return { error: "Dai un titolo alla sessione." };
  if (input.mode === "online" && !input.meetingLink?.trim()) {
    return { error: "Una sessione online ha bisogno del link." };
  }
  if (input.mode === "in_person" && !input.location?.trim()) {
    return { error: "Una sessione in presenza ha bisogno del luogo." };
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
      location: input.mode === "in_person" ? input.location!.trim() : null,
      meeting_link: input.mode === "online" ? input.meetingLink!.trim() : null,
      slot_duration_minutes: input.slotDurationMinutes,
      break_minutes: input.breakMinutes,
      parallel_tracks: input.parallelTracks,
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
    // Aprire una sessione i cui slot non sono coperti da nessuno significa far
    // prenotare orari in cui non c'è nessuno ad aspettare lo studente.
    const { count } = await (supabase.from("interview_slot_interviewers") as any)
      .select("slot_id, interview_slots!inner(session_id)", { count: "exact", head: true })
      .eq("interview_slots.session_id", input.sessionId);

    if (!count) {
      return { error: "Nessuno del board si è ancora preso uno slot: la sessione resterebbe vuota." };
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
 * Il membro del board si prende (o lascia) una fascia di slot. Si lavora su un
 * intervallo e non su un singolo slot perché su una griglia da quaranta caselle
 * nessuno cliccherebbe quaranta volte.
 */
export async function setInterviewerCoverage(input: {
  sessionId: string;
  slug: string;
  slotIds: string[];
  covering: boolean;
}) {
  const supabase = await createServiceClient();

  const { data: session } = await (supabase.from("interview_sessions") as any)
    .select("association_id")
    .eq("id", input.sessionId)
    .maybeSingle();

  if (!session) return { error: "Sessione non trovata." };

  const { ctx, membership } = await loadMembership(session.association_id);
  // Coprire un turno non è amministrare: basta far parte del board.
  if (!membership && !ctx.isMiraAdmin) return { error: "Non fai parte di questa associazione." };
  if (!input.slotIds.length) return { error: "Nessuno slot selezionato." };

  const profileId = (ctx.profile as any).id as string;

  // Gli slot devono appartenere davvero a questa sessione: l'id arriva dal client.
  const { data: slots } = await (supabase.from("interview_slots") as any)
    .select("id")
    .eq("session_id", input.sessionId)
    .in("id", input.slotIds);

  const validIds = ((slots ?? []) as any[]).map((s) => s.id);
  if (!validIds.length) return { error: "Slot non validi." };

  if (input.covering) {
    const { error } = await (supabase.from("interview_slot_interviewers") as any).upsert(
      validIds.map((slotId) => ({ slot_id: slotId, user_id: profileId })),
      { onConflict: "slot_id,user_id", ignoreDuplicates: true }
    );
    if (error) return { error: error.message };
  } else {
    const { error } = await (supabase.from("interview_slot_interviewers") as any)
      .delete()
      .eq("user_id", profileId)
      .in("slot_id", validIds);
    if (error) return { error: error.message };
  }

  revalidateSession(input.slug, input.sessionId);
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
