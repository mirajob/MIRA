"use server";

import { chatCompletion } from "@mira/ai";
import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import { ensureCardBlocksExist } from "./card-blocks";
import { EMPTY_ONBOARDING_BLOCKS } from "@/lib/onboarding-defaults";
import type {
  CardBlockType,
  CardBlockStatus,
  HeaderProseContent,
  HeaderVisibility,
  FormazioneProseContent,
  EsperienzaItem,
  EsperienzeProseContent,
  DisponibilitaProseContent,
  CompetenzaItem,
  CompetenzeProseContent,
  HardSkillLivello,
  LinguaItem,
  LingueProseContent,
  InteressiProseContent,
  AutodescrizioneProseContent,
  PianoCarrieraProseContent,
  PianoCarrieraStato,
} from "@mira/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Nota di architettura (card rework 2026-07, docs/MIRA_CARD_REWORK_SPEC.md):
// - La card visibile ha 6 blocchi, ma il DB resta a 9 righe (enum non migrato):
//   "Disponibilità e piano" = riga `disponibilita` (estesa con attiva/durata) + riga
//   `piano_carriera`, approvate SEMPRE insieme; "Profilo personale" = riga
//   `autodescrizione` (la riga `interessi` resta solo come legacy in lettura).
// - L'approvazione di un blocco avviene dal pannello (bottone Conferma) OPPURE in chat:
//   quando il blocco è in draft, un messaggio di pura conferma ("va bene così",
//   "confermo") viene riconosciuto e approva il blocco esattamente come il bottone.
//   Il controllo scatta SOLO con una bozza approvabile davanti, mai su risposte
//   contenutistiche (spec, dubbio 8). L'update a "approved" è idempotente (dubbio 9).
// - Il gate di Fase A scatta alla conferma congiunta di disponibilita + piano_carriera.

export type OnboardingPhase =
  | "welcome"
  | "livello"
  | "previous_degree"
  | "transcript"
  | "header_gap"
  | "cv"
  | "esperienze"
  | "disponibilita"
  | "gate"
  | "competenze"
  | "lingue"
  | "profilo_personale"
  | "chiusura";

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

export interface OnboardingState {
  conversation: ChatMessage[];
  phase: OnboardingPhase;
  blocks: OnboardingBlocksState;
  transcriptUploaded: boolean;
  cvUploaded: boolean;
  faseBStarted: boolean;
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
      "id, university, degree_program, degree_level, current_year, transcript_uploaded, cv_uploaded, cv_summary, availability, interests, goals, onboarding_answers"
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

/** "Università Bocconi", "Bocconi University", "bocconi"... — mai un confronto esatto (dubbio 18). */
function isBocconiStudent(student: any, blocks: OnboardingBlocksState): boolean {
  const uni = (blocks.header.data.universita ?? student?.university ?? "") as string;
  return uni.toLowerCase().includes("bocconi");
}

async function saveConversation(supabase: any, profileId: string, conversation: ChatMessage[]) {
  const { data } = await supabase.from("student_profiles").select("onboarding_answers").eq("user_id", profileId).single();
  const existing = (data?.onboarding_answers as Record<string, unknown>) ?? {};
  await supabase
    .from("student_profiles")
    .update({ onboarding_answers: { ...existing, conversation, last_updated: new Date().toISOString() } })
    .eq("user_id", profileId);
}

async function saveFaseBConversation(supabase: any, profileId: string, conversation: ChatMessage[]) {
  const { data } = await supabase.from("student_profiles").select("onboarding_answers").eq("user_id", profileId).single();
  const existing = (data?.onboarding_answers as Record<string, unknown>) ?? {};
  await supabase
    .from("student_profiles")
    .update({ onboarding_answers: { ...existing, fase_b_conversation: conversation, fase_b_last_updated: new Date().toISOString() } })
    .eq("user_id", profileId);
}

/** Flag di stato del flusso (es. competenze_stage) dentro onboarding_answers — sopravvivono
 * al resume cross-sessione, a differenza di un contatore lato client. */
async function saveAnswersFlags(supabase: any, profileId: string, patch: Record<string, unknown>) {
  const { data } = await supabase.from("student_profiles").select("onboarding_answers").eq("user_id", profileId).single();
  const existing = (data?.onboarding_answers as Record<string, unknown>) ?? {};
  await supabase
    .from("student_profiles")
    .update({ onboarding_answers: { ...existing, ...patch } })
    .eq("user_id", profileId);
}

// Unica lista da cui derivano sia il messaggio "cosa manca" sia il controllo di completezza:
// tenerle separate (come prima) permette che divergano — es. un campo richiesto da un lato
// e non controllato dall'altro produce un messaggio vuoto o una card mai "pronta".
const REQUIRED_HEADER_FIELDS: Array<{ key: keyof HeaderProseContent; labelKey: string }> = [
  { key: "universita", labelKey: "universita" },
  { key: "corso", labelKey: "corso" },
  { key: "livello", labelKey: "livello" },
  { key: "anno", labelKey: "anno" },
  { key: "anno_inizio", labelKey: "annoInizio" },
  { key: "laurea_anno", labelKey: "laureaAnno" },
];

async function missingHeaderFields(data: HeaderProseContent, transcriptSkipped: boolean): Promise<string[]> {
  const t = await getTranslations("OnboardingEngine");
  const missing = REQUIRED_HEADER_FIELDS.filter((f) => !data[f.key]).map((f) => t(`headerFields.${f.labelKey}`));
  if (!transcriptSkipped && data.media_voti == null) missing.push(t("headerFields.media"));
  return missing;
}

/** Campi richiesti perché l'Header sia completo. La media manca di senso se il libretto è stato saltato. */
async function isHeaderComplete(data: HeaderProseContent, transcriptSkipped: boolean): Promise<boolean> {
  return (await missingHeaderFields(data, transcriptSkipped)).length === 0;
}

async function joinMissing(fields: string[]): Promise<string> {
  const t = await getTranslations("OnboardingEngine");
  return fields.join(` ${t("andJoiner")} `);
}

// ---------------------------------------------------------------------------
// Conferma via chat (spec 1.4: "oppure in chat, dicendolo direttamente a MIRA")
// ---------------------------------------------------------------------------

/** Frasi inequivocabili di conferma — il fast path deterministico, nessuna chiamata AI. */
const CONFIRM_PATTERNS: RegExp[] = [
  /^ok(ay)?[\s!.]*$/i,
  /^va bene[\s!.]*$/i,
  /^va bene[\s,]+(cos[ìi]|per me).{0,25}$/i,
  /^(tutto )?(ok|a posto|perfetto)[\s!.]*$/i,
  /^confermo.{0,25}$/i,
  /^conferma(to)?[\s!.]*$/i,
  /^approvo.{0,15}$/i,
  /^approva(to)?[\s!.]*$/i,
  /^s[ìi][\s!.]*$/i,
  /^s[ìi],? (va bene|confermo|perfetto|ok).{0,20}$/i,
  /^direi di s[ìi][\s!.]*$/i,
  /^perfetto[\s!.]*$/i,
  /^andiamo( avanti| pure avanti)?[\s!.]*$/i,
  /^avanti( col prossimo( blocco)?)?[\s!.]*$/i,
  /^procedi(amo)?( pure)?[\s!.]*$/i,
  /^prossimo( blocco)?[\s!.]*$/i,
  /^(yes|yep|yeah|sure)[\s!.]*$/i,
  /^confirm(ed)?[\s!.]*$/i,
  /^(looks|all) good.{0,15}$/i,
  /^good[\s!.]*$/i,
  /^next( block)?[\s!.]*$/i,
  /^go ahead[\s!.]*$/i,
];

/**
 * Va chiamata SOLO quando il blocco davanti allo studente è in "draft" (bozza approvabile):
 * fuori da quel contesto "sì" o "va bene" sono spesso risposte contenutistiche, non conferme
 * (dubbio 8). Fast path deterministico sulle frasi tipiche; per i messaggi brevi ambigui
 * decide una mini-chiamata AI; i messaggi lunghi sono per definizione contenuto.
 */
async function isConfirmationMessage(message: string): Promise<boolean> {
  const norm = message.trim();
  if (norm.length <= 60 && CONFIRM_PATTERNS.some((p) => p.test(norm))) return true;
  if (norm.length > 120) return false;
  const result = await chatCompletion(
    [
      {
        role: "system",
        content: `Lo studente ha davanti una bozza di una sezione del suo profilo, da confermare. Giudica se il suo messaggio esprime SOLO l'intenzione di confermare/approvare la bozza così com'è e andare avanti (es. "per me è ok così", "direi che ci siamo"), oppure se contiene contenuto nuovo, modifiche, domande o dubbi. Rispondi SOLO in JSON: {"conferma":true|false}`,
      },
      { role: "user", content: norm },
    ],
    { temperature: 0, maxTokens: 40, jsonMode: true }
  );
  try {
    return (JSON.parse(result) as { conferma: boolean }).conferma === true;
  } catch {
    return false;
  }
}

/** Approvazione server-side identica a quella del bottone del pannello: idempotente
 * (ri-approvare un blocco già approvato riscrive solo status/approved_at, dubbio 9). */
async function approveBlocks(supabase: any, studentProfileId: string, blockTypes: CardBlockType[]) {
  const { error } = await (supabase.from("card_blocks") as any)
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("student_profile_id", studentProfileId)
    .in("block_type", blockTypes);
  if (error) throw error;
  revalidatePath("/student");
}

/** Percentuale sui 6 blocchi visibili della card (rework): header, esperienze,
 * disponibilita+piano (contano come UNO, completi solo insieme), competenze, lingue,
 * profilo personale (riga autodescrizione). "formazione" vive dentro Header e
 * "interessi" è legacy: nessuno dei due conta (dubbi 3 e 33). */
async function computeCardPct(supabase: any, studentProfileId: string): Promise<number> {
  const { data: rows } = await (supabase.from("card_blocks") as any)
    .select("block_type, status")
    .eq("student_profile_id", studentProfileId);
  const byType = new Map<string, string>((rows ?? []).map((r: any) => [r.block_type, r.status]));
  const singles = ["header", "esperienze", "competenze", "lingue", "autodescrizione"];
  let approved = singles.filter((bt) => byType.get(bt) === "approved").length;
  if (byType.get("disponibilita") === "approved" && byType.get("piano_carriera") === "approved") approved += 1;
  return Math.round((approved / 6) * 100);
}

export async function loadOnboardingState(): Promise<OnboardingState> {
  const { student, blocks } = await getOnboardingContext();

  const answers = student.onboarding_answers as Record<string, unknown> | null;
  const conversation = (answers?.conversation as ChatMessage[]) ?? [];
  const faseBConversation = (answers?.fase_b_conversation as ChatMessage[]) ?? [];
  const transcriptUploaded = !!student.transcript_uploaded;
  const cvUploaded = !!student.cv_uploaded;
  const skippedTranscript = conversation.some((m) => m.content === "[Libretto saltato]");
  const skippedCV = conversation.some((m) => m.content === "[CV saltato]");
  // Gate del rework: Fase A completa solo con disponibilita E piano_carriera approvati
  // insieme (blocco unico "Disponibilità e piano", dubbio 2). Un utente legacy fermo al
  // vecchio gate (disponibilita approvata, piano no) rientra in Fase A e riceve solo la
  // domanda sul piano — mai il replay dall'inizio.
  const faseAComplete = blocks.disponibilita.status === "approved" && blocks.piano_carriera.status === "approved";

  let phase: OnboardingPhase;

  if (!faseAComplete) {
    if (conversation.length === 0) {
      phase = "welcome";
    } else if (blocks.header.status !== "approved") {
      const livello = blocks.header.data.livello;
      const hasPreviousDegree = !!(student.availability as any)?.previous_degree?.university || !!blocks.header.data.formazione_precedente?.universita;
      if (!livello) {
        phase = "livello";
      } else if (livello === "magistrale" && !hasPreviousDegree) {
        phase = "previous_degree";
      } else if (!transcriptUploaded && !skippedTranscript) {
        phase = "transcript";
      } else {
        phase = "header_gap";
      }
    } else if (!cvUploaded && !skippedCV) {
      phase = "cv";
    } else if (blocks.esperienze.status !== "approved") {
      phase = "esperienze";
    } else {
      phase = "disponibilita";
    }
    return { conversation, phase, blocks, transcriptUploaded, cvUploaded, faseBStarted: false };
  }

  // Fase A già completa: deriva la fase B dai blocchi ancora non approvati.
  // "profilo_personale" vive sulla riga autodescrizione; interessi è legacy e non conta.
  if (blocks.competenze.status !== "approved") phase = "competenze";
  else if (blocks.lingue.status !== "approved") phase = "lingue";
  else if (blocks.autodescrizione.status !== "approved") phase = "profilo_personale";
  else phase = "chiusura";

  return {
    conversation: faseBConversation,
    phase,
    blocks,
    transcriptUploaded,
    cvUploaded,
    faseBStarted: faseBConversation.length > 0,
  };
}

export async function startOnboarding(firstName: string): Promise<{ message: string }> {
  const { supabase, profileId, blocks } = await getOnboardingContext();
  const t = await getTranslations("OnboardingEngine");

  const intro = t("introMessage", { firstName });

  // Il livello è obbligatorio in registrazione: il caso normale è la sola conferma.
  // La domanda aperta resta SOLO come fallback per profili legacy/incompleti senza
  // degree_level (dubbio 19) — mai nel percorso standard.
  const knownLivello = blocks.header.data.livello;
  const closing = knownLivello
    ? t("knownLivelloClosing", { livello: t(`livelloLabels.${knownLivello}`) })
    : t("livelloQuestionPlain");

  const message = `${intro}\n\n${closing}`;

  await saveConversation(supabase, profileId, [{ role: "assistant", content: message }]);
  return { message };
}

async function extractJSON(systemPrompt: string, userText: string): Promise<any> {
  const result = await chatCompletion(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userText },
    ],
    { temperature: 0.1, maxTokens: 400, jsonMode: true }
  );
  return JSON.parse(result);
}

