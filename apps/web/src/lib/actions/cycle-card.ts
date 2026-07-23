"use server";

import { chatCompletion } from "@mira/ai";
import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { canManageCycles, nextPhase, parseBuildState, CYCLE_BLOCK_ORDER } from "@/lib/cycle-card";
import type { CycleBlock, CycleCardState, CyclePosition } from "@/lib/cycle-card";
import { revalidatePath } from "next/cache";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Costruzione e modifica della card del ciclo. Il ciclo nasce subito come riga in draft e si
 * riempie un blocco alla volta: cosi' chi chiude il browser a meta' rientra e riprende da
 * dove era rimasto, senza stato conservato nel client.
 */

async function guard(associationId: string) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();
  const profileId = (ctx.profile as any).id as string;

  if (!(await canManageCycles(supabase, associationId, profileId, ctx.isMiraAdmin))) {
    return { supabase, profileId, error: "Non hai i permessi per gestire i cicli" as const };
  }
  return { supabase, profileId, error: null };
}

/** Carica ciclo + associazione e verifica i permessi in un colpo solo. */
async function loadGuarded(cycleId: string) {
  const supabase = await createServiceClient();
  const { data: cycle } = await (supabase.from("application_cycles") as any)
    .select("*, association_profiles(id, slug, name)")
    .eq("id", cycleId)
    .maybeSingle();

  if (!cycle) return { error: "Ciclo non trovato" as const, cycle: null, supabase, association: null };

  const association = cycle.association_profiles as { id: string; slug: string; name: string };
  const ctx = await getUserContext();
  const profileId = (ctx.profile as any).id as string;

  if (!(await canManageCycles(supabase, association.id, profileId, ctx.isMiraAdmin))) {
    return { error: "Non hai i permessi per gestire i cicli" as const, cycle: null, supabase, association: null };
  }
  return { error: null, cycle, supabase, association };
}

function toDateInput(value: string | null): string {
  return value ? String(value).slice(0, 10) : "";
}

/**
 * Stato di costruzione del ciclo. I cicli creati col vecchio flusso non hanno build_state:
 * valgono come gia' completi, cosi' si aprono come card invece di ripartire da zero.
 */
function effectiveBuildState(cycle: any): { phase: CycleBlock | "done"; approved: CycleBlock[] } {
  return parseBuildState(cycle.build_state) ?? { phase: "done", approved: [...CYCLE_BLOCK_ORDER] };
}

async function buildState(supabase: any, cycle: any, association: { id: string; slug: string; name: string }): Promise<CycleCardState> {
  const { data: questions } = await (supabase.from("application_questions") as any)
    .select("id, question_text, required, order_index")
    .eq("application_cycle_id", cycle.id)
    .order("order_index");

  // I cicli creati col vecchio flusso non hanno build_state: si aprono direttamente come
  // card completa, invece di ributtare il board in un percorso di costruzione gia' fatto.
  const parsed = effectiveBuildState(cycle);
  const criteria = (cycle.evaluation_criteria ?? {}) as Record<string, unknown>;

  return {
    cycleId: cycle.id,
    associationId: association.id,
    slug: association.slug,
    associationName: association.name,
    status: cycle.status,
    phase: parsed.phase,
    approved: parsed.approved,
    data: {
      nome: cycle.title ?? "",
      descrizione: cycle.description ?? "",
      opensAt: toDateInput(cycle.opens_at),
      closesAt: toDateInput(cycle.closes_at),
      posizioni: (cycle.available_roles ?? []) as CyclePosition[],
      candidaturaGenerica: Boolean((criteria as any).candidatura_generica),
      profilo: String((criteria as any).general_requirements ?? ""),
      nessunaDomanda: Boolean((criteria as any).nessuna_domanda),
      domande: (questions ?? []).map((q: any) => ({
        id: q.id,
        text: q.question_text,
        required: q.required ?? true,
      })),
    },
  };
}

/**
 * Crea il ciclo in bozza e restituisce il suo id. Se ne esiste gia' uno in costruzione lo
 * riprende invece di crearne un altro: il founder non vuole cicli aperti a decine.
 */
export async function startCycleBuild(associationId: string) {
  const { supabase, profileId, error } = await guard(associationId);
  if (error) return { error };

  const { data: existing } = await (supabase.from("application_cycles") as any)
    .select("id, build_state")
    .eq("association_id", associationId)
    .eq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing && parseBuildState(existing.build_state)) {
    return { cycleId: existing.id as string };
  }

  const { data: association } = await (supabase.from("association_profiles") as any)
    .select("slug")
    .eq("id", associationId)
    .maybeSingle();

  const { data: cycle, error: insertError } = await (supabase.from("application_cycles") as any)
    .insert({
      association_id: associationId,
      title: "",
      status: "draft",
      created_by_user_id: profileId,
      build_state: { phase: "nome", approved: [] },
    })
    .select("id")
    .single();

  if (insertError) return { error: insertError.message };

  revalidatePath(`/association/${association?.slug}/cycles`);
  return { cycleId: cycle.id as string };
}

