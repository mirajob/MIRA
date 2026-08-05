"use server";

import { chatCompletion } from "@mira/ai";
import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { ensureCardBlocksExist } from "./card-blocks";
import { EMPTY_ONBOARDING_BLOCKS } from "@/lib/onboarding-defaults";
import type {
  CardBlockStatus,
  HeaderProseContent,
  HeaderVisibility,
  FormazioneProseContent,
  EsperienzaItem,
  EsperienzeProseContent,
  DisponibilitaProseContent,
  CompetenzaItem,
  CompetenzeProseContent,
  LinguaItem,
  LingueProseContent,
  InteressiProseContent,
  AutodescrizioneProseContent,
  PianoCarrieraProseContent,
  PianoCarrieraStato,
} from "@mira/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Onboarding "form-first" (decisione founder 2026-07-14, dopo il test del flusso chat):
// niente più conversazione bidirezionale. MIRA parla con riquadri-guida sopra il blocco
// attivo; lo studente compila DIRETTAMENTE i campi del blocco e preme Conferma. L'AI resta
// dove è affidabile: parsing libretto/CV (prefill dei campi) e il bottone "✦ Migliora con
// MIRA" che riscrive i testi liberi in inglese.
// Il modello dati non cambia: 9 righe card_blocks, 6 blocchi visibili, gate su
// disponibilita + piano_carriera approvati insieme.
//
// Rework 2026-07-31: niente più "competenze accademiche" proposte dall'AI a partire dai voti.
// La parte teorica la certifica l'elenco esami del libretto (verificato, uguale per tutti);
// il blocco Competenze raccoglie solo hard skill, cioè cosa lo studente sa usare.

export interface OnboardingBlocksState {
  header: { status: CardBlockStatus; data: HeaderProseContent; visibility: HeaderVisibility };
  formazione: { status: CardBlockStatus; data: FormazioneProseContent };
  esperienze: { status: CardBlockStatus; data: EsperienzeProseContent };
  disponibilita: { status: CardBlockStatus; data: DisponibilitaProseContent };
  competenze: { status: CardBlockStatus; data: CompetenzeProseContent };
  lingue: { status: CardBlockStatus; data: LingueProseContent };
  interessi: { status: CardBlockStatus; data: InteressiProseContent };
  autodescrizione: { status: CardBlockStatus; data: AutodescrizioneProseContent };
  piano_carriera: { status: CardBlockStatus; data: PianoCarrieraProseContent };
}

export type OnboardingFlowPhase =
  | "disponibilita"
  | "esperienze"
  | "header"
  | "gate"
  | "esami"
  | "competenze"
  | "lingue"
  | "profilo"
  | "piano"
  | "chiusura";

export interface OnboardingFlowState {
  phase: OnboardingFlowPhase;
  blocks: OnboardingBlocksState;
  isBocconi: boolean;
  transcriptUploaded: boolean;
  cvUploaded: boolean;
  /** Quante esperienze ha trovato il CV parser (per il testo guida). */
  cvExperienceCount: number;
  cvLanguageCount: number;
  faseBStarted: boolean;
  esamiSkipped: boolean;
}

const ALL_BLOCK_TYPES = [
  "header",
  "formazione",
  "esperienze",
  "disponibilita",
  "competenze",
  "lingue",
  "interessi",
  "autodescrizione",
  "piano_carriera",
] as const;

async function getOnboardingContext() {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();
  const profileId = (ctx.profile as any).id as string;

  const { data: student } = await (supabase.from("student_profiles") as any)
    .select(
      "id, university, degree_level, transcript_uploaded, cv_uploaded, cv_summary, availability, goals, onboarding_answers"
    )
    .eq("user_id", profileId)
    .single();

  const studentProfileId = student.id as string;
  await ensureCardBlocksExist(studentProfileId);

  const { data: blockRows } = await (supabase.from("card_blocks") as any)
    .select("block_type, prose_content, status, visibility")
    .eq("student_profile_id", studentProfileId)
    .in("block_type", ALL_BLOCK_TYPES);

  const blocks: OnboardingBlocksState = JSON.parse(JSON.stringify(EMPTY_ONBOARDING_BLOCKS));
  for (const row of blockRows ?? []) {
    // Difesa contro righe con prose_content vuoto ({}) create prima che ensureCardBlocksExist
    // scrivesse una forma di default corretta — mai passare {} ai renderer che si aspettano items/testo.
    const hasShape = row.prose_content && Object.keys(row.prose_content).length > 0;
    const base = (blocks as any)[row.block_type];
    (blocks as any)[row.block_type] = {
      ...base,
      status: row.status,
      data: hasShape ? row.prose_content : base.data,
      ...(row.block_type === "header" && row.visibility?.media_voti ? { visibility: row.visibility } : {}),
    };
  }

  return { ctx, supabase, profileId, studentProfileId, student, blocks };
}