/**
 * Quando l'estrazione non produce il dato richiesto, MIRA non deve ripetere la stessa
 * domanda a pappagallo né procedere in silenzio con un campo vuoto: deve reagire a quello
 * che lo studente ha effettivamente scritto (una domanda, un dubbio, una battuta, un
 * rifiuto...) e solo dopo tornare, con naturalezza, verso l'informazione necessaria.
 * Risponde sempre nella lingua del locale attivo (IT/EN), non in quella del messaggio dello
 * studente: la UI e la conversazione di MIRA seguono la stessa lingua, per coerenza.
 */
async function handleUnclearAnswer(userMessage: string, neededQuestion: string): Promise<string> {
  const locale = await getLocale();
  const languageInstruction = locale === "it" ? "Rispondi in italiano." : "Respond in English.";
  const result = await chatCompletion(
    [
      {
        role: "system",
        content: `Sei MIRA, un'assistente che sta aiutando uno studente a costruire il proprio profilo (MIRA card) attraverso una conversazione guidata. In questo momento la domanda a cui lo studente deve rispondere è: "${neededQuestion}". Il messaggio che ha scritto non è una risposta chiara a questa domanda.

Rispondi con naturalezza e brevità (massimo 3 frasi):
- Se è una domanda su di te o sul processo, rispondi alla domanda direttamente.
- Se è una critica, un dubbio o un rifiuto, riconoscilo con calma senza essere sulla difensiva, e spiega in una riga perché ti serve quell'informazione.
- Se è vago o vuoi solo un chiarimento, chiedi di specificare in modo mirato.
- Se contiene una sigla o abbreviazione che potrebbe essere la risposta (es. il nome di un corso come "CLEAM"), non trattarla come rumore: chiedi conferma in modo intelligente (es. "CLEAM è il tuo corso di laurea, giusto?").
- In tutti i casi, chiudi riproponendo la domanda originale (puoi riformularla, mai ripeterla identica parola per parola).

Non ignorare mai quello che lo studente ha scritto per ripetere la domanda come se non l'avessi letta. Tono diretto, umano, mai robotico. ${languageInstruction}`,
      },
      { role: "user", content: userMessage },
    ],
    { temperature: 0.4, maxTokens: 250 }
  );
  return result.trim();
}

/** La richiesta di caricare il libretto, con le istruzioni giuste per trovarlo:
 * per gli studenti Bocconi il percorso you@b, per gli altri una nota generica (spec Passo 4). */
async function transcriptAskMessage(student: any, blocks: OnboardingBlocksState, variant: "first" | "afterPreviousDegree"): Promise<string> {
  const t = await getTranslations("OnboardingEngine");
  const hint = isBocconiStudent(student, blocks) ? t("transcriptHintBocconi") : t("transcriptHintGeneric");
  return variant === "afterPreviousDegree"
    ? t("afterPreviousDegree", { hint })
    : t("afterLivelloOther", { hint });
}

export async function submitLivello(history: ChatMessage[], userMessage: string) {
  const { supabase, profileId, studentProfileId, student, blocks } = await getOnboardingContext();
  const conversation = [...history, { role: "user" as const, content: userMessage }];

  const t = await getTranslations("OnboardingEngine");
  const knownLivello = blocks.header.data.livello as string | null;
  const data = await extractJSON(
    knownLivello
      ? `Livello di studi già indicato in registrazione: "${knownLivello}". Se il messaggio lo conferma (es. "sì", "esatto", "confermo", "corretto"), usa questo valore. Se lo corregge esplicitamente con un livello diverso, usa quello nuovo. Estrai: {"degree_level":"triennale|magistrale|ciclo_unico"}. Se non è chiaro, null. Rispondi solo JSON.`
      : `Estrai il livello di studi dal messaggio: {"degree_level":"triennale|magistrale|ciclo_unico"}. Se non è chiaro, null. Rispondi solo JSON.`,
    userMessage
  );
  const livello = data.degree_level as string | null;

  let message: string;
  let phase: OnboardingPhase;

  if (!livello) {
    // Non scrive nulla: un campo vuoto non deve sovrascrivere un valore già noto (es. dalla
    // registrazione), e prima di tutto MIRA reagisce a quello che lo studente ha scritto
    // invece di ripetere la domanda come se non l'avesse letta.
    message = await handleUnclearAnswer(userMessage, t("livelloQuestionPlain"));
    phase = "livello";

    const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
    await saveConversation(supabase, profileId, fullConversation);
    return { message, phase, header: blocks.header };
  }

  const { data: updatedRows, error } = await (supabase.from("card_blocks") as any)
    .update({ prose_content: { ...blocks.header.data, livello } })
    .eq("student_profile_id", studentProfileId)
    .eq("block_type", "header")
    .select("id");
  if (error) {
    console.error("[MIRA] submitLivello card_blocks write failed:", error);
    throw new Error(t("errorSaveLivello"));
  }
  if (!updatedRows || updatedRows.length === 0) {
    console.error("[MIRA] submitLivello: 0 righe aggiornate per studentProfileId", studentProfileId);
    throw new Error(t("errorHeaderRowNotFound"));
  }

  // LEGACY-WRITE(card-rework): rimuovere in Step 5/6.
  await (supabase.from("student_profiles") as any).update({ degree_level: livello }).eq("id", studentProfileId);

  if (livello === "magistrale") {
    message = t("afterLivelloMagistrale");
    phase = "previous_degree";
  } else {
    message = await transcriptAskMessage(student, blocks, "first");
    phase = "transcript";
  }

  const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
  await saveConversation(supabase, profileId, fullConversation);

  return { message, phase, header: { status: "empty" as CardBlockStatus, data: { ...blocks.header.data, livello } } };
}

export async function submitPreviousDegree(history: ChatMessage[], userMessage: string) {
  const { supabase, profileId, studentProfileId, student, blocks } = await getOnboardingContext();
  const t = await getTranslations("OnboardingEngine");
  const conversation = [...history, { role: "user" as const, content: userMessage }];

  const data = await extractJSON(
    `Estrai dal messaggio: {"universita":"università triennale","corso":"corso triennale","voto_laurea":"voto di laurea","tema_tesi":"tema tesi, o null"}. Se un campo non emerge, null. Rispondi solo JSON.`,
    userMessage
  );

  if (!data.universita && !data.corso && !data.voto_laurea) {
    const message = await handleUnclearAnswer(userMessage, t("previousDegreeQuestion"));
    const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
    await saveConversation(supabase, profileId, fullConversation);
    return { message, phase: "previous_degree" as OnboardingPhase, header: blocks.header };
  }

  const headerData: HeaderProseContent = {
    ...blocks.header.data,
    formazione_precedente: {
      universita: data.universita || null,
      corso: data.corso || null,
      voto_laurea: data.voto_laurea || null,
      tema_tesi: data.tema_tesi || null,
    },
  };

  const { data: updatedRows, error } = await (supabase.from("card_blocks") as any)
    .update({ prose_content: headerData })
    .eq("student_profile_id", studentProfileId)
    .eq("block_type", "header")
    .select("id");
  if (error) {
    console.error("[MIRA] submitPreviousDegree card_blocks write failed:", error);
    throw new Error(t("errorSavePreviousDegree"));
  }
  if (!updatedRows || updatedRows.length === 0) {
    console.error("[MIRA] submitPreviousDegree: 0 righe aggiornate per studentProfileId", studentProfileId);
    throw new Error(t("errorHeaderRowNotFound"));
  }

  const message = await transcriptAskMessage(student, blocks, "afterPreviousDegree");
  const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
  await saveConversation(supabase, profileId, fullConversation);

  return { message, phase: "transcript" as OnboardingPhase, header: { status: "empty" as CardBlockStatus, data: headerData } };
}