export async function loadCycleCard(cycleId: string): Promise<{ state?: CycleCardState; error?: string }> {
  const { error, cycle, supabase, association } = await loadGuarded(cycleId);
  if (error) return { error };
  return { state: await buildState(supabase, cycle, association!) };
}

export interface CycleBlockPayload {
  nome?: string;
  descrizione?: string;
  opensAt?: string;
  closesAt?: string;
  posizioni?: CyclePosition[];
  candidaturaGenerica?: boolean;
  profilo?: string;
  domande?: Array<{ text: string; required: boolean }>;
  nessunaDomanda?: boolean;
}

/**
 * Salva un blocco e lo segna confermato. La fase avanza al primo blocco non ancora
 * confermato, quindi confermare una modifica a meta' card riporta in fondo, non indietro.
 */
export async function saveCycleBlock(cycleId: string, block: CycleBlock, payload: CycleBlockPayload) {
  const { error, cycle, supabase, association } = await loadGuarded(cycleId);
  if (error) return { error };

  const parsed = effectiveBuildState(cycle);
  const criteria = { ...((cycle.evaluation_criteria ?? {}) as Record<string, unknown>) };
  const update: Record<string, unknown> = {};

  switch (block) {
    case "nome": {
      const nome = (payload.nome ?? "").trim();
      if (!nome) return { error: "Il nome del ciclo è obbligatorio" };
      if (nome.length > 120) return { error: "Nome troppo lungo (max 120 caratteri)" };
      update.title = nome;
      break;
    }
    case "descrizione":
      update.description = (payload.descrizione ?? "").trim() || null;
      break;
    case "date": {
      const opens = (payload.opensAt ?? "").trim();
      const closes = (payload.closesAt ?? "").trim();
      if (opens && closes && closes < opens) {
        return { error: "La data di chiusura viene prima di quella di apertura" };
      }
      update.opens_at = opens || null;
      update.closes_at = closes || null;
      break;
    }
    case "posizioni": {
      const generica = Boolean(payload.candidaturaGenerica);
      const posizioni = generica
        ? []
        : (payload.posizioni ?? [])
            .map((p) => ({ name: p.name.trim(), description: p.description?.trim() || undefined }))
            .filter((p) => p.name);
      if (!generica && posizioni.length === 0) {
        return { error: "Aggiungi almeno una posizione, oppure scegli la candidatura generica" };
      }
      update.available_roles = posizioni;
      criteria.candidatura_generica = generica;
      update.evaluation_criteria = criteria;
      break;
    }
    case "profilo": {
      const profilo = (payload.profilo ?? "").trim();
      if (!profilo) return { error: "Descrivi il profilo che cercate: serve a MIRA per valutare i candidati" };
      criteria.general_requirements = profilo;
      update.evaluation_criteria = criteria;
      break;
    }
    case "domande": {
      const nessuna = Boolean(payload.nessunaDomanda);
      const domande = nessuna
        ? []
        : (payload.domande ?? [])
            .map((q) => ({ text: q.text.trim(), required: q.required }))
            .filter((q) => q.text);

      // Le domande si riscrivono per intero: sono poche e l'ordine conta.
      await (supabase.from("application_questions") as any)
        .delete()
        .eq("application_cycle_id", cycleId);

      if (domande.length > 0) {
        const { error: qError } = await (supabase.from("application_questions") as any).insert(
          domande.map((q, i) => ({
            application_cycle_id: cycleId,
            question_text: q.text,
            question_type: "long_text",
            required: q.required,
            order_index: i,
          }))
        );
        if (qError) return { error: qError.message };
      }

      criteria.nessuna_domanda = nessuna;
      update.evaluation_criteria = criteria;
      break;
    }
  }

  const approved = parsed.approved.includes(block) ? parsed.approved : [...parsed.approved, block];
  const ordered = CYCLE_BLOCK_ORDER.filter((b) => approved.includes(b));
  update.build_state = { phase: nextPhase(ordered), approved: ordered };

  const { error: updateError } = await (supabase.from("application_cycles") as any)
    .update(update)
    .eq("id", cycleId);

  if (updateError) return { error: updateError.message };

  revalidatePath(`/association/${association!.slug}/cycles/${cycleId}`);
  revalidatePath(`/association/${association!.slug}/cycles`);
  return { success: true };
}