/** "Università Bocconi", "Bocconi University", "bocconi"... — mai un confronto esatto. */
function isBocconiStudent(student: any, blocks: OnboardingBlocksState): boolean {
  const uni = (blocks.header.data.universita ?? student?.university ?? "") as string;
  return uni.toLowerCase().includes("bocconi");
}

/** Flag di flusso (fase_b_started...) dentro onboarding_answers — sopravvivono al resume. */
async function saveAnswersFlags(supabase: any, profileId: string, patch: Record<string, unknown>) {
  const { data } = await supabase.from("student_profiles").select("onboarding_answers").eq("user_id", profileId).single();
  const existing = (data?.onboarding_answers as Record<string, unknown>) ?? {};
  await supabase
    .from("student_profiles")
    .update({ onboarding_answers: { ...existing, ...patch } })
    .eq("user_id", profileId);
}

/** Percentuale sui 7 blocchi visibili. Disponibilità e piano di carriera erano contati
 * come uno solo perché si confermavano insieme: dal 2026-08 sono due tappe distinte,
 * il piano chiude la Fase B. "formazione" vive dentro Header e "interessi" è legacy. */
/** Approvato conta solo se c'e' davvero del testo: il vecchio flusso approvava il piano
 * insieme alla disponibilita', lasciandolo vuoto, e la tappa finale non sarebbe mai apparsa. */
function pianoFatto(blocks: OnboardingBlocksState): boolean {
  return blocks.piano_carriera.status === "approved" && Boolean(blocks.piano_carriera.data.testo?.trim());
}

const BLOCCHI_PCT: Array<keyof OnboardingBlocksState> = [
  "disponibilita",
  "esperienze",
  "header",
  "competenze",
  "lingue",
  "autodescrizione",
  "piano_carriera",
];

function computePctFromBlocks(blocks: OnboardingBlocksState): number {
  const approved = BLOCCHI_PCT.filter((bt) =>
    bt === "piano_carriera" ? pianoFatto(blocks) : blocks[bt].status === "approved"
  ).length;
  return Math.round((approved / BLOCCHI_PCT.length) * 100);
}

// Il libretto non si chiede più dentro l'Header (2026-08-01): è una tappa a sé, subito
// dopo il gate, con testi diversi per triennale e magistrale e la possibilità di saltare.
// Chiederlo due volte nello stesso percorso lo faceva sembrare un pedaggio.
//
// Ordine della Fase A invertito (2026-07-29): si parte da "cosa cerchi", cioè la domanda
// per cui lo studente è arrivato su MIRA, e l'Header viene per ultimo — università e livello
// li abbiamo già dalla registrazione, quindi sono pochi campi. Il libretto NON è più uno step
// del percorso obbligatorio. Motivo: chiedere il transcript come primissima schermata faceva
// abbandonare la maggior parte dei registrati.
//
// Il piano di carriera è uscito dalla disponibilità (2026-08) ed è l'ULTIMA tappa,
// dopo il profilo personale: "quando sei libero" e "dove vuoi arrivare" sono due
// domande diverse, e insieme facevano un blocco lunghissimo alla prima schermata.
function derivePhase(
  blocks: OnboardingBlocksState,
  faseBStarted: boolean,
  esamiSkipped: boolean
): OnboardingFlowPhase {
  if (blocks.disponibilita.status !== "approved") return "disponibilita";
  if (blocks.esperienze.status !== "approved") return "esperienze";
  if (blocks.header.status !== "approved") return "header";

  const faseBDone =
    blocks.competenze.status === "approved" &&
    blocks.lingue.status === "approved" &&
    blocks.autodescrizione.status === "approved" &&
    pianoFatto(blocks);
  if (faseBDone) return "chiusura";
  if (!faseBStarted) return "gate";
  // Gli esami sono facoltativi: si esce da questa tappa confermando o saltando.
  if (blocks.formazione.status !== "approved" && !esamiSkipped) return "esami";
  if (blocks.competenze.status !== "approved") return "competenze";
  if (blocks.lingue.status !== "approved") return "lingue";
  if (blocks.autodescrizione.status !== "approved") return "profilo";
  return "piano";
}