export async function skipTranscript(history: ChatMessage[]) {
  const { supabase, profileId, blocks } = await getOnboardingContext();
  const t = await getTranslations("OnboardingEngine");
  const message = t("skipTranscriptMessage");
  const fullConversation: ChatMessage[] = [
    ...history,
    { role: "user", content: "[Libretto saltato]" },
    { role: "assistant", content: message },
  ];
  await saveConversation(supabase, profileId, fullConversation);
  return { message, phase: "header_gap" as OnboardingPhase, header: blocks.header };
}

export async function reactToTranscript(
  history: ChatMessage[],
  stats: { coursesCount: number; totalCredits: number; weightedAverage: number | null }
) {
  const { supabase, profileId, blocks } = await getOnboardingContext();
  const t = await getTranslations("OnboardingEngine");
  const avgText = stats.weightedAverage ? t("avgSuffix", { avg: stats.weightedAverage.toFixed(1) }) : "";
  const missing = await missingHeaderFields(blocks.header.data, false);

  const message = missing.length > 0
    ? t("transcriptDoneWithMissing", { courses: stats.coursesCount, credits: stats.totalCredits, avg: avgText, missing: await joinMissing(missing) })
    : t("transcriptDoneComplete", { courses: stats.coursesCount, credits: stats.totalCredits, avg: avgText });

  const fullConversation = [...history, { role: "assistant" as const, content: message }];
  await saveConversation(supabase, profileId, fullConversation);
  return { message, phase: "header_gap" as OnboardingPhase, header: blocks.header, formazione: blocks.formazione };
}

export async function submitHeaderGap(history: ChatMessage[], userMessage: string) {
  const { supabase, profileId, studentProfileId, blocks } = await getOnboardingContext();
  const t = await getTranslations("OnboardingEngine");
  const conversation = [...history, { role: "user" as const, content: userMessage }];
  const transcriptSkipped = conversation.some((m) => m.content === "[Libretto saltato]");

  // Header già in bozza completa: un messaggio di pura conferma approva il blocco da chat,
  // esattamente come il bottone del pannello (spec 1.4).
  if (blocks.header.status === "draft" && (await isConfirmationMessage(userMessage))) {
    await approveBlocks(supabase, studentProfileId, ["header", "formazione"]);
    const message = t("afterHeaderApproved");
    const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
    await saveConversation(supabase, profileId, fullConversation);
    return {
      message,
      phase: "cv" as OnboardingPhase,
      header: { ...blocks.header, status: "approved" as CardBlockStatus },
      approvedBlocks: ["header", "formazione"] as CardBlockType[],
    };
  }

  const data = await extractJSON(
    `Estrai dal messaggio ciò che manca sul percorso accademico: {"universita":"nome università, o null","corso":"nome corso, o null","livello":"triennale|magistrale|ciclo_unico, o null","anno":0,"anno_inizio":"anno di immatricolazione a questo corso, es. 2023, o null","laurea_anno":"anno di laurea previsto, es. 2026, o null"}. IMPORTANTE: una sigla breve (3-6 lettere, es. "CLEAM", "BIEM", "CLEF", "BIG", "BESS", "CLEACC", "WBB") in risposta alla domanda sul corso è quasi certamente il NOME DEL CORSO: accettala come "corso" (in maiuscolo), non scartarla come rumore. Se un campo non emerge, null. Rispondi solo JSON.`,
    userMessage
  );

  const nothingNew = !data.universita && !data.corso && !data.livello && !data.anno && !data.anno_inizio && !data.laurea_anno;
  if (nothingNew) {
    const missing = await missingHeaderFields(blocks.header.data, transcriptSkipped);
    const message = await handleUnclearAnswer(userMessage, t("headerGapQuestion", { missing: await joinMissing(missing) }));
    const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
    await saveConversation(supabase, profileId, fullConversation);
    return { message, phase: "header_gap" as OnboardingPhase, header: blocks.header };
  }

  const headerData: HeaderProseContent = {
    ...blocks.header.data,
    universita: blocks.header.data.universita || data.universita || null,
    corso: blocks.header.data.corso || data.corso || null,
    livello: blocks.header.data.livello || data.livello || null,
    anno: blocks.header.data.anno || data.anno || null,
    anno_inizio: blocks.header.data.anno_inizio || data.anno_inizio || null,
    laurea_anno: blocks.header.data.laurea_anno || data.laurea_anno || null,
  };

  // LEGACY-WRITE(card-rework): rimuovere in Step 5/6.
  const { error: legacyError } = await (supabase.from("student_profiles") as any)
    .update({ degree_program: headerData.corso, current_year: headerData.anno, graduation_year: headerData.laurea_anno })
    .eq("id", studentProfileId);
  if (legacyError) console.error("[MIRA] submitHeaderGap legacy student_profiles write failed:", legacyError);

  const complete = await isHeaderComplete(headerData, transcriptSkipped);

  const { data: updatedRows, error } = await (supabase.from("card_blocks") as any)
    .update({ prose_content: headerData, status: complete ? "draft" : "empty" })
    .eq("student_profile_id", studentProfileId)
    .eq("block_type", "header")
    .select("id");
  if (error) {
    console.error("[MIRA] submitHeaderGap card_blocks write failed:", error);
    throw new Error(t("errorSaveHeader"));
  }
  if (!updatedRows || updatedRows.length === 0) {
    console.error("[MIRA] submitHeaderGap: 0 righe aggiornate per studentProfileId", studentProfileId);
    throw new Error(t("errorHeaderRowNotFound"));
  }

  const message = complete
    ? t("headerGapComplete")
    : t("headerGapIncomplete", { missing: await joinMissing(await missingHeaderFields(headerData, transcriptSkipped)) });

  const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
  await saveConversation(supabase, profileId, fullConversation);

  return {
    message,
    phase: "header_gap" as OnboardingPhase,
    header: { status: (complete ? "draft" : "empty") as CardBlockStatus, data: headerData },
  };
}

/** Chiamata dal pannello dopo che l'Header è stato approvato lì — decide solo la prossima domanda. */
export async function afterHeaderApproved(history: ChatMessage[]) {
  const { supabase, profileId } = await getOnboardingContext();
  const t = await getTranslations("OnboardingEngine");
  const message = t("afterHeaderApproved");
  const fullConversation = [...history, { role: "assistant" as const, content: message }];
  await saveConversation(supabase, profileId, fullConversation);
  revalidatePath("/student/onboarding");
  return { message, phase: "cv" as OnboardingPhase };
}

async function getHiddenExperienceQuestion(): Promise<string> {
  const t = await getTranslations("OnboardingEngine");
  return t("hiddenExperienceQuestion");
}
const DETAILED_DESCRIPTION_THRESHOLD = 60;

export async function skipCV(history: ChatMessage[]) {
  const { supabase, profileId } = await getOnboardingContext();
  const t = await getTranslations("OnboardingEngine");
  const message = t("skipCVMessage", { hiddenExperienceQuestion: await getHiddenExperienceQuestion() });
  const fullConversation: ChatMessage[] = [
    ...history,
    { role: "user", content: "[CV saltato]" },
    { role: "assistant", content: message },
  ];
  await saveConversation(supabase, profileId, fullConversation);
  return { message, phase: "esperienze" as OnboardingPhase, totalExperienceQuestions: 1 };
}

export async function reactToCV(history: ChatMessage[]) {
  const { supabase, profileId, student } = await getOnboardingContext();
  const t = await getTranslations("OnboardingEngine");
  const cv = student.cv_summary as { experiences?: Array<{ title: string; organization: string; description: string }> } | null;
  const experiences = cv?.experiences ?? [];
  const first = experiences[0];

  let message: string;
  if (!first) {
    message = await getHiddenExperienceQuestion();
  } else if (first.description && first.description.length >= DETAILED_DESCRIPTION_THRESHOLD) {
    // Il CV descrive già bene questa esperienza: la propongo com'è invece di chiedere da zero
    // (nessuna domanda ridondante, dubbio 37). Non citiamo la descrizione in chat: è sempre in
    // inglese per design (card content), e mostrarla mischierebbe inglese e italiano.
    message = t("cvItemGood", { title: first.title, org: first.organization });
  } else if (experiences.length === 1) {
    message = t("cvFoundOne", { title: first.title, org: first.organization });
  } else {
    message = t("cvFoundMany", { count: experiences.length, title: first.title, org: first.organization });
  }

  const fullConversation = [...history, { role: "assistant" as const, content: message }];
  await saveConversation(supabase, profileId, fullConversation);
  return { message, phase: "esperienze" as OnboardingPhase, totalExperienceQuestions: experiences.length + 1 };
}

