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

// Nota di architettura: da questo step, l'approvazione di un blocco (Conferma) avviene
// SEMPRE dal componente della card stessa (riuso dei componenti editabili del Profilo,
// Step 2), mai da qui. Le funzioni "after*Approved" qui sotto vengono chiamate DOPO che
// il blocco è già approvato lato server — il loro compito è solo decidere la prossima
// domanda, mai richiamare approveCardBlock (già fatto dal click sul pannello).

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
  | "interessi"
  | "autodescrizione"
  | "piano_carriera"
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
      "id, degree_program, degree_level, current_year, transcript_uploaded, cv_uploaded, cv_summary, availability, interests, goals, onboarding_answers"
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

export async function loadOnboardingState(): Promise<OnboardingState> {
  const { student, blocks } = await getOnboardingContext();

  const answers = student.onboarding_answers as Record<string, unknown> | null;
  const conversation = (answers?.conversation as ChatMessage[]) ?? [];
  const faseBConversation = (answers?.fase_b_conversation as ChatMessage[]) ?? [];
  const transcriptUploaded = !!student.transcript_uploaded;
  const cvUploaded = !!student.cv_uploaded;
  const skippedTranscript = conversation.some((m) => m.content === "[Libretto saltato]");
  const skippedCV = conversation.some((m) => m.content === "[CV saltato]");
  const faseAComplete = blocks.disponibilita.status === "approved";

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
  if (blocks.competenze.status !== "approved") phase = "competenze";
  else if (blocks.lingue.status !== "approved") phase = "lingue";
  else if (blocks.interessi.status !== "approved") phase = "interessi";
  else if (blocks.autodescrizione.status !== "approved") phase = "autodescrizione";
  else if (blocks.piano_carriera.status !== "approved") phase = "piano_carriera";
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

  // Se in registrazione ha già indicato il livello, lo confermiamo invece di richiederlo da zero.
  const knownLivello = blocks.header.data.livello;
  const closing = knownLivello
    ? t("knownLivelloClosing", { livello: t(`livelloLabels.${knownLivello}`) })
    : t("livelloQuestionIntro");

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
- In tutti i casi, chiudi riproponendo la domanda originale (puoi riformularla, mai ripeterla identica parola per parola).

Non ignorare mai quello che lo studente ha scritto per ripetere la domanda come se non l'avessi letta. Tono diretto, umano, mai robotico. ${languageInstruction}`,
      },
      { role: "user", content: userMessage },
    ],
    { temperature: 0.4, maxTokens: 250 }
  );
  return result.trim();
}

export async function submitLivello(history: ChatMessage[], userMessage: string) {
  const { supabase, profileId, studentProfileId, blocks } = await getOnboardingContext();
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
    message = t("afterLivelloOther");
    phase = "transcript";
  }

  const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
  await saveConversation(supabase, profileId, fullConversation);

  return { message, phase, header: { status: "empty" as CardBlockStatus, data: { ...blocks.header.data, livello } } };
}