export async function loadOnboardingFlow(): Promise<OnboardingFlowState> {
  const { student, blocks } = await getOnboardingContext();
  const answers = (student.onboarding_answers as Record<string, unknown>) ?? {};
  const faseBStarted = !!answers.fase_b_started;
  const esamiSkipped = !!answers.esami_skipped;
  const cv = student.cv_summary as { experiences?: unknown[]; languages?: unknown[] } | null;

  return {
    phase: derivePhase(blocks, faseBStarted, esamiSkipped),
    blocks,
    isBocconi: isBocconiStudent(student, blocks),
    transcriptUploaded: !!student.transcript_uploaded,
    cvUploaded: !!student.cv_uploaded,
    cvExperienceCount: cv?.experiences?.length ?? 0,
    cvLanguageCount: cv?.languages?.length ?? 0,
    faseBStarted,
    esamiSkipped,
  };
}

/** "Non ce l'ho ora": si va avanti, il libretto resta caricabile dal Profilo. */
export async function skipEsamiStep(): Promise<{ success: true }> {
  const { supabase, profileId, studentProfileId, blocks } = await getOnboardingContext();
  await saveAnswersFlags(supabase, profileId, { esami_skipped: true });

  // Chi ha caricato il libretto e poi tira dritto senza premere Conferma non deve
  // ritrovarsi gli esami invisibili a tutti: qui non c'è niente da correggere a mano,
  // il caricamento È il consenso. I voti restano coperti dai loro interruttori.
  if (blocks.formazione.status !== "approved" && blocks.formazione.data.items.length > 0) {
    await (supabase.from("card_blocks") as any)
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("student_profile_id", studentProfileId)
      .eq("block_type", "formazione");
  }

  revalidatePath("/student/onboarding");
  revalidatePath("/student");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Prefill dal CV — l'AI ha già fatto il parsing all'upload; qui si riversano i
// dati nei blocchi come bozza modificabile, senza nessuna interpretazione in più.
// ---------------------------------------------------------------------------

function cvPeriodo(exp: { start_date?: string; end_date?: string }): string {
  const start = exp.start_date?.trim() ?? "";
  const end = exp.end_date?.trim() ?? "";
  if (start && end) return `${start} – ${end}`;
  return start || end || "";
}

/** Riversa le esperienze del CV nel blocco Esperienze (bozza). Idempotente: dedup per
 * titolo+organizzazione, così ricaricare la pagina non duplica nulla. */
export async function prefillEsperienzeFromCV(): Promise<{ added: number }> {
  const { supabase, studentProfileId, student, blocks } = await getOnboardingContext();
  const cv = student.cv_summary as {
    experiences?: Array<{ title: string; organization: string; start_date?: string; end_date?: string; description?: string }>;
  } | null;
  const cvExperiences = cv?.experiences ?? [];
  if (cvExperiences.length === 0) return { added: 0 };

  const existing = blocks.esperienze.data.items;
  const exists = (title: string, org: string) =>
    existing.some(
      (e) =>
        e.titolo.toLowerCase().trim() === title.toLowerCase().trim() &&
        e.organizzazione.toLowerCase().trim() === org.toLowerCase().trim()
    );

  const newItems: EsperienzaItem[] = cvExperiences
    .filter((e) => (e.title || e.organization) && !exists(e.title ?? "", e.organization ?? ""))
    .map((e) => ({
      id: crypto.randomUUID(),
      titolo: e.title ?? "",
      ruolo: "",
      organizzazione: e.organization ?? "",
      periodo: cvPeriodo(e),
      descrizione: e.description ?? "",
      verified: false,
      origin: "cv_upload" as const,
    }));

  if (newItems.length === 0) return { added: 0 };

  const items = [...existing, ...newItems];
  const { error } = await (supabase.from("card_blocks") as any)
    .update({ prose_content: { items }, status: "draft" })
    .eq("student_profile_id", studentProfileId)
    .eq("block_type", "esperienze");
  if (error) throw error;

  revalidatePath("/student/onboarding");
  return { added: newItems.length };
}

/** Riversa le lingue del CV nel blocco Lingue (bozza), normalizzate e senza duplicati. */
export async function prefillLingueFromCV(): Promise<{ added: number }> {
  const { supabase, studentProfileId, student, blocks } = await getOnboardingContext();
  const cv = student.cv_summary as { languages?: Array<{ language: string; level: string }> } | null;
  const cvLanguages = cv?.languages ?? [];
  if (cvLanguages.length === 0) return { added: 0 };

  const existing = blocks.lingue.data.items;
  const seen = new Set(existing.map((l) => l.lingua.toLowerCase().trim()));

  const newItems: LinguaItem[] = [];
  for (const l of cvLanguages) {
    const key = (l.language ?? "").toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    newItems.push({
      id: crypto.randomUUID(),
      lingua: l.language,
      livello: l.level ?? "",
      certificazione: null,
      verified: false,
      origin: "cv_upload",
    });
  }
  if (newItems.length === 0) return { added: 0 };

  const items = [...existing, ...newItems];
  const { error } = await (supabase.from("card_blocks") as any)
    .update({ prose_content: { items }, status: "draft" })
    .eq("student_profile_id", studentProfileId)
    .eq("block_type", "lingue");
  if (error) throw error;

  revalidatePath("/student/onboarding");
  return { added: newItems.length };
}

// ---------------------------------------------------------------------------
// Fase B — apertura: riversa le hard skill trovate nel CV come bozza modificabile.
// ---------------------------------------------------------------------------

export async function startFaseBFlow(): Promise<{ prefilledHard: number }> {
  const { supabase, profileId, studentProfileId, student, blocks } = await getOnboardingContext();

  await saveAnswersFlags(supabase, profileId, { fase_b_started: true });

  const existingItems = blocks.competenze.data.items;

  // Hard skill dal CV (il parser le estrae già): prefill dedup, livello prudente.
  const cv = student.cv_summary as { skills?: string[] } | null;
  const cvSkills = cv?.skills ?? [];
  const existingTexts = new Set(existingItems.map((i) => i.testo.toLowerCase().trim()));
  const hardItems: CompetenzaItem[] = [];
  for (const s of cvSkills) {
    const key = (s ?? "").toLowerCase().trim();
    if (!key || existingTexts.has(key)) continue;
    existingTexts.add(key);
    hardItems.push({
      id: crypto.randomUUID(),
      testo: s,
      categoria: "hard",
      livello: "intermediate",
      evidenza_ref: null,
      verified: false,
      origin: "cv_upload",
    });
  }

  if (hardItems.length > 0) {
    const items = [...existingItems, ...hardItems];
    const { error } = await (supabase.from("card_blocks") as any)
      .update({
        prose_content: { items, soft_skills: blocks.competenze.data.soft_skills ?? [] },
        status: "draft",
      })
      .eq("student_profile_id", studentProfileId)
      .eq("block_type", "competenze");
    if (error) throw error;
  }

  revalidatePath("/student/onboarding");
  return { prefilledHard: hardItems.length };
}

// ---------------------------------------------------------------------------
// ✦ Migliora con MIRA — riscritture puntuali in inglese, su richiesta esplicita.
// ---------------------------------------------------------------------------

export async function miraImproveEsperienza(input: {
  titolo: string;
  organizzazione: string;
  descrizione: string;
}): Promise<{ descrizione: string }> {
  const result = await chatCompletion(
    [
      {
        role: "system",
        content: `Riscrivi la descrizione di un'esperienza per il profilo di uno studente universitario (MIRA Card, sempre in inglese). STILE OBBLIGATORIO: 2-3 frasi brevi che iniziano direttamente con un verbo al passato, senza soggetto (es. "Built...", "Led...", "Analyzed..."), MAI "I built..." né "He/she built...". Solo fatti concreti presi dal testo dello studente: mai inventare numeri, risultati o attività non dette, mai aggettivi di carattere. Se il testo è in italiano, traduci. Usa il contesto (titolo/organizzazione) solo per capire, non per gonfiare. Rispondi SOLO in JSON: {"descrizione":""}`,
      },
      {
        role: "user",
        content: `Titolo: ${input.titolo || "n/d"}\nOrganizzazione: ${input.organizzazione || "n/d"}\nTesto dello studente: "${input.descrizione}"`,
      },
    ],
    { temperature: 0.3, maxTokens: 300, jsonMode: true }
  );
  const parsed = JSON.parse(result) as { descrizione: string };
  return { descrizione: (parsed.descrizione ?? "").trim() || input.descrizione };
}

export async function miraImprovePiano(input: { testo: string }): Promise<{ testo: string; stato: PianoCarrieraStato }> {
  const result = await chatCompletion(
    [
      {
        role: "system",
        content: `Lo studente descrive i suoi piani per i prossimi mesi/anni (es. exchange, laurea, magistrale, lavoro, certificazioni) e la direzione di carriera. Riscrivi in "testo" un paragrafo breve (max 3 frasi), in PRIMA PERSONA e in INGLESE (la MIRA Card è sempre in inglese), onesto: se sta ancora esplorando, dillo chiaramente · mai gonfiare né inventare obiettivi non detti. Classifica in "stato": "direzione_chiara" SOLO se indica un settore/ruolo esplicito e sicuro; "ipotesi" se valuta 2-3 direzioni; "esplorazione" altrimenti. "stato" è un dato interno: non citarlo dentro "testo". Rispondi SOLO in JSON: {"testo":"","stato":"direzione_chiara|ipotesi|esplorazione"}`,
      },
      { role: "user", content: input.testo },
    ],
    { temperature: 0.3, maxTokens: 300, jsonMode: true }
  );
  const parsed = JSON.parse(result) as { testo: string; stato: string };
  const stato: PianoCarrieraStato =
    parsed.stato === "direzione_chiara" || parsed.stato === "ipotesi" ? parsed.stato : "esplorazione";
  return { testo: (parsed.testo ?? "").trim() || input.testo, stato };
}

export async function miraImproveProfilo(input: { testo: string }): Promise<{ testo: string }> {
  const result = await chatCompletion(
    [
      {
        role: "system",
        content: `Lo studente ha scritto liberamente come si presenta oltre a esami ed esperienze (interessi veri, cosa segue fuori dai programmi, cosa fa con costanza, come lo descriverebbero, cosa non sopporta, priorità). Riscrivi in "testo" un paragrafo breve (max 5 frasi) in PRIMA PERSONA e in INGLESE (la MIRA Card è sempre in inglese), basato SOLO su quello che ha scritto. Mai aggettivi di carattere dedotti da te ("intraprendente", "resiliente") e MAI etichette da valutazione attitudinale ("leadership", "teamwork") come se fossero competenze certificate: riformula le sue parole con naturalezza. Anche se il testo è breve, sintetizza quello che c'è senza inventare. Rispondi SOLO in JSON: {"testo":""}`,
      },
      { role: "user", content: input.testo },
    ],
    { temperature: 0.3, maxTokens: 450, jsonMode: true }
  );
  const parsed = JSON.parse(result) as { testo: string };
  return { testo: (parsed.testo ?? "").trim() || input.testo };
}

// ---------------------------------------------------------------------------
// Gate e chiusura
// ---------------------------------------------------------------------------

/** Chiamata alla conferma dell'Header, ultimo blocco della Fase A: sblocca la candidatura. */
export async function completeGateFlow(): Promise<{ progressPct: number }> {
  const { supabase, studentProfileId, blocks } = await getOnboardingContext();

  await (supabase.from("student_profiles") as any)
    .update({ onboarding_completed: true, onboarding_completed_at: new Date().toISOString() })
    .eq("id", studentProfileId);

  revalidatePath("/student");
  return { progressPct: computePctFromBlocks(blocks) };
}