export async function submitEsperienzaRisposta(
  history: ChatMessage[],
  userMessage: string,
  subIndex: number,
  totalSubQuestions: number
) {
  const { supabase, profileId, studentProfileId, student, blocks } = await getOnboardingContext();
  const t = await getTranslations("OnboardingEngine");
  const locale = await getLocale();
  const conversation = [...history, { role: "user" as const, content: userMessage }];
  const isLast = subIndex + 1 >= totalSubQuestions;

  // Blocco già in bozza (sequenza conclusa in un turno precedente): una pura conferma
  // in chat approva Esperienze e apre la fase "Disponibilità e piano".
  if (blocks.esperienze.status === "draft" && (await isConfirmationMessage(userMessage))) {
    await approveBlocks(supabase, studentProfileId, ["esperienze"]);
    const message = t("afterEsperienzeApproved");
    const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
    await saveConversation(supabase, profileId, fullConversation);
    return {
      message,
      phase: "disponibilita" as OnboardingPhase,
      done: true,
      approvedBlocks: ["esperienze"] as CardBlockType[],
    };
  }

  if (!isLast) {
    const cv = student.cv_summary as { experiences?: Array<{ title: string; organization: string; description: string }> } | null;
    const experiences = cv?.experiences ?? [];
    const next = experiences[subIndex + 1];

    let nextQuestion: string;
    if (!next) {
      nextQuestion = await getHiddenExperienceQuestion();
    } else if (next.description && next.description.length >= DETAILED_DESCRIPTION_THRESHOLD) {
      nextQuestion = t("cvItemGood", { title: next.title, org: next.organization });
    } else {
      nextQuestion = t("cvNextPlain", { title: next.title, org: next.organization });
    }

    // Prima giudica se lo studente vuole FERMARSI con le domande su altre esperienze (es. "basta
    // con le esperienze", "andiamo avanti") invece di trattare sempre il messaggio come una risposta
    // nel merito — senza questo controllo MIRA ignorava la richiesta e chiedeva comunque la prossima
    // esperienza del CV. Un'unica chiamata AI decide ed eventualmente scrive già la reazione, così non
    // raddoppia le chiamate rispetto a prima. Risponde nella lingua del locale attivo.
    const languageInstruction = locale === "it" ? "Rispondi in italiano." : "Respond in English.";
    const combined = await chatCompletion(
      [
        {
          role: "system",
          content: `Lo studente sta rispondendo a domande su esperienze diverse, una alla volta, durante l'onboarding. Giudica prima di tutto: il suo messaggio esprime la volontà di FERMARSI/SALTARE le prossime domande su altre esperienze (es. "basta con le esperienze", "andiamo avanti", "salta pure", "non ho altro da aggiungere") oppure è una risposta normale nel merito?

Se vuole fermarsi: "stop":true, "message":null.
Se è una risposta normale: "stop":false, e scrivi in "message" UNA riga breve che reagisca concretamente a quello che ha detto (fatti, non entusiasmo generico tipo "fantastico!"), poi a capo la prossima domanda esatta che ti viene data.

Rispondi SOLO in JSON: {"stop":true|false,"message":"..."|null}. ${languageInstruction}`,
        },
        { role: "user", content: `Risposta studente: "${userMessage}"\n\nProssimo messaggio da porre se non si ferma: "${nextQuestion}"` },
      ],
      { temperature: 0.4, maxTokens: 250, jsonMode: true }
    );
    const { stop, message: continueMessage } = JSON.parse(combined) as { stop: boolean; message: string | null };

    if (!stop) {
      const message = continueMessage?.trim() || nextQuestion;
      const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
      await saveConversation(supabase, profileId, fullConversation);
      return { message, phase: "esperienze" as OnboardingPhase, done: false };
    }
    // Altrimenti prosegue sotto: chiude la fase esperienze in anticipo, come se fosse l'ultima risposta.
  }

  // Ultima risposta (o richiesta di fermarsi in anticipo): prima di scrivere in card, giudica se
  // lo studente ha davvero risposto nel merito (racconta un'esperienza, o dice chiaramente di non
  // avere altro da aggiungere) oppure no (una domanda, un dubbio, confusione tipo "non ho capito").
  // Senza questo controllo il blocco veniva chiuso con dati vuoti/a caso e MIRA ripeteva sempre lo
  // stesso messaggio di chiusura, ignorando cosa lo studente aveva effettivamente scritto.
  const recentText = conversation
    .slice(-2 * totalSubQuestions - 2)
    .map((m) => `${m.role === "user" ? "Studente" : "MIRA"}: ${m.content}`)
    .join("\n");

  const extracted = await chatCompletion(
    [
      {
        role: "system",
        content: `Dalla conversazione, giudica prima se lo studente ha risposto nel merito alla domanda sulle esperienze: ha raccontato fatti concreti su un'esperienza, oppure ha detto chiaramente di non avere altro da aggiungere/vuole fermarsi qui. Se invece il suo ultimo messaggio è una domanda, un dubbio, confusione (es. "non ho capito") o qualcosa di scollegato dalla domanda, NON ha risposto nel merito.

Se ha risposto nel merito: "risposta_valida":true, ed estrai in "items" le esperienze raccontate (array vuoto se ha detto di non avere altro da aggiungere). Vale ogni tipo di esperienza: lavorativa, extracurricolare, associativa, sportiva, progettuale o personale. Per ognuna scrivi una descrizione di 2-3 righe di cosa ha fatto concretamente — fatti, non aggettivi di carattere. STILE OBBLIGATORIO: come un CV professionale — frasi che iniziano direttamente con un verbo al passato, senza soggetto (es. "Built a...", "Led a team of...", "Analyzed..."), MAI "I built..." né "He/she built...". La MIRA card è sempre in inglese: scrivi "titolo" e "descrizione" in inglese anche se la conversazione è in italiano (non tradurre invece "organizzazione" se è un nome proprio, es. il nome di un'azienda).

Se NON ha risposto nel merito: "risposta_valida":false, "items":[].

Rispondi SOLO in JSON: {"risposta_valida":true|false,"items":[{"titolo":"","organizzazione":"","periodo":"","descrizione":""}]}`,
      },
      { role: "user", content: recentText },
    ],
    { temperature: 0.2, maxTokens: 800, jsonMode: true }
  );

  const parsed = JSON.parse(extracted);

  if (parsed.risposta_valida === false) {
    const message = await handleUnclearAnswer(userMessage, await getHiddenExperienceQuestion());
    const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
    await saveConversation(supabase, profileId, fullConversation);
    return { message, phase: "esperienze" as OnboardingPhase, done: false };
  }

  const items: EsperienzaItem[] = (parsed.items ?? []).map((it: any) => ({
    id: crypto.randomUUID(),
    titolo: it.titolo ?? "",
    ruolo: "",
    organizzazione: it.organizzazione ?? "",
    periodo: it.periodo ?? "",
    descrizione: it.descrizione ?? "",
    verified: false,
    origin: "onboarding",
  }));

  await (supabase.from("card_blocks") as any)
    .update({ prose_content: { items }, status: "draft" })
    .eq("student_profile_id", studentProfileId)
    .eq("block_type", "esperienze");

  // LEGACY-WRITE(card-rework): rimuovere in Step 5/6.
  const { data: current } = await (supabase.from("student_profiles") as any)
    .select("experiences")
    .eq("id", studentProfileId)
    .single();
  const mergedExperiences = [
    ...((current?.experiences as string[]) ?? []),
    ...items.map((it) => it.descrizione).filter(Boolean),
  ];
  await (supabase.from("student_profiles") as any)
    .update({ experiences: mergedExperiences })
    .eq("id", studentProfileId);

  const message = t("esperienzeDone");
  const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
  await saveConversation(supabase, profileId, fullConversation);

  return { message, phase: "esperienze" as OnboardingPhase, done: true, items };
}

/** Chiamata dal pannello dopo che Esperienze è stato approvato lì: apre "Disponibilità e piano". */
export async function afterEsperienzeApproved(history: ChatMessage[]) {
  const { supabase, profileId } = await getOnboardingContext();
  const t = await getTranslations("OnboardingEngine");
  const message = t("afterEsperienzeApproved");
  const fullConversation = [...history, { role: "assistant" as const, content: message }];
  await saveConversation(supabase, profileId, fullConversation);
  return { message, phase: "disponibilita" as OnboardingPhase };
}

// ---------------------------------------------------------------------------
// Fase A — "Disponibilità e piano" (spec 1.4 Passo 8): un unico blocco in
// sotto-passi dedotti dai DATI, mai da un contatore lato client (dubbio 10):
//   1. attiva == null              → il messaggio risponde a "Sei alla ricerca...?"
//   2. attiva true, dettagli vuoti → il messaggio risponde alla domanda sui dettagli
//   3. piano vuoto                 → il messaggio risponde alla domanda su piano/direzione
//   4. entrambe le righe in draft  → conferma via chat, oppure modifica libera
// ---------------------------------------------------------------------------

async function pianoQuestion(afterNo: boolean): Promise<string> {
  const t = await getTranslations("OnboardingEngine");
  return afterNo ? t("pianoQuestionAfterNo") : t("pianoQuestion");
}

async function writeDisponibilita(supabase: any, studentProfileId: string, data: DisponibilitaProseContent, status: CardBlockStatus) {
  const { error } = await (supabase.from("card_blocks") as any)
    .update({ prose_content: data, status })
    .eq("student_profile_id", studentProfileId)
    .eq("block_type", "disponibilita");
  if (error) throw error;
}

/** Il gate: onboarding_completed + percentuale sui 6 blocchi. Chiamato quando
 * disponibilita + piano_carriera sono state appena approvate (pannello o chat). */
async function completeGate(supabase: any, profileId: string, studentProfileId: string, conversation: ChatMessage[]) {
  const t = await getTranslations("OnboardingEngine");

  await (supabase.from("student_profiles") as any)
    .update({ onboarding_completed: true, onboarding_completed_at: new Date().toISOString() })
    .eq("id", studentProfileId);

  const pct = await computeCardPct(supabase, studentProfileId);
  const message = t("afterDisponibilitaApproved", { pct });
  const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
  await saveConversation(supabase, profileId, fullConversation);

  revalidatePath("/student");

  return { message, phase: "gate" as OnboardingPhase, progressPct: pct };
}