/** "Modifica": riporta MIRA su un blocco gia' confermato senza perdere gli altri. */
export async function reopenCycleBlock(cycleId: string, block: CycleBlock) {
  const { error, cycle, supabase, association } = await loadGuarded(cycleId);
  if (error) return { error };

  const parsed = effectiveBuildState(cycle);

  await (supabase.from("application_cycles") as any)
    .update({ build_state: { phase: block, approved: parsed.approved } })
    .eq("id", cycleId);

  revalidatePath(`/association/${association!.slug}/cycles/${cycleId}`);
  return { success: true };
}

/** Chiude la modifica e torna alla card intera, senza toccare i blocchi confermati. */
export async function closeCycleEditing(cycleId: string) {
  const { error, cycle, supabase, association } = await loadGuarded(cycleId);
  if (error) return { error };

  const parsed = effectiveBuildState(cycle);

  await (supabase.from("application_cycles") as any)
    .update({ build_state: { phase: nextPhase(parsed.approved), approved: parsed.approved } })
    .eq("id", cycleId);

  revalidatePath(`/association/${association!.slug}/cycles/${cycleId}`);
  return { success: true };
}

/** Pubblica il ciclo: da qui in poi gli studenti lo vedono e possono candidarsi. */
export async function publishCycleCard(cycleId: string) {
  const { error, cycle, supabase, association } = await loadGuarded(cycleId);
  if (error) return { error };

  const parsed = effectiveBuildState(cycle);
  const missing = CYCLE_BLOCK_ORDER.filter((b) => !parsed.approved.includes(b));
  if (missing.length > 0) {
    return { error: "Completa tutti i blocchi prima di aprire le candidature" };
  }

  const ctx = await getUserContext();

  await (supabase.from("application_cycles") as any)
    .update({ status: "open" })
    .eq("id", cycleId);

  await (supabase.from("audit_logs") as any).insert({
    actor_user_id: (ctx.profile as any).id,
    action: "cycle_open",
    entity_type: "application_cycle",
    entity_id: cycleId,
  });

  revalidatePath(`/association/${association!.slug}/cycles`);
  revalidatePath(`/association/${association!.slug}/cycles/${cycleId}`);
  return { success: true };
}

/** Elimina un ciclo ancora in bozza (nessuna candidatura possibile): serve per "Annulla". */
export async function discardCycleDraft(cycleId: string) {
  const { error, cycle, supabase, association } = await loadGuarded(cycleId);
  if (error) return { error };
  if (cycle.status !== "draft") return { error: "Il ciclo è già stato aperto" };

  await (supabase.from("application_cycles") as any).delete().eq("id", cycleId);

  revalidatePath(`/association/${association!.slug}/cycles`);
  return { success: true };
}

const QUESTIONS_PROMPT = `Sei MIRA e aiuti il board di un'associazione universitaria a scrivere le domande di una candidatura.

Scrivi da 3 a 5 domande aperte, in italiano, che aiutino davvero a capire il candidato: motivazione reale, esperienze concrete, come ragiona. Evita domande generiche o retoriche a cui si risponde con una frase fatta.

Rispondi SOLO con un array JSON di stringhe, senza testo intorno e senza blocchi di codice. Esempio: ["Prima domanda?","Seconda domanda?"]`;

/**
 * Proposta di domande a partire dal profilo cercato. E' un suggerimento: il board le
 * modifica e le conferma a mano, MIRA non decide nulla da sola.
 */
export async function suggestCycleQuestions(cycleId: string) {
  const { error, cycle, association } = await loadGuarded(cycleId);
  if (error) return { error };

  const criteria = (cycle.evaluation_criteria ?? {}) as Record<string, unknown>;
  const profilo = String(criteria.general_requirements ?? "").trim();
  if (!profilo) return { error: "Prima descrivi il profilo che cercate" };

  const posizioni = ((cycle.available_roles ?? []) as CyclePosition[]).map((p) => p.name).join(", ");

  try {
    const raw = await chatCompletion(
      [
        { role: "system", content: QUESTIONS_PROMPT },
        {
          role: "user",
          content: [
            `Associazione: ${association!.name}`,
            `Ciclo: ${cycle.title || "senza nome"}`,
            posizioni ? `Posizioni aperte: ${posizioni}` : "Candidatura generica, senza ruoli specifici",
            `Profilo cercato: ${profilo}`,
          ].join("\n"),
        },
      ],
      { temperature: 0.6, maxTokens: 600 }
    );

    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return { error: "MIRA non è riuscita a proporre le domande, riprova" };

    const parsed = JSON.parse(match[0]) as unknown;
    const domande = Array.isArray(parsed)
      ? parsed.filter((q): q is string => typeof q === "string" && q.trim().length > 0).slice(0, 5)
      : [];

    if (domande.length === 0) return { error: "MIRA non è riuscita a proporre le domande, riprova" };
    return { domande };
  } catch (err) {
    console.error("[MIRA] suggestCycleQuestions failed:", err);
    return { error: "MIRA non è riuscita a proporre le domande, riprova" };
  }
}