export async function submitPreviousDegree(history: ChatMessage[], userMessage: string) {
  const { supabase, profileId, studentProfileId, blocks } = await getOnboardingContext();
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

  const message = t("afterPreviousDegree");
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
  const { supabase, profileId, studentProfileId, student, blocks } = await getOnboardingContext();
  const t = await getTranslations("OnboardingEngine");
  const conversation = [...history, { role: "user" as const, content: userMessage }];
  const transcriptSkipped = conversation.some((m) => m.content === "[Libretto saltato]");

  const data = await extractJSON(
    `Estrai dal messaggio ciò che manca sul percorso accademico: {"universita":"nome università, o null","corso":"nome corso, o null","livello":"triennale|magistrale|ciclo_unico, o null","anno":0,"anno_inizio":"anno di immatricolazione a questo corso, es. 2023, o null","laurea_anno":"anno di laurea previsto, es. 2026, o null"}. Se un campo non emerge, null. Rispondi solo JSON.`,
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
    // Il CV descrive già bene questa esperienza: la propongo com'è invece di chiedere da zero.
    message = t("cvItemGood", { title: first.title, org: first.organization, description: first.description });
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
  const { supabase, profileId, studentProfileId, student } = await getOnboardingContext();
  const t = await getTranslations("OnboardingEngine");
  const locale = await getLocale();
  const conversation = [...history, { role: "user" as const, content: userMessage }];
  const isLast = subIndex + 1 >= totalSubQuestions;

  if (!isLast) {
    const cv = student.cv_summary as { experiences?: Array<{ title: string; organization: string; description: string }> } | null;
    const experiences = cv?.experiences ?? [];
    const next = experiences[subIndex + 1];

    let nextQuestion: string;
    if (!next) {
      nextQuestion = await getHiddenExperienceQuestion();
    } else if (next.description && next.description.length >= DETAILED_DESCRIPTION_THRESHOLD) {
      nextQuestion = t("cvItemGood", { title: next.title, org: next.organization, description: next.description });
    } else {
      nextQuestion = t("cvNextPlain", { title: next.title, org: next.organization });
    }

    // Breve reazione reale a quello che ha appena detto, non un "Segnato" fisso —
    // altrimenti sembra che MIRA non legga le risposte. Risponde nella lingua del locale attivo.
    const languageInstruction = locale === "it" ? "Rispondi in italiano." : "Respond in English.";
    const reaction = await chatCompletion(
      [
        {
          role: "system",
          content: `Lo studente ha appena risposto a una domanda su un'esperienza. Scrivi UNA riga breve che reagisca concretamente a quello che ha detto (fatti, non entusiasmo generico tipo "fantastico!"). Poi, a capo, prosegui con la prossima domanda esatta che ti viene data. Rispondi SOLO con il testo finale del messaggio, niente JSON. ${languageInstruction}`,
        },
        { role: "user", content: `Risposta studente: "${userMessage}"\n\nProssimo messaggio da porre: "${nextQuestion}"` },
      ],
      { temperature: 0.4, maxTokens: 200 }
    );

    const message = reaction.trim() || nextQuestion;
    const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
    await saveConversation(supabase, profileId, fullConversation);
    return { message, phase: "esperienze" as OnboardingPhase, done: false };
  }

  // Ultima risposta: estrae tutto ciò che è emerso in questa fase nel blocco esperienze.
  const recentText = conversation
    .slice(-2 * totalSubQuestions - 2)
    .map((m) => `${m.role === "user" ? "Studente" : "MIRA"}: ${m.content}`)
    .join("\n");

  const extracted = await chatCompletion(
    [
      {
        role: "system",
        content: `Dalla conversazione, estrai le esperienze raccontate dallo studente. Per ognuna scrivi una descrizione di 2-3 righe di cosa ha fatto concretamente — fatti, non aggettivi di carattere. STILE OBBLIGATORIO: come un CV professionale — frasi che iniziano direttamente con un verbo al passato, senza soggetto (es. "Built a...", "Led a team of...", "Analyzed..."), MAI "I built..." né "He/she built...". La MIRA card è sempre in inglese: scrivi "titolo" e "descrizione" in inglese anche se la conversazione è in italiano (non tradurre invece "organizzazione" se è un nome proprio, es. il nome di un'azienda). Rispondi SOLO in JSON: {"items":[{"titolo":"","organizzazione":"","periodo":"","descrizione":""}]}`,
      },
      { role: "user", content: recentText },
    ],
    { temperature: 0.2, maxTokens: 800, jsonMode: true }
  );

  const parsed = JSON.parse(extracted);
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

/** Chiamata dal pannello dopo che Esperienze è stato approvato lì. */
export async function afterEsperienzeApproved(history: ChatMessage[]) {
  const { supabase, profileId } = await getOnboardingContext();
  const t = await getTranslations("OnboardingEngine");
  const message = t("afterEsperienzeApproved");
  const fullConversation = [...history, { role: "assistant" as const, content: message }];
  await saveConversation(supabase, profileId, fullConversation);
  return { message, phase: "disponibilita" as OnboardingPhase };
}

export async function submitDisponibilita(history: ChatMessage[], userMessage: string) {
  const { supabase, profileId, studentProfileId, student, blocks } = await getOnboardingContext();
  const t = await getTranslations("OnboardingEngine");
  const conversation = [...history, { role: "user" as const, content: userMessage }];

  const data = await extractJSON(
    `Estrai dal messaggio: {"cosa_cerca":"tipo di opportunità: stage curriculare|stage extracurriculare|part-time|progetto|non in cerca|già occupato","ambito":"settore o ruolo cercato, es. venture capital, marketing, finanza","periodo":"il quando: una data di inizio aperta (es. 'da settembre 2026'), un intervallo preciso (es. 'da giugno ad agosto 2026'), o uno stato speciale se già occupato/non in cerca (es. 'già impegnato fino a dicembre')","dove":""}. Se un campo non emerge, stringa vuota. La MIRA card è sempre in inglese: scrivi ogni campo in inglese anche se il messaggio è in italiano. Rispondi solo JSON.`,
    userMessage
  );

  if (!data.cosa_cerca) {
    const message = await handleUnclearAnswer(userMessage, t("disponibilitaQuestion"));
    const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
    await saveConversation(supabase, profileId, fullConversation);
    return { message, phase: "disponibilita" as OnboardingPhase, disponibilita: blocks.disponibilita };
  }

  const disponibilitaData: DisponibilitaProseContent = {
    cosa_cerca: data.cosa_cerca || null,
    ambito: data.ambito || null,
    periodo: data.periodo || null,
    dove: data.dove || null,
  };

  await (supabase.from("card_blocks") as any)
    .update({ prose_content: disponibilitaData, status: "draft" })
    .eq("student_profile_id", studentProfileId)
    .eq("block_type", "disponibilita");

  // LEGACY-WRITE(card-rework): rimuovere in Step 5/6.
  const existingAvail = (student.availability as Record<string, unknown>) ?? {};
  await (supabase.from("student_profiles") as any)
    .update({
      availability: {
        ...existingAvail,
        status: data.cosa_cerca || null,
        type: data.cosa_cerca || null,
        period: data.periodo || null,
        city: data.dove || null,
      },
    })
    .eq("id", studentProfileId);

  const message = t("disponibilitaDone");
  const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
  await saveConversation(supabase, profileId, fullConversation);

  return { message, phase: "disponibilita" as OnboardingPhase, disponibilita: { status: "draft" as CardBlockStatus, data: disponibilitaData } };
}

/** Chiamata dal pannello dopo che Disponibilità è stata approvata lì: apre il gate. */
export async function afterDisponibilitaApproved(history: ChatMessage[]) {
  const { supabase, profileId, studentProfileId } = await getOnboardingContext();
  const t = await getTranslations("OnboardingEngine");

  await (supabase.from("student_profiles") as any)
    .update({ onboarding_completed: true, onboarding_completed_at: new Date().toISOString() })
    .eq("id", studentProfileId);

  // "formazione" non è un blocco confermabile a sé (è dentro Header): non conta nella percentuale,
  // per restare coerente con quella mostrata nel pannello (8 blocchi visibili, non 9 righe DB).
  const { data: allBlocks } = await (supabase.from("card_blocks") as any)
    .select("status")
    .eq("student_profile_id", studentProfileId)
    .neq("block_type", "formazione");
  const approvedCount = (allBlocks ?? []).filter((b: any) => b.status === "approved").length;
  const pct = Math.round((approvedCount / 8) * 100);

  const message = t("afterDisponibilitaApproved", { pct });
  const fullConversation = [...history, { role: "assistant" as const, content: message }];
  await saveConversation(supabase, profileId, fullConversation);

  revalidatePath("/student");

  return { message, phase: "gate" as OnboardingPhase, progressPct: pct };
}

// ---------------------------------------------------------------------------
// Fase B — invariata nel contenuto delle domande (rimandato al prossimo giro),
// solo adattata a non chiamare più approveCardBlock da sola (fatto dal pannello).
// ---------------------------------------------------------------------------

/** Cluster gli esami per area tematica e propone una academic skill per area dove lo studente
 * è andato bene — a differenza del vecchio "una per esame", scala con le aree (poche) non con
 * il numero di esami, quindi non satura il budget di token con tanti esami. */
const ACADEMIC_SKILLS_PATTERN_PROMPT = `Ti do la lista di tutti gli esami sostenuti con il voto. Raggruppa gli esami per area tematica affine (es. quantitativo/statistica, finance, diritto, marketing, informatica...) e proponi UNA competenza accademica per ciascuna area in cui lo studente è andato bene (voti alti, o comunque un pattern chiaro rispetto alla sua media) — non una per ogni singolo esame, e non per aree con pochi esami o voti medio-bassi.

Ogni competenza ha un'evidenza BREVE: il nome dell'area tematica (es. "Quantitative finance"), MAI un elenco di esami o il testo completo. Vietati aggettivi vaghi tipo "conoscenza della materia" — sii specifico (es. "Corporate valuation techniques", non "financial knowledge"). La MIRA card è sempre in inglese: scrivi "testo" ed "evidenza_ref" in inglese anche se i nomi degli esami sono in italiano. Rispondi SOLO in JSON: {"items":[{"testo":"","evidenza_ref":""}]}`;

/** Estrae hard skill (strumenti/tecnologie/metodologie) da una risposta libera, con livello stimato
 * dal modo in cui lo studente ne parla — mai un menu vuoto da riempire da zero. */
const HARD_SKILLS_EXTRACTION_PROMPT = `Lo studente ha appena risposto a una domanda su quali strumenti/tecnologie/metodologie ha usato nelle sue esperienze. Estrai le hard skill concrete menzionate — mai skill generiche non nominate esplicitamente. Per ognuna stima un "livello" ("beginner"|"intermediate"|"advanced") dal modo in cui ne parla (es. "ho solo provato" = beginner, "lo uso da anni professionalmente"/"ho guidato lo sviluppo" = advanced) — se non è chiaro, "intermediate". Evidenza BREVE: il nome dell'esperienza a cui si riferisce, mai il testo completo. STILE: come una voce di CV, breve, senza soggetto (es. "Excel financial modeling", "Python for data analysis"), mai una frase completa. La MIRA card è sempre in inglese: scrivi "testo" ed "evidenza_ref" in inglese anche se la risposta è in italiano. Rispondi SOLO in JSON: {"items":[{"testo":"","livello":"beginner|intermediate|advanced","evidenza_ref":""}]}`;

function parseLivello(raw: unknown): HardSkillLivello | null {
  return raw === "beginner" || raw === "intermediate" || raw === "advanced" ? raw : null;
}

/** Apre la Fase B: propone le academic skill (silenziose, nessuna domanda) e subito dopo fa
 * la prima vera domanda (hard skill) — l'inizio della sequenza gestita da submitCompetenzeRisposta. */
export async function startFaseB() {
  const { supabase, profileId, studentProfileId, blocks } = await getOnboardingContext();
  const t = await getTranslations("OnboardingEngine");

  const examContextLines = blocks.formazione.data.items
    .map((i) => `${i.esame}: ${i.voto ?? "idoneo"}`)
    .join("\n");

  const extracted = await chatCompletion(
    [
      { role: "system", content: ACADEMIC_SKILLS_PATTERN_PROMPT },
      { role: "user", content: examContextLines || "Nessun esame disponibile." },
    ],
    { temperature: 0.3, maxTokens: 600, jsonMode: true }
  );

  const parsed = JSON.parse(extracted);
  const items: CompetenzaItem[] = (parsed.items ?? []).map((it: any) => ({
    id: crypto.randomUUID(),
    testo: it.testo ?? "",
    categoria: "academic" as const,
    livello: null,
    evidenza_ref: it.evidenza_ref ?? null,
    verified: false,
    origin: "onboarding",
  }));

  const { data: updatedRows, error } = await (supabase.from("card_blocks") as any)
    .update({ prose_content: { items, soft_skills_testo: null }, status: "draft" })
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

  const listText = items.map((i) => `• ${i.testo}`).join("\n");
  const message = t("startFaseBMessage", { listText: listText || t("noCompetenzeDraft") });

  await saveFaseBConversation(supabase, profileId, [{ role: "assistant", content: message }]);

  return {
    message,
    phase: "competenze" as OnboardingPhase,
    competenze: { status: "draft" as CardBlockStatus, data: { items, soft_skills_testo: null } },
    done: false,
  };
}

/**
 * Sequenza a 3 turni dentro la fase "competenze", stesso schema di submitAutodescrizioneRisposta:
 * subIndex 0 = risposta alla domanda hard skill → estrae le hard skill e fa la prima domanda
 * soft skill (generata dall'AI, ancorata a un'esperienza reale, stile comportamentale/STAR).
 * subIndex 1 = risposta alla prima domanda soft → fa la seconda (scelta forzata, statica).
 * subIndex 2 = risposta alla seconda domanda soft → sintetizza le due risposte in un paragrafo
 * breve in prima persona (mai tag/etichette), salvato in soft_skills_testo.
 */
export async function submitCompetenzeRisposta(history: ChatMessage[], userMessage: string, subIndex: number) {
  const { supabase, profileId, studentProfileId, blocks } = await getOnboardingContext();
  const t = await getTranslations("OnboardingEngine");
  const locale = await getLocale();
  const conversation = [...history, { role: "user" as const, content: userMessage }];

  if (subIndex === 0) {
    const esperienzeContext = blocks.esperienze.data.items
      .map((i) => `${i.titolo || i.organizzazione}: ${i.descrizione}`)
      .join("\n");

    const extracted = await chatCompletion(
      [
        { role: "system", content: HARD_SKILLS_EXTRACTION_PROMPT },
        { role: "user", content: `Esperienze dello studente:\n${esperienzeContext || "nessuna"}\n\nRisposta sugli strumenti usati: "${userMessage}"` },
      ],
      { temperature: 0.3, maxTokens: 400, jsonMode: true }
    );
    const parsed = JSON.parse(extracted);
    const hardItems: CompetenzaItem[] = (parsed.items ?? []).map((it: any) => ({
      id: crypto.randomUUID(),
      testo: it.testo ?? "",
      categoria: "hard" as const,
      livello: parseLivello(it.livello),
      evidenza_ref: it.evidenza_ref ?? null,
      verified: false,
      origin: "onboarding",
    }));
    const items = [...blocks.competenze.data.items, ...hardItems];

    await (supabase.from("card_blocks") as any)
      .update({ prose_content: { items, soft_skills_testo: blocks.competenze.data.soft_skills_testo ?? null }, status: "draft" })
      .eq("student_profile_id", studentProfileId)
      .eq("block_type", "competenze");

    const languageInstruction = locale === "it" ? "Scrivi in italiano." : "Write in English.";
    const esperienzeList = blocks.esperienze.data.items
      .map((i) => `- ${i.titolo || i.organizzazione}: ${i.descrizione}`)
      .join("\n") || "nessuna esperienza disponibile";
    const question = await chatCompletion(
      [
        {
          role: "system",
          content: `Sei MIRA. Scegli UNA delle esperienze reali dello studente elencate sotto (quella più ricca di dinamiche di gruppo, pressione o responsabilità) e scrivi UNA domanda comportamentale breve e naturale, in stile metodo STAR, che chieda di un episodio concreto vissuto in quell'esperienza (es. un conflitto gestito, una decisione sotto pressione, un momento di leadership). Non nominare "metodo STAR" né spiegare cosa stai facendo. Una sola domanda, colloquiale, come la farebbe un amico curioso — non un elenco di opzioni, non un interrogatorio. Rispondi SOLO con la domanda. ${languageInstruction}`,
        },
        { role: "user", content: esperienzeList },
      ],
      { temperature: 0.6, maxTokens: 150 }
    );

    const message = question.trim() || t("softSkillQuestionOneFallback");
    const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
    await saveFaseBConversation(supabase, profileId, fullConversation);
    return { message, phase: "competenze" as OnboardingPhase, done: false };
  }

  if (subIndex === 1) {
    const message = t("softSkillQuestionTwo");
    const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
    await saveFaseBConversation(supabase, profileId, fullConversation);
    return { message, phase: "competenze" as OnboardingPhase, done: false };
  }

  // subIndex 2 (ultimo turno): sintetizza le due risposte soft-skill in un paragrafo in prima persona.
  const recentText = conversation
    .slice(-4)
    .map((m) => `${m.role === "user" ? "Studente" : "MIRA"}: ${m.content}`)
    .join("\n");

  const synthesized = await chatCompletion(
    [
      {
        role: "system",
        content: `Dalle ultime due domande/risposte, scrivi un paragrafo breve (2-3 frasi) in PRIMA PERSONA che descrive lo stile di lavoro e le soft skill dello studente — solo ciò che emerge davvero dalle risposte, mai aggettivi generici scollegati (niente "team player" buttato lì senza motivo). La MIRA card è sempre in inglese: scrivi "testo" in inglese (prima persona: "I...") anche se lo studente ha risposto in italiano. Rispondi SOLO in JSON: {"testo":""}`,
      },
      { role: "user", content: recentText },
    ],
    { temperature: 0.4, maxTokens: 300, jsonMode: true }
  );
  const { testo } = JSON.parse(synthesized) as { testo: string };

  const items = blocks.competenze.data.items;
  await (supabase.from("card_blocks") as any)
    .update({ prose_content: { items, soft_skills_testo: testo }, status: "draft" })
    .eq("student_profile_id", studentProfileId)
    .eq("block_type", "competenze");

  const message = t("competenzeSequenceDone");
  const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
  await saveFaseBConversation(supabase, profileId, fullConversation);

  return {
    message,
    phase: "competenze" as OnboardingPhase,
    done: true,
    competenze: { status: "draft" as CardBlockStatus, data: { items, soft_skills_testo: testo } },
  };
}

/**
 * Fase "competenze", dopo la fine della sequenza a 3 turni: lo studente può solo Confermare dal
 * pannello — ma può anche scrivere in chat per aggiungerne altre. Senza questa funzione
 * quel messaggio cadeva nel vuoto senza risposta (nessun ramo lo intercettava).
 */
export async function submitCompetenzeAggiunta(history: ChatMessage[], userMessage: string) {
  const { supabase, profileId, studentProfileId, blocks } = await getOnboardingContext();
  const t = await getTranslations("OnboardingEngine");
  const conversation = [...history, { role: "user" as const, content: userMessage }];

  const contextLines = [
    ...blocks.formazione.data.items.map((i) => `Esame: ${i.esame} (voto ${i.voto ?? "idoneo"})`),
    ...blocks.esperienze.data.items.map((i) => `Esperienza: ${i.titolo || i.organizzazione} — ${i.descrizione}`),
  ].join("\n");

  const extracted = await chatCompletion(
    [
      {
        role: "system",
        content: `Lo studente ha scritto un messaggio in chat per aggiungere competenze — collegale ai fatti elencati sotto (esami o esperienze reali, mai inventare un'evidenza). Se menziona un esame o un'esperienza non presente nella lista, ignora quella competenza (senza evidenza reale non entra in card). Categorizza ciascuna come "hard" (strumenti/tecnologie/metodologie da un'esperienza) o "academic" (da un esame) — mai altre categorie. Per le hard skill stima un "livello" ("beginner"|"intermediate"|"advanced"), null per le academic. Evidenza BREVE (nome esame o esperienza, mai il testo completo). STILE CV per "testo": breve, senza soggetto. La MIRA card è sempre in inglese: scrivi "testo" ed "evidenza_ref" in inglese anche se il messaggio è in italiano. Rispondi SOLO in JSON: {"items":[{"testo":"","categoria":"hard|academic","livello":"beginner|intermediate|advanced|null","evidenza_ref":""}]}`,
      },
      { role: "user", content: `Fatti disponibili:\n${contextLines || "nessuno"}\n\nMessaggio studente: "${userMessage}"` },
    ],
    { temperature: 0.3, maxTokens: 400, jsonMode: true }
  );

  const parsed = JSON.parse(extracted);
  const newItems: CompetenzaItem[] = (parsed.items ?? []).map((it: any) => ({
    id: crypto.randomUUID(),
    testo: it.testo ?? "",
    categoria: it.categoria === "academic" ? "academic" as const : "hard" as const,
    livello: parseLivello(it.livello),
    evidenza_ref: it.evidenza_ref ?? null,
    verified: false,
    origin: "onboarding",
  }));

  const items = [...blocks.competenze.data.items, ...newItems];

  const { data: updatedRows, error } = await (supabase.from("card_blocks") as any)
    .update({ prose_content: { items, soft_skills_testo: blocks.competenze.data.soft_skills_testo ?? null }, status: "draft" })
    .eq("student_profile_id", studentProfileId)
    .eq("block_type", "competenze")
    .select("id");
  if (error) {
    console.error("[MIRA] submitCompetenzeAggiunta write failed:", error);
    throw new Error(t("errorSaveCompetenze"));
  }
  if (!updatedRows || updatedRows.length === 0) {
    console.error("[MIRA] submitCompetenzeAggiunta: 0 righe aggiornate per studentProfileId", studentProfileId);
    throw new Error(t("errorCompetenzeRowNotFound"));
  }

  const message =
    newItems.length > 0
      ? t("competenzeAdded")
      : t("competenzeNotLinked");
  const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
  await saveFaseBConversation(supabase, profileId, fullConversation);

  return {
    message,
    phase: "competenze" as OnboardingPhase,
    competenze: { status: "draft" as CardBlockStatus, data: { items, soft_skills_testo: blocks.competenze.data.soft_skills_testo ?? null } },
  };
}

const RESUME_FASE_B_QUESTION_KEYS: Partial<Record<OnboardingPhase, string>> = {
  lingue: "lingueQuestion",
  interessi: "interessiQuestion",
  autodescrizione: "autodescrizioneQuestion",
};

/** La domanda si adatta a cosa MIRA sa già: a chi è in magistrale non si chiede più se vuole farla. */
async function pianoCarrieraQuestion(livello: string | null): Promise<string> {
  const t = await getTranslations("OnboardingEngine");
  return livello === "magistrale" ? t("pianoCarrieraMagistrale") : t("pianoCarrieraOther");
}

/** Resume cross-sessione: un solo messaggio di ripresa, mai il replay dell'intera Fase A. */
export async function resumeFaseB(phase: OnboardingPhase) {
  const { supabase, profileId, blocks } = await getOnboardingContext();
  const t = await getTranslations("OnboardingEngine");

  if (phase === "competenze") return startFaseB();
  if (phase === "chiusura") return completeChiusura();

  const questionKey = RESUME_FASE_B_QUESTION_KEYS[phase];
  const question = phase === "piano_carriera"
    ? await pianoCarrieraQuestion(blocks.header.data.livello)
    : questionKey ? t(questionKey) : t("resumeFallbackQuestion");
  const message = t("resumeFaseBMessage", { question });
  await saveFaseBConversation(supabase, profileId, [{ role: "assistant", content: message }]);
  return { message, phase };
}

export async function afterCompetenzeApproved(history: ChatMessage[]) {
  const { supabase, profileId } = await getOnboardingContext();
  const t = await getTranslations("OnboardingEngine");
  const message = t("lingueQuestion");
  const fullConversation = [...history, { role: "assistant" as const, content: message }];
  await saveFaseBConversation(supabase, profileId, fullConversation);
  return { message, phase: "lingue" as OnboardingPhase };
}

export async function submitLingue(history: ChatMessage[], userMessage: string) {
  const { supabase, profileId, studentProfileId, student } = await getOnboardingContext();
  const t = await getTranslations("OnboardingEngine");
  const conversation = [...history, { role: "user" as const, content: userMessage }];

  const cv = student.cv_summary as { languages?: Array<{ language: string; level: string }> } | null;
  const cvLanguages = cv?.languages ?? [];

  const data = await extractJSON(
    `Estrai le lingue menzionate: {"items":[{"lingua":"","livello":""}]}. Rispondi solo JSON.`,
    userMessage
  );
  const mentioned: LinguaItem[] = (data.items ?? []).map((it: any) => ({
    id: crypto.randomUUID(),
    lingua: it.lingua ?? "",
    livello: it.livello ?? "",
    certificazione: null,
    verified: false,
    origin: "onboarding",
  }));
  // Aggiunge le lingue già note dal CV che lo studente non ha ripetuto ora.
  const fromCV: LinguaItem[] = cvLanguages
    .filter((l) => !mentioned.some((m) => m.lingua.toLowerCase() === l.language.toLowerCase()))
    .map((l) => ({
      id: crypto.randomUUID(),
      lingua: l.language,
      livello: l.level,
      certificazione: null,
      verified: false,
      origin: "cv_upload",
    }));
  const items = [...mentioned, ...fromCV];

  await (supabase.from("card_blocks") as any)
    .update({ prose_content: { items }, status: "draft" })
    .eq("student_profile_id", studentProfileId)
    .eq("block_type", "lingue");

  const message = t("lingueDone");
  const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
  await saveFaseBConversation(supabase, profileId, fullConversation);

  return { message, phase: "lingue" as OnboardingPhase, lingue: { status: "draft" as CardBlockStatus, data: { items } } };
}

export async function afterLingueApproved(history: ChatMessage[]) {
  const { supabase, profileId } = await getOnboardingContext();
  const t = await getTranslations("OnboardingEngine");
  const message = t("interessiQuestion");
  const fullConversation = [...history, { role: "assistant" as const, content: message }];
  await saveFaseBConversation(supabase, profileId, fullConversation);
  return { message, phase: "interessi" as OnboardingPhase };
}

export async function submitInteressi(history: ChatMessage[], userMessage: string, subIndex: 0 | 1) {
  const { supabase, profileId, studentProfileId, student } = await getOnboardingContext();
  const t = await getTranslations("OnboardingEngine");
  const conversation = [...history, { role: "user" as const, content: userMessage }];

  if (subIndex === 0) {
    const message = t("interessiSubZero");
    const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
    await saveFaseBConversation(supabase, profileId, fullConversation);
    return { message, phase: "interessi" as OnboardingPhase, done: false };
  }

  const recentText = conversation
    .slice(-4)
    .map((m) => `${m.role === "user" ? "Studente" : "MIRA"}: ${m.content}`)
    .join("\n");

  const extracted = await chatCompletion(
    [
      {
        role: "system",
        content: `Scrivi una prosa breve (2-3 frasi) che unisce interessi professionali e personali dello studente, in PRIMA PERSONA (es. "I'm drawn to...", "I enjoy..."), solo fatti/temi concreti. La MIRA card è sempre in inglese: scrivi "testo" in inglese (prima persona) anche se lo studente ha risposto in italiano. Rispondi SOLO in JSON: {"testo":""}`,
      },
      { role: "user", content: recentText },
    ],
    { temperature: 0.3, maxTokens: 300, jsonMode: true }
  );
  const { testo } = JSON.parse(extracted) as { testo: string };

  await (supabase.from("card_blocks") as any)
    .update({ prose_content: { testo }, status: "draft" })
    .eq("student_profile_id", studentProfileId)
    .eq("block_type", "interessi");

  // LEGACY-WRITE(card-rework): rimuovere in Step 5/6.
  const mergedInterests = [...((student.interests as string[]) ?? []), testo].filter(Boolean);
  await (supabase.from("student_profiles") as any).update({ interests: mergedInterests }).eq("id", studentProfileId);

  const message = t("interessiDone");
  const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
  await saveFaseBConversation(supabase, profileId, fullConversation);

  return { message, phase: "interessi" as OnboardingPhase, done: true, interessi: { status: "draft" as CardBlockStatus, data: { testo } } };
}

async function getAutodescrizioneQuestions(): Promise<string[]> {
  const t = await getTranslations("OnboardingEngine");
  return [t("autodescrizioneQuestion"), t("autodescrizioneWorkStyle"), t("autodescrizioneDislike")];
}

export async function afterInteressiApproved(history: ChatMessage[]) {
  const { supabase, profileId } = await getOnboardingContext();
  const questions = await getAutodescrizioneQuestions();
  const message = questions[1]!;
  const fullConversation = [...history, { role: "assistant" as const, content: message }];
  await saveFaseBConversation(supabase, profileId, fullConversation);
  return { message, phase: "autodescrizione" as OnboardingPhase };
}

export async function submitAutodescrizioneRisposta(history: ChatMessage[], userMessage: string, subIndex: number) {
  const { supabase, profileId, studentProfileId } = await getOnboardingContext();
  const t = await getTranslations("OnboardingEngine");
  const conversation = [...history, { role: "user" as const, content: userMessage }];
  const questions = await getAutodescrizioneQuestions();
  const total = questions.length;
  const isLast = subIndex + 1 >= total;

  if (!isLast) {
    const message = questions[subIndex + 1]!;
    const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
    await saveFaseBConversation(supabase, profileId, fullConversation);
    return { message, phase: "autodescrizione" as OnboardingPhase, done: false };
  }

  const recentText = conversation
    .slice(-2 * total)
    .map((m) => `${m.role === "user" ? "Studente" : "MIRA"}: ${m.content}`)
    .join("\n");

  const extracted = await chatCompletion(
    [
      {
        role: "system",
        content: `Scrivi un paragrafo breve (max 4 frasi) in PRIMA PERSONA che riassume come lo studente si descrive, basato SOLO su quello che ha detto. Mai aggettivi di carattere dedotti da te ("intraprendente", "resiliente") — solo ciò che lo studente ha effettivamente detto, riformulato in prima persona scorrevole. La MIRA card è sempre in inglese: scrivi "testo" in inglese (prima persona: "I...") anche se lo studente ha risposto in italiano. Rispondi SOLO in JSON: {"testo":""}`,
      },
      { role: "user", content: recentText },
    ],
    { temperature: 0.3, maxTokens: 400, jsonMode: true }
  );
  const { testo } = JSON.parse(extracted) as { testo: string };

  await (supabase.from("card_blocks") as any)
    .update({ prose_content: { testo }, status: "draft" })
    .eq("student_profile_id", studentProfileId)
    .eq("block_type", "autodescrizione");

  // LEGACY-WRITE(card-rework): rimuovere in Step 5/6. profile_summary è ora uno specchio
  // in prima persona di autodescrizione (non più generato a parte da nessun altro flusso).
  await (supabase.from("student_profiles") as any).update({ profile_summary: testo }).eq("id", studentProfileId);

  const message = t("autodescrizioneDone");
  const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
  await saveFaseBConversation(supabase, profileId, fullConversation);

  return {
    message,
    phase: "autodescrizione" as OnboardingPhase,
    done: true,
    autodescrizione: { status: "draft" as CardBlockStatus, data: { testo } },
  };
}

export async function afterAutodescrizioneApproved(history: ChatMessage[]) {
  const { supabase, profileId, blocks } = await getOnboardingContext();
  const message = await pianoCarrieraQuestion(blocks.header.data.livello);
  const fullConversation = [...history, { role: "assistant" as const, content: message }];
  await saveFaseBConversation(supabase, profileId, fullConversation);
  return { message, phase: "piano_carriera" as OnboardingPhase };
}

export async function submitPianoCarriera(history: ChatMessage[], userMessage: string) {
  const { supabase, profileId, studentProfileId, student } = await getOnboardingContext();
  const t = await getTranslations("OnboardingEngine");
  const conversation = [...history, { role: "user" as const, content: userMessage }];

  const data = await extractJSON(
    `Estrai dal messaggio: {"stato":"direzione_chiara|ipotesi|esplorazione","testo":""}. "stato" è direzione_chiara SOLO se lo studente indica un settore/ruolo definito in modo esplicito e sicuro; ipotesi se menziona 2-3 direzioni in valutazione; esplorazione se non ha ancora idea o è vago. Non forzare mai direzione_chiara per default — "stato" è un dato solo interno, non va mai citato esplicitamente dentro "testo". "testo" va sempre valorizzato (riformula il messaggio in PRIMA PERSONA se serve, non lasciarlo vuoto) e scritto in inglese anche se il messaggio è in italiano — la MIRA card è sempre in inglese. Rispondi solo JSON.`,
    userMessage
  );

  const stato: PianoCarrieraStato =
    data.stato === "direzione_chiara" || data.stato === "ipotesi" ? data.stato : "esplorazione";
  const pianoData: PianoCarrieraProseContent = { stato, testo: data.testo || userMessage };

  await (supabase.from("card_blocks") as any)
    .update({ prose_content: pianoData, status: "draft" })
    .eq("student_profile_id", studentProfileId)
    .eq("block_type", "piano_carriera");

  // LEGACY-WRITE(card-rework): rimuovere in Step 5/6.
  const existingAvail = (student.availability as Record<string, unknown>) ?? {};
  const cp = (existingAvail.career_plan as Record<string, unknown>) ?? {};
  await (supabase.from("student_profiles") as any)
    .update({
      goals: [...((student.goals as string[]) ?? []), pianoData.testo].filter(Boolean),
      availability: { ...existingAvail, career_plan: { ...cp, short_term: pianoData.testo, clarity_level: stato } },
    })
    .eq("id", studentProfileId);

  const message = t("pianoCarrieraDone");
  const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
  await saveFaseBConversation(supabase, profileId, fullConversation);

  return { message, phase: "piano_carriera" as OnboardingPhase, piano_carriera: { status: "draft" as CardBlockStatus, data: pianoData } };
}

export async function afterPianoCarrieraApproved(history: ChatMessage[]) {
  const { supabase, profileId } = await getOnboardingContext();
  const result = await completeChiusura();
  const fullConversation = [...history, { role: "assistant" as const, content: result.message }];
  await saveFaseBConversation(supabase, profileId, fullConversation);
  return result;
}

async function completeChiusura() {
  const t = await getTranslations("OnboardingEngine");
  const message = t("chiusuraMessage");
  revalidatePath("/student");
  return { message, phase: "chiusura" as OnboardingPhase };
}

export async function forceCompleteOnboarding() {
  const { studentProfileId, supabase, profileId } = await getOnboardingContext();

  const placeholders: Record<string, unknown> = {
    header: { corso: "[test] Corso placeholder", livello: "triennale", anno: 1, anno_inizio: null, laurea_anno: null, media_voti: null },
    formazione: { items: [] },
    esperienze: { items: [{ id: crypto.randomUUID(), titolo: "[test] Esperienza placeholder", ruolo: "", organizzazione: "", periodo: "", descrizione: "[test] descrizione placeholder", verified: false, origin: "onboarding" }] },
    disponibilita: { cosa_cerca: "[test] stage", da_quando: "[test] subito", dove: "[test] Milano", vincoli: null },
    competenze: { items: [{ id: crypto.randomUUID(), testo: "[test] competenza placeholder", tipo: "teorica", evidenza_ref: "[test]", verified: false, origin: "onboarding" }] },
    lingue: { items: [{ id: crypto.randomUUID(), lingua: "[test] Inglese", livello: "B2", certificazione: null, verified: false, origin: "onboarding" }] },
    interessi: { testo: "[test] interessi placeholder" },
    autodescrizione: { testo: "[test] autodescrizione placeholder" },
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