export async function submitDisponibilita(history: ChatMessage[], userMessage: string) {
  const { supabase, profileId, studentProfileId, student, blocks } = await getOnboardingContext();
  const t = await getTranslations("OnboardingEngine");
  const conversation = [...history, { role: "user" as const, content: userMessage }];
  const answers = (student.onboarding_answers as Record<string, unknown>) ?? {};

  const disp = blocks.disponibilita.data;
  const piano = blocks.piano_carriera.data;
  const bothDraft = blocks.disponibilita.status === "draft" && blocks.piano_carriera.status === "draft";

  // Sotto-passo 4: bozza completa davanti — pura conferma in chat = gate; altrimenti modifica libera.
  if (bothDraft) {
    if (await isConfirmationMessage(userMessage)) {
      await approveBlocks(supabase, studentProfileId, ["disponibilita", "piano_carriera"]);
      const gate = await completeGate(supabase, profileId, studentProfileId, conversation);
      return { ...gate, approvedBlocks: ["disponibilita", "piano_carriera"] as CardBlockType[] };
    }

    // Modifica libera: aggiorna in un colpo solo disponibilità e/o piano da quello che scrive.
    const data = await extractJSON(
      `Lo studente sta correggendo la bozza del blocco "Disponibilità e piano" della sua card. Bozza attuale: disponibilità ${JSON.stringify(disp)}; piano ${JSON.stringify({ stato: piano.stato, testo: piano.testo })}. Dal messaggio estrai SOLO i campi che vuole cambiare o aggiungere: {"attiva":true|false|null,"cosa_cerca":"","ambito":"","periodo":"","durata":"","dove":"","piano_testo":"","piano_stato":"direzione_chiara|ipotesi|esplorazione|null"}. Campi non toccati dal messaggio: null o stringa vuota. La MIRA card è sempre in inglese: scrivi i valori testuali in inglese anche se il messaggio è in italiano. Rispondi solo JSON.`,
      userMessage
    );

    const nothing = data.attiva == null && !data.cosa_cerca && !data.ambito && !data.periodo && !data.durata && !data.dove && !data.piano_testo && !data.piano_stato;
    if (nothing) {
      const message = await handleUnclearAnswer(userMessage, t("disponibilitaEditQuestion"));
      const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
      await saveConversation(supabase, profileId, fullConversation);
      return { message, phase: "disponibilita" as OnboardingPhase };
    }

    const nextDisp: DisponibilitaProseContent = {
      attiva: data.attiva ?? disp.attiva ?? null,
      cosa_cerca: data.cosa_cerca || disp.cosa_cerca,
      ambito: data.ambito || disp.ambito,
      periodo: data.periodo || disp.periodo,
      durata: data.durata || disp.durata || null,
      dove: data.dove || disp.dove,
    };
    await writeDisponibilita(supabase, studentProfileId, nextDisp, "draft");
    if (data.piano_testo || data.piano_stato) {
      const nextPiano: PianoCarrieraProseContent = {
        stato: (data.piano_stato as PianoCarrieraStato) || piano.stato || "esplorazione",
        testo: data.piano_testo || piano.testo,
      };
      await (supabase.from("card_blocks") as any)
        .update({ prose_content: nextPiano, status: "draft" })
        .eq("student_profile_id", studentProfileId)
        .eq("block_type", "piano_carriera");
    }

    const message = t("disponibilitaUpdated");
    const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
    await saveConversation(supabase, profileId, fullConversation);
    return { message, phase: "disponibilita" as OnboardingPhase };
  }

  // Sotto-passo 1: "Sei alla ricerca di un lavoro o aperto a future opportunità?"
  if (disp.attiva == null) {
    const data = await extractJSON(
      `Lo studente risponde alla domanda: "Sei alla ricerca di un lavoro o aperto a future opportunità?". Estrai: {"attiva":true|false|null,"cosa_cerca":"","ambito":"","periodo":"","durata":"","dove":"","motivo":""}. "attiva" true se è in cerca o aperto a opportunità, false se dice chiaramente di NON essere in cerca / già impegnato, null se il messaggio non risponde alla domanda. Se nel messaggio dà già dettagli (tipo di esperienza, ambito, quando, per quanto tempo, dove) estraili in modo opportunistico. Se non è in cerca ed emerge un motivo (es. "già impegnato fino a dicembre"), scrivilo in "motivo". La MIRA card è sempre in inglese: scrivi i valori testuali in inglese anche se il messaggio è in italiano. Rispondi solo JSON.`,
      userMessage
    );

    if (data.attiva == null) {
      const message = await handleUnclearAnswer(userMessage, t("afterEsperienzeApproved"));
      const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
      await saveConversation(supabase, profileId, fullConversation);
      return { message, phase: "disponibilita" as OnboardingPhase };
    }

    const attiva = data.attiva === true;
    const nextDisp: DisponibilitaProseContent = {
      attiva,
      cosa_cerca: attiva ? data.cosa_cerca || null : null,
      ambito: attiva ? data.ambito || null : null,
      // Per chi non è in cerca, il "quando/stato" ospita solo l'eventuale motivo (es. "already
      // busy until December") — lo stato è il campo strutturato `attiva`, mai un tag testuale
      // duplicato tipo "not looking / not looking" (dubbi 11-12).
      periodo: attiva ? data.periodo || null : data.motivo || null,
      durata: attiva ? data.durata || null : null,
      dove: attiva ? data.dove || null : null,
    };
    await writeDisponibilita(supabase, studentProfileId, nextDisp, "empty");

    // LEGACY-WRITE(card-rework): rimuovere in Step 5/6.
    const existingAvail = (student.availability as Record<string, unknown>) ?? {};
    await (supabase.from("student_profiles") as any)
      .update({ availability: { ...existingAvail, active: attiva, status: nextDisp.cosa_cerca, type: nextDisp.cosa_cerca, period: nextDisp.periodo, city: nextDisp.dove } })
      .eq("id", studentProfileId);

    // Se in cerca ma senza dettagli → domanda dettagli; se ha già dato tutto (o non è in cerca) → domanda piano.
    // Il flag persistente evita che una risposta ai dettagli lasciata a metà (es. solo l'ambito)
    // faccia scambiare il messaggio successivo — la risposta sul piano — per altri dettagli.
    const hasDetails = !!(nextDisp.cosa_cerca && nextDisp.periodo);
    await saveAnswersFlags(supabase, profileId, { disponibilita_details_done: !attiva || hasDetails });
    const message = attiva && !hasDetails
      ? t("disponibilitaDetailsQuestion")
      : await pianoQuestion(!attiva);
    const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
    await saveConversation(supabase, profileId, fullConversation);
    return { message, phase: "disponibilita" as OnboardingPhase };
  }

  // Sotto-passo 2: dettagli della ricerca (solo per chi è in cerca e non ha ancora risposto
  // alla domanda sui dettagli — flag persistente, non deduzione dai campi parziali).
  const detailsMissing = disp.attiva === true && !answers.disponibilita_details_done;
  if (detailsMissing) {
    const data = await extractJSON(
      `Lo studente risponde alla domanda: "Che tipo di esperienza cerchi, in che ambito, da quando, per quanto tempo e dove?". Estrai: {"cosa_cerca":"tipo di opportunità: internship|part-time|project|association experience|professional experience...","ambito":"settore o ruolo","periodo":"da quando: data aperta o intervallo","durata":"per quanto tempo","dove":"sede o preferenze"}. Se un campo non emerge, stringa vuota. La MIRA card è sempre in inglese: scrivi ogni campo in inglese anche se il messaggio è in italiano. Rispondi solo JSON.`,
      userMessage
    );

    if (!data.cosa_cerca && !data.ambito && !data.periodo) {
      const message = await handleUnclearAnswer(userMessage, t("disponibilitaDetailsQuestion"));
      const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
      await saveConversation(supabase, profileId, fullConversation);
      return { message, phase: "disponibilita" as OnboardingPhase };
    }

    const nextDisp: DisponibilitaProseContent = {
      ...disp,
      cosa_cerca: data.cosa_cerca || disp.cosa_cerca,
      ambito: data.ambito || disp.ambito,
      periodo: data.periodo || disp.periodo,
      durata: data.durata || disp.durata || null,
      dove: data.dove || disp.dove,
    };
    await writeDisponibilita(supabase, studentProfileId, nextDisp, "empty");
    await saveAnswersFlags(supabase, profileId, { disponibilita_details_done: true });

    // LEGACY-WRITE(card-rework): rimuovere in Step 5/6.
    const existingAvail = (student.availability as Record<string, unknown>) ?? {};
    await (supabase.from("student_profiles") as any)
      .update({ availability: { ...existingAvail, active: true, status: nextDisp.cosa_cerca, type: nextDisp.cosa_cerca, period: nextDisp.periodo, city: nextDisp.dove } })
      .eq("id", studentProfileId);

    const message = await pianoQuestion(false);
    const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
    await saveConversation(supabase, profileId, fullConversation);
    return { message, phase: "disponibilita" as OnboardingPhase };
  }

  // Sotto-passo 3: piano e direzione (a tutti — anche a chi non è in cerca).
  const data = await extractJSON(
    `Lo studente risponde a due domande: cosa ha in programma per i prossimi mesi/anni (es. exchange, laurea, magistrale, lavoro, certificazioni, progetti) e se ha una direzione di carriera precisa o sta ancora esplorando. Giudica prima se risponde nel merito — anche "non ho ancora idea" o una risposta vaga è valida (stato esplorazione). Se invece è una domanda, un dubbio o confusione che non risponde, non è valida.

Se valida: "risposta_valida":true, "stato":"direzione_chiara|ipotesi|esplorazione", "testo":"". "stato" è direzione_chiara SOLO se indica un settore/ruolo definito in modo esplicito e sicuro; ipotesi se menziona 2-3 direzioni in valutazione; esplorazione se non ha ancora idea o è vago. Non forzare mai direzione_chiara per default — "stato" è un dato solo interno, non va mai citato dentro "testo". "testo" riassume in modo breve e onesto piani e direzione, in PRIMA PERSONA, e va scritto in inglese anche se il messaggio è in italiano — la MIRA card è sempre in inglese.

Se NON valida: "risposta_valida":false, "stato":null, "testo":null.

Rispondi solo JSON: {"risposta_valida":true|false,"stato":"direzione_chiara|ipotesi|esplorazione"|null,"testo":"..."|null}`,
    userMessage
  );

  if (data.risposta_valida === false) {
    const message = await handleUnclearAnswer(userMessage, await pianoQuestion(disp.attiva === false));
    const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
    await saveConversation(supabase, profileId, fullConversation);
    return { message, phase: "disponibilita" as OnboardingPhase };
  }

  const stato: PianoCarrieraStato =
    data.stato === "direzione_chiara" || data.stato === "ipotesi" ? data.stato : "esplorazione";
  const pianoData: PianoCarrieraProseContent = { stato, testo: data.testo || userMessage };

  await (supabase.from("card_blocks") as any)
    .update({ prose_content: pianoData, status: "draft" })
    .eq("student_profile_id", studentProfileId)
    .eq("block_type", "piano_carriera");
  await writeDisponibilita(supabase, studentProfileId, disp, "draft");

  // LEGACY-WRITE(card-rework): rimuovere in Step 5/6.
  const existingAvail = (student.availability as Record<string, unknown>) ?? {};
  const cp = (existingAvail.career_plan as Record<string, unknown>) ?? {};
  await (supabase.from("student_profiles") as any)
    .update({
      goals: [...((student.goals as string[]) ?? []), pianoData.testo].filter(Boolean),
      availability: { ...existingAvail, career_plan: { ...cp, short_term: pianoData.testo, clarity_level: stato } },
    })
    .eq("id", studentProfileId);

  const message = t("disponibilitaEPianoDone");
  const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
  await saveConversation(supabase, profileId, fullConversation);

  return {
    message,
    phase: "disponibilita" as OnboardingPhase,
    disponibilita: { status: "draft" as CardBlockStatus, data: disp },
    piano_carriera: { status: "draft" as CardBlockStatus, data: pianoData },
  };
}

/** Chiamata dal pannello dopo la conferma congiunta di "Disponibilità e piano": apre il gate. */
export async function afterDisponibilitaApproved(history: ChatMessage[]) {
  const { supabase, profileId, studentProfileId } = await getOnboardingContext();
  return completeGate(supabase, profileId, studentProfileId, history);
}

// ---------------------------------------------------------------------------
// Fase B (spec 1.4): competenze (academic → hard, niente quiz soft skill),
// lingue (con dedup CV/chat), profilo personale (interessi + autodescrizione
// uniti, UNA domanda, nessun rilancio), chiusura.
// ---------------------------------------------------------------------------

/** Cluster gli esami per area tematica e propone una academic skill per area dove lo studente
 * è andato bene — scala con le aree (poche), non con il numero di esami. */
const ACADEMIC_SKILLS_PATTERN_PROMPT = `Ti do la lista di tutti gli esami sostenuti con il voto. Raggruppa gli esami per area tematica affine (es. quantitativo/statistica, finance, diritto, marketing, informatica...) e proponi UNA competenza accademica per ciascuna area in cui lo studente è andato bene (voti alti, o comunque un pattern chiaro rispetto alla sua media) — non una per ogni singolo esame, e non per aree con pochi esami o voti medio-bassi.

Ogni competenza ha un'evidenza BREVE: il nome dell'area tematica (es. "Quantitative finance"), MAI un elenco di esami o il testo completo. Vietati aggettivi vaghi tipo "conoscenza della materia" — sii specifico (es. "Corporate valuation techniques", non "financial knowledge"). La MIRA card è sempre in inglese: scrivi "testo" ed "evidenza_ref" in inglese anche se i nomi degli esami sono in italiano. Rispondi SOLO in JSON: {"items":[{"testo":"","evidenza_ref":""}]}`;

/** Academic skill dichiarate in chat (libretto assente, saltato o senza esami utili — spec Fase B
 * Passo 1): l'evidenza NON è più obbligatoria (dubbi 5-6). Se lo studente cita un esame/area, va
 * in evidenza; altrimenti null. Mai inventare contenuti non detti. */
const ACADEMIC_SKILLS_FREEFORM_PROMPT = `Lo studente sta elencando le competenze teoriche/accademiche che sente di aver acquisito (es. financial statement analysis, accounting, corporate finance, statistics, economics, marketing, law, data analysis) ed eventualmente gli esami o le materie in cui è andato meglio. Giudica prima se il messaggio risponde nel merito — anche una lista secca va bene. Se invece è una domanda, un dubbio o confusione, non è valida.

Se valida: "risposta_valida":true, ed estrai in "items" le competenze accademiche menzionate. Se cita un esame/materia collegata, mettila in "evidenza_ref" (breve); altrimenti "evidenza_ref":null — l'evidenza NON è obbligatoria. Mai inventare competenze non dette. STILE: voce di CV, breve, senza soggetto (es. "Financial statement analysis"). La MIRA card è sempre in inglese: scrivi "testo" ed "evidenza_ref" in inglese anche se il messaggio è in italiano.

Se NON valida: "risposta_valida":false, "items":[].

Rispondi SOLO in JSON: {"risposta_valida":true|false,"items":[{"testo":"","evidenza_ref":""}]}`;

/** Estrae hard skill da una risposta libera. Il collegamento a un'esperienza è usato se emerge,
 * mai forzato (spec Fase B Passo 2): senza contesto, evidenza null e livello prudente. */
const HARD_SKILLS_EXTRACTION_PROMPT = `Lo studente sta elencando le sue hard skill: strumenti, software, metodologie o capacità pratiche che sa usare o ha applicato. Giudica prima se il messaggio risponde nel merito — anche una lista secca va bene. Se non risponde affatto (domanda, dubbio, confusione), non è valida.

Se valida: "risposta_valida":true, ed estrai le hard skill concrete menzionate — mai skill generiche non nominate esplicitamente. Per ognuna stima un "livello" prudente ("beginner"|"intermediate"|"advanced") dal modo in cui ne parla (es. "ho solo provato" = beginner, "lo uso da anni professionalmente" = advanced) — se non è chiaro, "intermediate". Se lo studente dice DOVE l'ha usata, metti quel contesto in "evidenza_ref" (breve); se non lo dice, "evidenza_ref":null — non forzare mai collegamenti artificiali a esperienze o esami. STILE: voce di CV, breve, senza soggetto (es. "Excel financial modeling", "Python for data analysis"), mai una frase completa. La MIRA card è sempre in inglese: scrivi "testo" ed "evidenza_ref" in inglese anche se la risposta è in italiano.

Se NON valida: "risposta_valida":false, "items":[].

Rispondi SOLO in JSON: {"risposta_valida":true|false,"items":[{"testo":"","livello":"beginner|intermediate|advanced","evidenza_ref":""}]}`;

function parseLivello(raw: unknown): HardSkillLivello | null {
  return raw === "beginner" || raw === "intermediate" || raw === "advanced" ? raw : null;
}

type CompetenzeStage = "academic" | "hard" | "edit";

function mapCompetenzaItems(raw: any[], categoria: "hard" | "academic"): CompetenzaItem[] {
  return (raw ?? [])
    .filter((it: any) => (it.testo ?? "").trim().length > 0)
    .map((it: any) => ({
      id: crypto.randomUUID(),
      testo: it.testo ?? "",
      categoria,
      livello: categoria === "hard" ? parseLivello(it.livello) ?? "intermediate" : null,
      evidenza_ref: it.evidenza_ref || null,
      verified: false,
      origin: "onboarding" as const,
    }));
}

async function writeCompetenze(supabase: any, studentProfileId: string, items: CompetenzaItem[], softSkills: string[] | null, status: CardBlockStatus) {
  // `soft_skills` è legacy (quiz rimosso): mai valori nuovi, ma quelli pre-rework vengono
  // preservati nel jsonb per non perdere dati — semplicemente non vengono più mostrati.
  const { error } = await (supabase.from("card_blocks") as any)
    .update({ prose_content: { items, soft_skills: softSkills ?? [] }, status })
    .eq("student_profile_id", studentProfileId)
    .eq("block_type", "competenze");
  if (error) throw error;
}

/**
 * Apre la Fase B (spec Passo 1 — competenze accademiche). Due strade:
 * - libretto con esami utili → propone le academic skill dai voti e invita a correggerle/integrarle;
 * - libretto assente/saltato/senza esami utili → NON salta le academic: le chiede in chat.
 * In entrambi i casi lo stage passa ad "academic": la prossima risposta dello studente
 * integra/corregge le academic, poi si passa alle hard.
 */
export async function startFaseB() {
  const { supabase, profileId, studentProfileId, student, blocks } = await getOnboardingContext();
  const t = await getTranslations("OnboardingEngine");

  const answers = (student.onboarding_answers as Record<string, unknown>) ?? {};
  const stage = (answers.competenze_stage as CompetenzeStage | undefined) ?? null;

  // Resume cross-sessione dentro la sequenza competenze: riparte dallo stage salvato,
  // senza riproporre le academic già scritte in card.
  if (stage === "hard") {
    const message = t("hardSkillQuestion");
    await saveFaseBConversation(supabase, profileId, [{ role: "assistant", content: message }]);
    return { messages: [message], phase: "competenze" as OnboardingPhase, competenze: blocks.competenze, done: false };
  }
  if (stage === "edit") {
    const message = t("resumeCompetenzeEdit");
    await saveFaseBConversation(supabase, profileId, [{ role: "assistant", content: message }]);
    return { messages: [message], phase: "competenze" as OnboardingPhase, competenze: blocks.competenze, done: false };
  }

  const examItems = blocks.formazione.data.items;

  if (examItems.length === 0) {
    // Nessun esame utile (libretto saltato, non leggibile, o percorso appena iniziato):
    // le academic skill non si saltano, si chiedono direttamente in chat (spec, dubbio 6).
    const message = t("academicSkillsQuestion");
    await saveAnswersFlags(supabase, profileId, { competenze_stage: "academic" });
    await saveFaseBConversation(supabase, profileId, [{ role: "assistant", content: message }]);
    return { messages: [message], phase: "competenze" as OnboardingPhase, competenze: blocks.competenze, done: false };
  }

  const examContextLines = examItems.map((i) => `${i.esame}: ${i.voto ?? "idoneo"}`).join("\n");

  const extracted = await chatCompletion(
    [
      { role: "system", content: ACADEMIC_SKILLS_PATTERN_PROMPT },
      { role: "user", content: examContextLines },
    ],
    { temperature: 0.3, maxTokens: 600, jsonMode: true }
  );

  const parsed = JSON.parse(extracted);
  const items: CompetenzaItem[] = mapCompetenzaItems(parsed.items ?? [], "academic");

  const { data: updatedRows, error } = await (supabase.from("card_blocks") as any)
    .update({ prose_content: { items, soft_skills: blocks.competenze.data.soft_skills ?? [] }, status: "draft" })
    .eq("student_profile_id", studentProfileId)
    .eq("block_type", "competenze")
    .select("id");
  if (error) {
    console.error("[MIRA] startFaseB write failed:", error);
    throw new Error(t("errorSaveCompetenzeProposed"));
  }
  if (!updatedRows || updatedRows.length === 0) {
    console.error("[MIRA] startFaseB: 0 righe aggiornate per studentProfileId", studentProfileId);
    throw new Error(t("errorCompetenzeRowNotFound"));
  }

  // Non citiamo mai il testo inglese delle competenze in chat (card sempre in inglese, dubbio 17):
  // rimandiamo al pannello, dove sono già visibili. Se dai voti non emerge nulla, si passa
  // comunque alla domanda diretta — le academic skill non si saltano mai (spec).
  const message = items.length > 0 ? t("startFaseBIntro") : t("academicSkillsQuestion");
  await saveAnswersFlags(supabase, profileId, { competenze_stage: "academic" });
  await saveFaseBConversation(supabase, profileId, [{ role: "assistant", content: message }]);

  return {
    messages: [message],
    phase: "competenze" as OnboardingPhase,
    competenze: { status: "draft" as CardBlockStatus, data: { items, soft_skills: blocks.competenze.data.soft_skills ?? [] } },
    done: false,
  };
}

/**
 * Unico entry point della fase competenze: smista sul sotto-passo corrente
 * (academic → hard → edit/conferma) salvato in onboarding_answers.competenze_stage —
 * il blocco resta in bozza per tutta la sequenza, mai approvato a metà (dubbio 7).
 */
export async function submitCompetenze(history: ChatMessage[], userMessage: string) {
  const { supabase, profileId, studentProfileId, student, blocks } = await getOnboardingContext();
  const t = await getTranslations("OnboardingEngine");
  const conversation = [...history, { role: "user" as const, content: userMessage }];
  const answers = (student.onboarding_answers as Record<string, unknown>) ?? {};
  const stage = ((answers.competenze_stage as CompetenzeStage | undefined) ?? "academic") as CompetenzeStage;
  const softSkills = blocks.competenze.data.soft_skills ?? [];

  // --- Sotto-passo academic: integra/corregge le proposte, o le raccoglie da zero. ---
  if (stage === "academic") {
    // "Va bene così" sulle academic proposte → si passa alle hard.
    if (blocks.competenze.data.items.length > 0 && (await isConfirmationMessage(userMessage))) {
      await saveAnswersFlags(supabase, profileId, { competenze_stage: "hard" });
      const message = t("hardSkillQuestion");
      const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
      await saveFaseBConversation(supabase, profileId, fullConversation);
      return { message, phase: "competenze" as OnboardingPhase, done: false, competenze: blocks.competenze };
    }

    const extracted = await chatCompletion(
      [
        { role: "system", content: ACADEMIC_SKILLS_FREEFORM_PROMPT },
        { role: "user", content: userMessage },
      ],
      { temperature: 0.3, maxTokens: 500, jsonMode: true }
    );
    const parsed = JSON.parse(extracted);

    if (parsed.risposta_valida === false) {
      const message = await handleUnclearAnswer(userMessage, t("academicSkillsQuestion"));
      const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
      await saveFaseBConversation(supabase, profileId, fullConversation);
      return { message, phase: "competenze" as OnboardingPhase, done: false };
    }

    const newItems = mapCompetenzaItems(parsed.items ?? [], "academic");
    const items = [...blocks.competenze.data.items, ...newItems];
    await writeCompetenze(supabase, studentProfileId, items, softSkills, "draft");
    await saveAnswersFlags(supabase, profileId, { competenze_stage: "hard" });

    const message = `${t("academicSkillsSaved")}\n\n${t("hardSkillQuestion")}`;
    const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
    await saveFaseBConversation(supabase, profileId, fullConversation);
    return {
      message,
      phase: "competenze" as OnboardingPhase,
      done: false,
      competenze: { status: "draft" as CardBlockStatus, data: { items, soft_skills: softSkills } },
    };
  }

  // --- Sotto-passo hard: strumenti/software/metodologie/capacità pratiche. ---
  if (stage === "hard") {
    const extracted = await chatCompletion(
      [
        { role: "system", content: HARD_SKILLS_EXTRACTION_PROMPT },
        { role: "user", content: userMessage },
      ],
      { temperature: 0.3, maxTokens: 400, jsonMode: true }
    );
    const parsed = JSON.parse(extracted);

    if (parsed.risposta_valida === false) {
      const message = await handleUnclearAnswer(userMessage, t("hardSkillQuestion"));
      const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
      await saveFaseBConversation(supabase, profileId, fullConversation);
      return { message, phase: "competenze" as OnboardingPhase, done: false };
    }

    const hardItems = mapCompetenzaItems(parsed.items ?? [], "hard");
    const items = [...blocks.competenze.data.items, ...hardItems];
    await writeCompetenze(supabase, studentProfileId, items, softSkills, "draft");
    await saveAnswersFlags(supabase, profileId, { competenze_stage: "edit" });

    const message = t("competenzeSequenceDone");
    const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
    await saveFaseBConversation(supabase, profileId, fullConversation);
    return {
      message,
      phase: "competenze" as OnboardingPhase,
      done: true,
      competenze: { status: "draft" as CardBlockStatus, data: { items, soft_skills: softSkills } },
    };
  }

  // --- Sotto-passo edit: conferma via chat, oppure modifica libera della bozza. ---
  if (blocks.competenze.status === "draft" && (await isConfirmationMessage(userMessage))) {
    await approveBlocks(supabase, studentProfileId, ["competenze"]);
    const next = await lingueOpeningMessage(student);
    const fullConversation = [...conversation, { role: "assistant" as const, content: next }];
    await saveFaseBConversation(supabase, profileId, fullConversation);
    return { message: next, phase: "lingue" as OnboardingPhase, done: true, approvedBlocks: ["competenze"] as CardBlockType[] };
  }

  const contextLines = [
    ...blocks.formazione.data.items.map((i) => `Esame: ${i.esame} (voto ${i.voto ?? "idoneo"})`),
    ...blocks.esperienze.data.items.map((i) => `Esperienza: ${i.titolo || i.organizzazione} — ${i.descrizione}`),
  ].join("\n");

  const extracted = await chatCompletion(
    [
      {
        role: "system",
        content: `Lo studente ha scritto un messaggio per correggere o integrare il blocco Competenze della sua card (bozza attuale: ${JSON.stringify(blocks.competenze.data.items.map((i) => ({ testo: i.testo, categoria: i.categoria })))}). Estrai: {"add":[{"testo":"","categoria":"hard|academic","livello":"beginner|intermediate|advanced|null","evidenza_ref":""}],"remove":["testo esatto delle competenze da togliere"]}. Categorizza ciascuna nuova competenza come "hard" (strumenti/tecnologie/capacità pratiche) o "academic" (teoria/materie studiate). Se cita un esame o un'esperienza tra i fatti sotto, usala come "evidenza_ref" (breve); altrimenti "evidenza_ref":null — l'evidenza non è obbligatoria, ma non inventare mai competenze non dette. Per le hard stima un "livello" prudente, null per le academic. STILE CV per "testo": breve, senza soggetto, in inglese anche se il messaggio è in italiano (la MIRA card è sempre in inglese). Rispondi SOLO in JSON.`,
      },
      { role: "user", content: `Fatti disponibili:\n${contextLines || "nessuno"}\n\nMessaggio studente: "${userMessage}"` },
    ],
    { temperature: 0.3, maxTokens: 500, jsonMode: true }
  );

  const parsed = JSON.parse(extracted);
  const toAdd = [
    ...mapCompetenzaItems((parsed.add ?? []).filter((it: any) => it.categoria !== "academic"), "hard"),
    ...mapCompetenzaItems((parsed.add ?? []).filter((it: any) => it.categoria === "academic"), "academic"),
  ];
  const toRemove: string[] = (parsed.remove ?? []).map((s: string) => s.toLowerCase().trim());
  const items = [
    ...blocks.competenze.data.items.filter((i) => !toRemove.includes(i.testo.toLowerCase().trim())),
    ...toAdd,
  ];

  if (toAdd.length === 0 && toRemove.length === 0) {
    const message = await handleUnclearAnswer(userMessage, t("resumeCompetenzeEdit"));
    const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
    await saveFaseBConversation(supabase, profileId, fullConversation);
    return { message, phase: "competenze" as OnboardingPhase, done: true };
  }

  await writeCompetenze(supabase, studentProfileId, items, softSkills, "draft");

  const message = t("competenzeAdded");
  const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
  await saveFaseBConversation(supabase, profileId, fullConversation);

  return {
    message,
    phase: "competenze" as OnboardingPhase,
    done: true,
    competenze: { status: "draft" as CardBlockStatus, data: { items, soft_skills: softSkills } },
  };
}

/** La domanda di apertura delle lingue: se il CV ne contiene, MIRA le propone citandole
 * (spec Fase B Passo 3 — i nomi delle lingue in chat sono voluti); altrimenti domanda aperta. */
async function lingueOpeningMessage(student: any): Promise<string> {
  const t = await getTranslations("OnboardingEngine");
  const cv = student.cv_summary as { languages?: Array<{ language: string; level: string }> } | null;
  const cvLanguages = cv?.languages ?? [];
  if (cvLanguages.length === 0) return t("lingueQuestion");
  const list = cvLanguages.map((l) => (l.level ? `${l.language} (${l.level})` : l.language)).join(", ");
  return t("lingueFromCVQuestion", { lingue: list });
}

export async function afterCompetenzeApproved(history: ChatMessage[]) {
  const { supabase, profileId, student } = await getOnboardingContext();
  const message = await lingueOpeningMessage(student);
  const fullConversation = [...history, { role: "assistant" as const, content: message }];
  await saveFaseBConversation(supabase, profileId, fullConversation);
  return { message, phase: "lingue" as OnboardingPhase };
}

export async function submitLingue(history: ChatMessage[], userMessage: string) {
  const { supabase, profileId, studentProfileId, student, blocks } = await getOnboardingContext();
  const t = await getTranslations("OnboardingEngine");
  const conversation = [...history, { role: "user" as const, content: userMessage }];

  const cv = student.cv_summary as { languages?: Array<{ language: string; level: string }> } | null;
  const cvLanguages = cv?.languages ?? [];
  const existingItems = blocks.lingue.data.items;

  // Bozza già pronta: pura conferma in chat → approva e passa al Profilo personale.
  if (blocks.lingue.status === "draft" && (await isConfirmationMessage(userMessage))) {
    await approveBlocks(supabase, studentProfileId, ["lingue"]);
    const message = t("profiloPersonaleQuestion");
    const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
    await saveFaseBConversation(supabase, profileId, fullConversation);
    return { message, phase: "profilo_personale" as OnboardingPhase, approvedBlocks: ["lingue"] as CardBlockType[] };
  }

  // Un'unica estrazione che NORMALIZZA e DEDUPLICA tutte le fonti (CV + già in card + messaggio):
  // "inglese", "English", "fluent English", "C1 English", "IELTS 7.5", "corso in inglese" sono
  // la STESSA lingua, una sola voce con il livello più chiaro disponibile (spec, dubbi 14-15).
  const data = await extractJSON(
    `Lo studente risponde su quali lingue conosce (o conferma/corregge quelle trovate nel CV). Giudica prima se il messaggio risponde nel merito — anche "vanno bene", "solo l'italiano" o "nessun'altra lingua" è una risposta valida. Se invece è una domanda, un dubbio o confusione, non è valida.

Fonti già note:
- Lingue dal CV: ${JSON.stringify(cvLanguages)}
- Lingue già in card: ${JSON.stringify(existingItems.map((i) => ({ lingua: i.lingua, livello: i.livello, certificazione: i.certificazione })))}

Se valida: "risposta_valida":true, e restituisci in "items" la LISTA COMPLETA E DEDUPLICATA delle lingue dello studente, unendo fonti note e messaggio. Regole di normalizzazione: ogni lingua UNA SOLA VOLTA; nome in inglese con iniziale maiuscola (es. "English", "Italian", "French"); varianti come "inglese"/"English"/"fluent English"/"corso in inglese" sono la stessa lingua; "livello" è il più chiaro disponibile tra le fonti (es. "C1", "B2", "Native", "Fluent"); se emerge una certificazione (es. "IELTS 7.5", "TOEFL 105", "DELF B2") mettila in "certificazione" e usa il livello che implica; se il livello non emerge da nessuna fonte, "livello":"". Se lo studente corregge o rimuove una lingua, rispetta la correzione.

Se NON valida: "risposta_valida":false, "items":[].

Rispondi solo JSON: {"risposta_valida":true|false,"items":[{"lingua":"","livello":"","certificazione":null}]}`,
    userMessage
  );

  if (data.risposta_valida === false) {
    const message = await handleUnclearAnswer(userMessage, await lingueOpeningMessage(student));
    const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
    await saveFaseBConversation(supabase, profileId, fullConversation);
    return { message, phase: "lingue" as OnboardingPhase, done: false };
  }

  // Dedup difensiva anche lato server, oltre a quella chiesta al modello.
  const seen = new Set<string>();
  const items: LinguaItem[] = [];
  for (const it of (data.items ?? []) as Array<{ lingua: string; livello: string; certificazione: string | null }>) {
    const key = (it.lingua ?? "").toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const existing = existingItems.find((e) => e.lingua.toLowerCase().trim() === key);
    items.push({
      id: existing?.id ?? crypto.randomUUID(),
      lingua: it.lingua,
      livello: it.livello ?? "",
      certificazione: it.certificazione || existing?.certificazione || null,
      verified: false,
      origin: existing?.origin ?? (cvLanguages.some((l) => l.language.toLowerCase().trim() === key) ? "cv_upload" : "onboarding"),
    });
  }

  await (supabase.from("card_blocks") as any)
    .update({ prose_content: { items }, status: "draft" })
    .eq("student_profile_id", studentProfileId)
    .eq("block_type", "lingue");

  // Livelli mancanti: UNA sola domanda mirata, mai un loop (flag persistente, dubbio 15).
  const answers = (student.onboarding_answers as Record<string, unknown>) ?? {};
  const missingLevels = items.filter((i) => !i.livello).map((i) => i.lingua);
  if (missingLevels.length > 0 && !answers.lingue_level_asked) {
    await saveAnswersFlags(supabase, profileId, { lingue_level_asked: true });
    const message = t("lingueLevelQuestion", { lingue: missingLevels.join(", ") });
    const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
    await saveFaseBConversation(supabase, profileId, fullConversation);
    return { message, phase: "lingue" as OnboardingPhase, done: false, lingue: { status: "draft" as CardBlockStatus, data: { items } } };
  }

  const message = t("lingueDone");
  const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
  await saveFaseBConversation(supabase, profileId, fullConversation);

  return { message, phase: "lingue" as OnboardingPhase, lingue: { status: "draft" as CardBlockStatus, data: { items } } };
}

export async function afterLingueApproved(history: ChatMessage[]) {
  const { supabase, profileId } = await getOnboardingContext();
  const t = await getTranslations("OnboardingEngine");
  const message = t("profiloPersonaleQuestion");
  const fullConversation = [...history, { role: "assistant" as const, content: message }];
  await saveFaseBConversation(supabase, profileId, fullConversation);
  return { message, phase: "profilo_personale" as OnboardingPhase };
}

/**
 * Profilo personale (spec Fase B Passo 4): interessi + autodescrizione in UNA sezione e UNA
 * domanda. NESSUNA domanda di rilancio se la risposta è breve o generica (rimossa dalla spec):
 * il giudizio "nel merito sì/no" resta (comportamenti trasversali, dubbio 21) — una risposta
 * fuori tema non chiude il blocco, ma una risposta magra viene sintetizzata così com'è.
 * Storage: riga `autodescrizione` (la riga `interessi` è legacy).
 */
export async function submitProfiloPersonale(history: ChatMessage[], userMessage: string) {
  const { supabase, profileId, studentProfileId, student, blocks } = await getOnboardingContext();
  const t = await getTranslations("OnboardingEngine");
  const conversation = [...history, { role: "user" as const, content: userMessage }];

  // Bozza già pronta: pura conferma in chat → approva e chiudi.
  if (blocks.autodescrizione.status === "draft" && (await isConfirmationMessage(userMessage))) {
    await approveBlocks(supabase, studentProfileId, ["autodescrizione"]);
    const result = await completeChiusura();
    const fullConversation = [...conversation, { role: "assistant" as const, content: result.message }];
    await saveFaseBConversation(supabase, profileId, fullConversation);
    return { ...result, done: true, approvedBlocks: ["autodescrizione"] as CardBlockType[] };
  }

  const judged = await chatCompletion(
    [
      {
        role: "system",
        content: `Lo studente ha risposto alla domanda sul suo profilo personale: come si presenta oltre a esami ed esperienze (interessi veri, cosa segue fuori dai programmi, cosa fa con costanza, come lo descriverebbero, cosa non sopporta, priorità). Giudica prima se risponde nel merito: parla davvero di sé, dei suoi interessi o abitudini — anche in modo breve o disordinato. Se invece è una domanda, un dubbio, confusione (es. "non ho capito") o qualcosa di scollegato, NON risponde nel merito.

Se risponde nel merito: "risposta_valida":true, e scrivi "testo" — un paragrafo breve (max 5 frasi) in PRIMA PERSONA che unisce interessi reali, attività costanti, elementi di autodescrizione e priorità, basato SOLO su quello che ha detto. Mai aggettivi di carattere dedotti da te ("intraprendente", "resiliente") e MAI etichette da valutazione attitudinale ("leadership", "teamwork", "resilienza") come se fossero competenze certificate: riformula le sue parole. Anche se la risposta è magra, sintetizza quello che c'è SENZA chiedere altro. La MIRA card è sempre in inglese: scrivi "testo" in inglese (prima persona: "I...") anche se lo studente ha risposto in italiano.

Se NON risponde nel merito: "risposta_valida":false, "testo":null.

Rispondi SOLO in JSON: {"risposta_valida":true|false,"testo":"..."|null}`,
      },
      { role: "user", content: userMessage },
    ],
    { temperature: 0.3, maxTokens: 450, jsonMode: true }
  );
  const { risposta_valida, testo } = JSON.parse(judged) as { risposta_valida: boolean; testo: string | null };

  if (!risposta_valida || !testo) {
    const message = await handleUnclearAnswer(userMessage, t("profiloPersonaleQuestion"));
    const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
    await saveFaseBConversation(supabase, profileId, fullConversation);
    return { message, phase: "profilo_personale" as OnboardingPhase, done: false };
  }

  await (supabase.from("card_blocks") as any)
    .update({ prose_content: { testo }, status: "draft" })
    .eq("student_profile_id", studentProfileId)
    .eq("block_type", "autodescrizione");

  // LEGACY-WRITE(card-rework): rimuovere in Step 5/6. profile_summary è lo specchio
  // in prima persona del Profilo personale.
  await (supabase.from("student_profiles") as any).update({ profile_summary: testo }).eq("id", studentProfileId);

  const message = t("profiloPersonaleDone");
  const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
  await saveFaseBConversation(supabase, profileId, fullConversation);

  return {
    message,
    phase: "profilo_personale" as OnboardingPhase,
    done: true,
    autodescrizione: { status: "draft" as CardBlockStatus, data: { testo } },
  };
}

export async function afterProfiloPersonaleApproved(history: ChatMessage[]) {
  const { supabase, profileId } = await getOnboardingContext();
  const result = await completeChiusura();
  const fullConversation = [...history, { role: "assistant" as const, content: result.message }];
  await saveFaseBConversation(supabase, profileId, fullConversation);
  return result;
}

/** Resume cross-sessione: un solo messaggio di ripresa, mai il replay dell'intera Fase A. */
export async function resumeFaseB(phase: OnboardingPhase) {
  const { supabase, profileId, student } = await getOnboardingContext();
  const t = await getTranslations("OnboardingEngine");

  if (phase === "competenze") return startFaseB();
  if (phase === "chiusura") return completeChiusura();

  const question = phase === "lingue"
    ? await lingueOpeningMessage(student)
    : phase === "profilo_personale"
      ? t("profiloPersonaleQuestion")
      : t("resumeFallbackQuestion");
  const message = t("resumeFaseBMessage", { question });
  await saveFaseBConversation(supabase, profileId, [{ role: "assistant", content: message }]);
  return { message, phase };
}

async function completeChiusura() {
  const t = await getTranslations("OnboardingEngine");
  const message = t("chiusuraMessage");
  revalidatePath("/student");
  return { message, phase: "chiusura" as OnboardingPhase };
}

export async function forceCompleteOnboarding() {
  const { studentProfileId, supabase } = await getOnboardingContext();

  // Placeholder allineati alla struttura del rework (dubbio 30): disponibilita con `attiva`
  // strutturato, competenze senza soft skill, profilo personale sulla riga autodescrizione,
  // interessi legacy lasciato vuoto.
  const placeholders: Record<string, unknown> = {
    header: { corso: "[test] Corso placeholder", livello: "triennale", anno: 1, anno_inizio: null, laurea_anno: null, media_voti: null },
    formazione: { items: [] },
    esperienze: { items: [{ id: crypto.randomUUID(), titolo: "[test] Esperienza placeholder", ruolo: "", organizzazione: "", periodo: "", descrizione: "[test] descrizione placeholder", verified: false, origin: "onboarding" }] },
    disponibilita: { attiva: true, cosa_cerca: "[test] internship", ambito: "[test] finance", periodo: "[test] from now", durata: null, dove: "[test] Milano" },
    competenze: { items: [{ id: crypto.randomUUID(), testo: "[test] competenza placeholder", categoria: "academic", livello: null, evidenza_ref: "[test]", verified: false, origin: "onboarding" }], soft_skills: [] },
    lingue: { items: [{ id: crypto.randomUUID(), lingua: "[test] English", livello: "B2", certificazione: null, verified: false, origin: "onboarding" }] },
    interessi: { testo: null },
    autodescrizione: { testo: "[test] profilo personale placeholder" },
    piano_carriera: { stato: "esplorazione", testo: "[test] piano placeholder" },
  };

  for (const blockType of ALL_BLOCK_TYPES) {
    const { data: row } = await (supabase.from("card_blocks") as any)
      .select("status, prose_content")
      .eq("student_profile_id", studentProfileId)
      .eq("block_type", blockType)
      .single();

    if (row?.status === "empty") {
      await (supabase.from("card_blocks") as any)
        .update({ prose_content: placeholders[blockType], status: "approved", approved_at: new Date().toISOString() })
        .eq("student_profile_id", studentProfileId)
        .eq("block_type", blockType);
    } else if (row?.status === "draft") {
      await (supabase.from("card_blocks") as any)
        .update({ status: "approved", approved_at: new Date().toISOString() })
        .eq("student_profile_id", studentProfileId)
        .eq("block_type", blockType);
    }
  }

  await (supabase.from("student_profiles") as any)
    .update({ onboarding_completed: true, onboarding_completed_at: new Date().toISOString() })
    .eq("id", studentProfileId);

  revalidatePath("/student");

  return { success: true };
}
