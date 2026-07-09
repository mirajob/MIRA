"use server";

import { chatCompletion } from "@mira/ai";
import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";
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
const REQUIRED_HEADER_FIELDS: Array<{ key: keyof HeaderProseContent; label: string }> = [
  { key: "universita", label: "l'università" },
  { key: "corso", label: "il corso di laurea" },
  { key: "livello", label: "il livello di studi" },
  { key: "anno", label: "l'anno che frequenti" },
  { key: "anno_inizio", label: "l'anno di inizio del corso" },
  { key: "laurea_anno", label: "l'anno di laurea previsto" },
];

function missingHeaderFields(data: HeaderProseContent, transcriptSkipped: boolean): string[] {
  const missing = REQUIRED_HEADER_FIELDS.filter((f) => !data[f.key]).map((f) => f.label);
  if (!transcriptSkipped && data.media_voti == null) missing.push("la media (ricarica il libretto)");
  return missing;
}

/** Campi richiesti perché l'Header sia completo. La media manca di senso se il libretto è stato saltato. */
function isHeaderComplete(data: HeaderProseContent, transcriptSkipped: boolean): boolean {
  return missingHeaderFields(data, transcriptSkipped).length === 0;
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

const LIVELLO_LABELS: Record<string, string> = {
  triennale: "la triennale",
  magistrale: "la magistrale",
  ciclo_unico: "il ciclo unico",
};

export async function startOnboarding(firstName: string): Promise<{ message: string }> {
  const { supabase, profileId, blocks } = await getOnboardingContext();

  const intro = `Ciao ${firstName}! Io sono MIRA.

Costruiamo insieme la tua MIRA card: ti serve ora per candidarti alle associazioni, ed è il profilo con cui le aziende potranno trovarti e contattarti direttamente quando sarai compatibile con quello che stanno cercando. Più è fatta bene, più lavora per te.

La tua MIRA card sarà scritta in inglese, il formato che aziende e associazioni si aspettano — ma con me puoi continuare a scrivere in italiano, ci penso io.`;

  // Se in registrazione ha già indicato il livello, lo confermiamo invece di richiederlo da zero.
  const knownLivello = blocks.header.data.livello;
  const closing = knownLivello
    ? `Dalla registrazione risulta che stai facendo ${LIVELLO_LABELS[knownLivello] ?? knownLivello}. Confermi?`
    : `Partiamo dalle basi: studi triennale, magistrale o ciclo unico?`;

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

export async function submitLivello(history: ChatMessage[], userMessage: string) {
  const { supabase, profileId, studentProfileId, blocks } = await getOnboardingContext();
  const conversation = [...history, { role: "user" as const, content: userMessage }];

  const knownLivello = blocks.header.data.livello as string | null;
  const data = await extractJSON(
    knownLivello
      ? `Livello di studi già indicato in registrazione: "${knownLivello}". Se il messaggio lo conferma (es. "sì", "esatto", "confermo", "corretto"), usa questo valore. Se lo corregge esplicitamente con un livello diverso, usa quello nuovo. Estrai: {"degree_level":"triennale|magistrale|ciclo_unico"}. Se non è chiaro, null. Rispondi solo JSON.`
      : `Estrai il livello di studi dal messaggio: {"degree_level":"triennale|magistrale|ciclo_unico"}. Se non è chiaro, null. Rispondi solo JSON.`,
    userMessage
  );
  const livello = data.degree_level as string | null;

  const { data: updatedRows, error } = await (supabase.from("card_blocks") as any)
    .update({ prose_content: { ...blocks.header.data, livello } })
    .eq("student_profile_id", studentProfileId)
    .eq("block_type", "header")
    .select("id");
  if (error) {
    console.error("[MIRA] submitLivello card_blocks write failed:", error);
    throw new Error("Impossibile salvare il livello di studi — riprova.");
  }
  if (!updatedRows || updatedRows.length === 0) {
    console.error("[MIRA] submitLivello: 0 righe aggiornate per studentProfileId", studentProfileId);
    throw new Error("Riga Header non trovata per questo studente — riprova.");
  }

  // LEGACY-WRITE(card-rework): rimuovere in Step 5/6.
  await (supabase.from("student_profiles") as any).update({ degree_level: livello }).eq("id", studentProfileId);

  let message: string;
  let phase: OnboardingPhase;

  if (!livello) {
    message = `Scusa, non ho capito bene — studi triennale, magistrale o ciclo unico?`;
    phase = "livello";
  } else if (livello === "magistrale") {
    message = `Perfetto. Prima di procedere, dove hai fatto la triennale, in che corso e con che voto di laurea?`;
    phase = "previous_degree";
  } else {
    message = `Carica il libretto in PDF: leggo corso, esami, voti e media direttamente da lì. Se non ce l'hai sotto mano, puoi saltare.`;
    phase = "transcript";
  }

  const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
  await saveConversation(supabase, profileId, fullConversation);

  return { message, phase, header: { status: "empty" as CardBlockStatus, data: { ...blocks.header.data, livello } } };
}

export async function submitPreviousDegree(history: ChatMessage[], userMessage: string) {
  const { supabase, profileId, studentProfileId, blocks } = await getOnboardingContext();
  const conversation = [...history, { role: "user" as const, content: userMessage }];

  const data = await extractJSON(
    `Estrai dal messaggio: {"universita":"università triennale","corso":"corso triennale","voto_laurea":"voto di laurea","tema_tesi":"tema tesi, o null"}. Se un campo non emerge, null. Rispondi solo JSON.`,
    userMessage
  );

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
    throw new Error("Impossibile salvare la formazione precedente — riprova.");
  }
  if (!updatedRows || updatedRows.length === 0) {
    console.error("[MIRA] submitPreviousDegree: 0 righe aggiornate per studentProfileId", studentProfileId);
    throw new Error("Riga Header non trovata per questo studente — riprova.");
  }

  const message = `Grazie. Ora carica il libretto della magistrale: leggo corso, esami, voti e media aggiornati. Se non ce l'hai sotto mano, puoi saltare.`;
  const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
  await saveConversation(supabase, profileId, fullConversation);

  return { message, phase: "transcript" as OnboardingPhase, header: { status: "empty" as CardBlockStatus, data: headerData } };
}

export async function skipTranscript(history: ChatMessage[]) {
  const { supabase, profileId, blocks } = await getOnboardingContext();
  const message = `Va bene — dimmi almeno il nome del corso e l'anno che frequenti: potrai caricare il libretto quando vuoi dal tuo Profilo, aggiornando media ed esami.`;
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
  const avgText = stats.weightedAverage ? `, media ${stats.weightedAverage.toFixed(1)}/30` : "";
  const missing = missingHeaderFields(blocks.header.data, false);

  const message = missing.length > 0
    ? `Fatto: ${stats.coursesCount} esami, ${stats.totalCredits} CFU${avgText}. Mi manca solo ${missing.join(" e ")} — dimmelo e la card è pronta da confermare.`
    : `Fatto: ${stats.coursesCount} esami, ${stats.totalCredits} CFU${avgText}. La card è pronta — conferma il blocco Header qui a destra.`;

  const fullConversation = [...history, { role: "assistant" as const, content: message }];
  await saveConversation(supabase, profileId, fullConversation);
  return { message, phase: "header_gap" as OnboardingPhase, header: blocks.header, formazione: blocks.formazione };
}

export async function submitHeaderGap(history: ChatMessage[], userMessage: string) {
  const { supabase, profileId, studentProfileId, student, blocks } = await getOnboardingContext();
  const conversation = [...history, { role: "user" as const, content: userMessage }];
  const transcriptSkipped = conversation.some((m) => m.content === "[Libretto saltato]");

  const data = await extractJSON(
    `Estrai dal messaggio ciò che manca sul percorso accademico: {"universita":"nome università, o null","corso":"nome corso, o null","livello":"triennale|magistrale|ciclo_unico, o null","anno":0,"anno_inizio":"anno di immatricolazione a questo corso, es. 2023, o null","laurea_anno":"anno di laurea previsto, es. 2026, o null"}. Se un campo non emerge, null. Rispondi solo JSON.`,
    userMessage
  );

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

  const complete = isHeaderComplete(headerData, transcriptSkipped);

  const { data: updatedRows, error } = await (supabase.from("card_blocks") as any)
    .update({ prose_content: headerData, status: complete ? "draft" : "empty" })
    .eq("student_profile_id", studentProfileId)
    .eq("block_type", "header")
    .select("id");
  if (error) {
    console.error("[MIRA] submitHeaderGap card_blocks write failed:", error);
    throw new Error("Impossibile salvare l'Header — riprova.");
  }
  if (!updatedRows || updatedRows.length === 0) {
    console.error("[MIRA] submitHeaderGap: 0 righe aggiornate per studentProfileId", studentProfileId);
    throw new Error("Riga Header non trovata per questo studente — riprova.");
  }

  const message = complete
    ? `Perfetto, la card è pronta — conferma il blocco Header qui a destra per continuare.`
    : `Mi manca ancora ${missingHeaderFields(headerData, transcriptSkipped).join(" e ")}.`;

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
  const message = `Hai un CV? Caricalo e parto da lì per farti domande mirate sulle tue esperienze. Se non ce l'hai, nessun problema: lo costruiamo parlando.`;
  const fullConversation = [...history, { role: "assistant" as const, content: message }];
  await saveConversation(supabase, profileId, fullConversation);
  revalidatePath("/student/onboarding");
  return { message, phase: "cv" as OnboardingPhase };
}

const HIDDEN_EXPERIENCE_QUESTION = `C'è qualcosa che non hai mai messo nel CV? Progetti personali, competizioni, sport a livello agonistico, volontariato, lavori — qualsiasi cosa pensi possa rappresentarti.`;
const DETAILED_DESCRIPTION_THRESHOLD = 60;

export async function skipCV(history: ChatMessage[]) {
  const { supabase, profileId } = await getOnboardingContext();
  const message = `Nessun problema, lo costruiamo parlando. ${HIDDEN_EXPERIENCE_QUESTION}`;
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
  const cv = student.cv_summary as { experiences?: Array<{ title: string; organization: string; description: string }> } | null;
  const experiences = cv?.experiences ?? [];
  const first = experiences[0];

  let message: string;
  if (!first) {
    message = HIDDEN_EXPERIENCE_QUESTION;
  } else if (first.description && first.description.length >= DETAILED_DESCRIPTION_THRESHOLD) {
    // Il CV descrive già bene questa esperienza: la propongo com'è invece di chiedere da zero.
    message = `Dal CV: "${first.title} @ ${first.organization}" — ${first.description}\n\nVa bene così, o vuoi aggiungere qualcosa?`;
  } else {
    message = `Ho trovato ${experiences.length === 1 ? "un'esperienza" : `${experiences.length} esperienze`}. Su ${first.title} @ ${first.organization} — cosa hai fatto tu, concretamente?`;
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
  const conversation = [...history, { role: "user" as const, content: userMessage }];
  const isLast = subIndex + 1 >= totalSubQuestions;

  if (!isLast) {
    const cv = student.cv_summary as { experiences?: Array<{ title: string; organization: string; description: string }> } | null;
    const experiences = cv?.experiences ?? [];
    const next = experiences[subIndex + 1];

    let nextQuestion: string;
    if (!next) {
      nextQuestion = HIDDEN_EXPERIENCE_QUESTION;
    } else if (next.description && next.description.length >= DETAILED_DESCRIPTION_THRESHOLD) {
      nextQuestion = `Dal CV: "${next.title} @ ${next.organization}" — ${next.description}\n\nVa bene così, o vuoi aggiungere qualcosa?`;
    } else {
      nextQuestion = `Su ${next.title} @ ${next.organization} — cosa hai fatto tu, concretamente?`;
    }

    // Breve reazione reale a quello che ha appena detto, non un "Segnato" fisso —
    // altrimenti sembra che MIRA non legga le risposte.
    const reaction = await chatCompletion(
      [
        {
          role: "system",
          content: `Lo studente ha appena risposto a una domanda su un'esperienza. Scrivi UNA riga breve che reagisca concretamente a quello che ha detto (fatti, non entusiasmo generico tipo "fantastico!"). Poi, a capo, prosegui con la prossima domanda esatta che ti viene data. Rispondi SOLO con il testo finale del messaggio, niente JSON.`,
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
        content: `Dalla conversazione, estrai le esperienze raccontate dallo studente. Per ognuna scrivi una descrizione di 2-3 righe di cosa ha fatto concretamente — fatti, non aggettivi di carattere. La MIRA card è sempre in inglese: scrivi "titolo" e "descrizione" in inglese anche se la conversazione è in italiano (non tradurre invece "organizzazione" se è un nome proprio, es. il nome di un'azienda). Rispondi SOLO in JSON: {"items":[{"titolo":"","organizzazione":"","periodo":"","descrizione":""}]}`,
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

  const message = `Scritte — controlla il blocco Esperienze qui a destra. Confermalo quando sei pronto.`;
  const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
  await saveConversation(supabase, profileId, fullConversation);

  return { message, phase: "esperienze" as OnboardingPhase, done: true, items };
}

/** Chiamata dal pannello dopo che Esperienze è stato approvato lì. */
export async function afterEsperienzeApproved(history: ChatMessage[]) {
  const { supabase, profileId } = await getOnboardingContext();
  const message = `Ultima cosa per sbloccare la candidatura: hai una disponibilità lavorativa da indicare, così le aziende possono trovarti quando sei compatibile? Dimmi cosa cerchi — uno stage in un ambito specifico, un part-time, un progetto — e da quando: va bene sia una data aperta ("da settembre in avanti") sia un periodo preciso ("da giugno ad agosto"). Dimmi pure se hai una preferenza di sede. Se invece non sei in cerca al momento o sei già impegnato altrove, dimmelo pure: va bene anche così.`;
  const fullConversation = [...history, { role: "assistant" as const, content: message }];
  await saveConversation(supabase, profileId, fullConversation);
  return { message, phase: "disponibilita" as OnboardingPhase };
}

export async function submitDisponibilita(history: ChatMessage[], userMessage: string) {
  const { supabase, profileId, studentProfileId, student } = await getOnboardingContext();
  const conversation = [...history, { role: "user" as const, content: userMessage }];

  const data = await extractJSON(
    `Estrai dal messaggio: {"cosa_cerca":"tipo di opportunità: stage curriculare|stage extracurriculare|part-time|progetto|non in cerca|già occupato","ambito":"settore o ruolo cercato, es. venture capital, marketing, finanza","periodo":"il quando: una data di inizio aperta (es. 'da settembre 2026'), un intervallo preciso (es. 'da giugno ad agosto 2026'), o uno stato speciale se già occupato/non in cerca (es. 'già impegnato fino a dicembre')","dove":""}. Se un campo non emerge, stringa vuota. La MIRA card è sempre in inglese: scrivi ogni campo in inglese anche se il messaggio è in italiano. Rispondi solo JSON.`,
    userMessage
  );

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

  const message = `Segnato — controlla il blocco Disponibilità. Confermalo per sbloccare la candidatura.`;
  const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
  await saveConversation(supabase, profileId, fullConversation);

  return { message, phase: "disponibilita" as OnboardingPhase, disponibilita: { status: "draft" as CardBlockStatus, data: disponibilitaData } };
}

/** Chiamata dal pannello dopo che Disponibilità è stata approvata lì: apre il gate. */
export async function afterDisponibilitaApproved(history: ChatMessage[]) {
  const { supabase, profileId, studentProfileId } = await getOnboardingContext();

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

  const message = `Candidatura sbloccata. La tua card è al ${pct}%: puoi già candidarti alle associazioni su MIRA. Oppure completiamo le ultime sezioni — competenze, interessi, come ti descrivi, piano di carriera — in circa 5 minuti: le associazioni vedono un profilo molto più forte.`;
  const fullConversation = [...history, { role: "assistant" as const, content: message }];
  await saveConversation(supabase, profileId, fullConversation);

  revalidatePath("/student");

  return { message, phase: "gate" as OnboardingPhase, progressPct: pct };
}

// ---------------------------------------------------------------------------
// Fase B — invariata nel contenuto delle domande (rimandato al prossimo giro),
// solo adattata a non chiamare più approveCardBlock da sola (fatto dal pannello).
// ---------------------------------------------------------------------------

/** Distingue esplicitamente esperienza (cosa hai fatto) da competenza (cosa hai imparato/sai fare) —
 * senza questo l'AI tende a ricopiare la descrizione dell'esperienza come se fosse una competenza. */
const COMPETENZE_EXTRACTION_PROMPT = `Proponi competenze concrete, una per riga, derivate dai fatti elencati (esami o esperienze reali, mai inventate).

DIFFERENZA FONDAMENTALE (non confonderla mai):
- Un'ESPERIENZA è un'attività che lo studente ha fatto (un progetto, un programma, un'iniziativa) — è già scritta nei fatti sotto, non va ripetuta.
- Una COMPETENZA è un'abilità trasferibile che lo studente ha imparato o dimostrato facendo quella cosa — MAI una parafrasi o un riassunto dell'esperienza stessa.

Esempio SBAGLIATO (vietato): esperienza "Ha costruito una piattaforma AI-first per l'orientamento professionale, usando Claude Code, Vercel, Supabase" → competenza "Sviluppo di una piattaforma AI-first per l'orientamento professionale" (è solo una copia del fatto, non un'abilità).
Esempio CORRETTO per la stessa esperienza → competenze come "Uso di strumenti di sviluppo AI-assisted (Claude Code, Vercel, Supabase)" oppure "Capacità di portare avanti un progetto in autonomia dall'idea al prodotto funzionante".

Per ogni esame proponi al massimo una competenza teorica (quella più specifica e rilevante — mai generica tipo "conoscenza della materia"). Per ogni esperienza proponi 1-2 competenze applicate concrete. Ogni competenza indica se è "teorica" o "applicata" e a quale esame/esperienza fa riferimento (evidenza) — mai una competenza senza un'evidenza reale nei fatti forniti. Vietati aggettivi di carattere. La MIRA card è sempre in inglese: scrivi "testo" ed "evidenza_ref" in inglese anche se i fatti forniti sono in italiano. Rispondi SOLO in JSON: {"items":[{"testo":"","tipo":"teorica|applicata","evidenza_ref":""}]}`;

export async function startFaseB() {
  const { supabase, profileId, blocks } = await getOnboardingContext();

  const contextLines = [
    ...blocks.formazione.data.items.map((i) => `Esame: ${i.esame} (voto ${i.voto ?? "idoneo"})`),
    ...blocks.esperienze.data.items.map((i) => `Esperienza: ${i.titolo || i.organizzazione} — ${i.descrizione}`),
  ].join("\n");

  const extracted = await chatCompletion(
    [
      { role: "system", content: COMPETENZE_EXTRACTION_PROMPT },
      { role: "user", content: contextLines || "Nessun esame o esperienza disponibile." },
    ],
    { temperature: 0.3, maxTokens: 700, jsonMode: true }
  );

  const parsed = JSON.parse(extracted);
  const items: CompetenzaItem[] = (parsed.items ?? []).map((it: any) => ({
    id: crypto.randomUUID(),
    testo: it.testo ?? "",
    tipo: it.tipo === "applicata" ? "applicata" : it.tipo === "teorica" ? "teorica" : null,
    evidenza_ref: it.evidenza_ref ?? null,
    verified: false,
    origin: "onboarding",
  }));

  const { studentProfileId } = await getOnboardingContext();
  const { data: updatedRows, error } = await (supabase.from("card_blocks") as any)
    .update({ prose_content: { items }, status: "draft" })
    .eq("student_profile_id", studentProfileId)
    .eq("block_type", "competenze")
    .select("id");
  if (error) {
    console.error("[MIRA] startFaseB write failed:", error);
    throw new Error("Impossibile salvare le competenze proposte — riprova.");
  }
  if (!updatedRows || updatedRows.length === 0) {
    console.error("[MIRA] startFaseB: 0 righe aggiornate per studentProfileId", studentProfileId);
    throw new Error("Riga Competenze non trovata per questo studente — riprova.");
  }

  const listText = items.map((i) => `• ${i.testo}${i.evidenza_ref ? ` (${i.tipo ?? "—"} — ${i.evidenza_ref})` : ""}`).join("\n");
  const message = `Completiamo insieme le ultime sezioni: 5 minuti e la tua card è finita.\n\nDai tuoi esami e dalle tue esperienze ti propongo queste competenze:\n${listText || "(nessuna bozza — puoi aggiungerne dal Profilo dopo)"}\n\nConfermale a destra quando vanno bene.`;

  await saveFaseBConversation(supabase, profileId, [{ role: "assistant", content: message }]);

  return { message, phase: "competenze" as OnboardingPhase, competenze: { status: "draft" as CardBlockStatus, data: { items } } };
}

/**
 * Fase "competenze": MIRA propone le competenze e lo studente può solo Confermare dal
 * pannello — ma può anche scrivere in chat per aggiungerne altre. Senza questa funzione
 * quel messaggio cadeva nel vuoto senza risposta (nessun ramo lo intercettava).
 */
export async function submitCompetenzeAggiunta(history: ChatMessage[], userMessage: string) {
  const { supabase, profileId, studentProfileId, blocks } = await getOnboardingContext();
  const conversation = [...history, { role: "user" as const, content: userMessage }];

  const contextLines = [
    ...blocks.formazione.data.items.map((i) => `Esame: ${i.esame} (voto ${i.voto ?? "idoneo"})`),
    ...blocks.esperienze.data.items.map((i) => `Esperienza: ${i.titolo || i.organizzazione} — ${i.descrizione}`),
  ].join("\n");

  const extracted = await chatCompletion(
    [
      {
        role: "system",
        content: `${COMPETENZE_EXTRACTION_PROMPT}\n\nLo studente ha scritto un messaggio in chat per aggiungere competenze — collegale ai fatti elencati sotto (mai inventare un'evidenza). Se menziona un esame o un'esperienza non presente nella lista, ignora quella competenza (senza evidenza reale non entra in card).`,
      },
      { role: "user", content: `Fatti disponibili:\n${contextLines || "nessuno"}\n\nMessaggio studente: "${userMessage}"` },
    ],
    { temperature: 0.3, maxTokens: 400, jsonMode: true }
  );

  const parsed = JSON.parse(extracted);
  const newItems: CompetenzaItem[] = (parsed.items ?? []).map((it: any) => ({
    id: crypto.randomUUID(),
    testo: it.testo ?? "",
    tipo: it.tipo === "applicata" ? "applicata" : it.tipo === "teorica" ? "teorica" : null,
    evidenza_ref: it.evidenza_ref ?? null,
    verified: false,
    origin: "onboarding",
  }));

  const items = [...blocks.competenze.data.items, ...newItems];

  const { data: updatedRows, error } = await (supabase.from("card_blocks") as any)
    .update({ prose_content: { items }, status: "draft" })
    .eq("student_profile_id", studentProfileId)
    .eq("block_type", "competenze")
    .select("id");
  if (error) {
    console.error("[MIRA] submitCompetenzeAggiunta write failed:", error);
    throw new Error("Impossibile salvare le competenze — riprova.");
  }
  if (!updatedRows || updatedRows.length === 0) {
    console.error("[MIRA] submitCompetenzeAggiunta: 0 righe aggiornate per studentProfileId", studentProfileId);
    throw new Error("Riga Competenze non trovata per questo studente — riprova.");
  }

  const message =
    newItems.length > 0
      ? `Aggiunte — controlla le competenze a destra. Confermale quando vanno bene.`
      : `Non sono riuscito a collegarlo a un esame o un'esperienza concreta — puoi aggiungerla direttamente nel blocco Competenze a destra, indicando a cosa si riferisce.`;
  const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
  await saveFaseBConversation(supabase, profileId, fullConversation);

  return { message, phase: "competenze" as OnboardingPhase, competenze: { status: "draft" as CardBlockStatus, data: { items } } };
}

const RESUME_FASE_B_QUESTIONS: Partial<Record<OnboardingPhase, string>> = {
  lingue: `Che lingue conosci, e a che livello? (Se il tuo corso è in inglese, indicalo pure insieme alle altre.)`,
  interessi: `Cosa ti interessa a livello professionale — settori, ruoli, tipi di lavoro?`,
  autodescrizione: `Raccontami un progetto di cui vai fiero: che ruolo hai preso?`,
};

/** La domanda si adatta a cosa MIRA sa già: a chi è in magistrale non si chiede più se vuole farla. */
function pianoCarrieraQuestion(livello: string | null): string {
  if (livello === "magistrale") {
    return `Come ti vedi nei prossimi 1-2 anni dopo la magistrale? Hai una direzione professionale precisa, qualche ipotesi, o stai ancora esplorando?`;
  }
  return `Come ti vedi nei prossimi 1-2 anni? Magistrale, un periodo di exchange, il primo lavoro in un ambito preciso — hai una direzione chiara, qualche ipotesi, o stai ancora esplorando?`;
}

/** Resume cross-sessione: un solo messaggio di ripresa, mai il replay dell'intera Fase A. */
export async function resumeFaseB(phase: OnboardingPhase) {
  const { supabase, profileId, blocks } = await getOnboardingContext();

  if (phase === "competenze") return startFaseB();
  if (phase === "chiusura") return completeChiusura();

  const question = phase === "piano_carriera" ? pianoCarrieraQuestion(blocks.header.data.livello) : RESUME_FASE_B_QUESTIONS[phase] ?? "Continuiamo?";
  const message = `Bentornato! Completiamo insieme le ultime sezioni della tua card.\n\n${question}`;
  await saveFaseBConversation(supabase, profileId, [{ role: "assistant", content: message }]);
  return { message, phase };
}

export async function afterCompetenzeApproved(history: ChatMessage[]) {
  const { supabase, profileId } = await getOnboardingContext();
  const message = RESUME_FASE_B_QUESTIONS.lingue!;
  const fullConversation = [...history, { role: "assistant" as const, content: message }];
  await saveFaseBConversation(supabase, profileId, fullConversation);
  return { message, phase: "lingue" as OnboardingPhase };
}

export async function submitLingue(history: ChatMessage[], userMessage: string) {
  const { supabase, profileId, studentProfileId, student } = await getOnboardingContext();
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

  const message = `Segnate — controlla il blocco Lingue. Confermalo quando va bene.`;
  const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
  await saveFaseBConversation(supabase, profileId, fullConversation);

  return { message, phase: "lingue" as OnboardingPhase, lingue: { status: "draft" as CardBlockStatus, data: { items } } };
}

export async function afterLingueApproved(history: ChatMessage[]) {
  const { supabase, profileId } = await getOnboardingContext();
  const message = RESUME_FASE_B_QUESTIONS.interessi!;
  const fullConversation = [...history, { role: "assistant" as const, content: message }];
  await saveFaseBConversation(supabase, profileId, fullConversation);
  return { message, phase: "interessi" as OnboardingPhase };
}

export async function submitInteressi(history: ChatMessage[], userMessage: string, subIndex: 0 | 1) {
  const { supabase, profileId, studentProfileId, student } = await getOnboardingContext();
  const conversation = [...history, { role: "user" as const, content: userMessage }];

  if (subIndex === 0) {
    const message = `E fuori dall'università? Interessi personali, hobby, attività che senti ti rappresentino.`;
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
        content: `Scrivi una prosa breve (2-3 frasi) che unisce interessi professionali e personali dello studente, in terza persona, solo fatti/temi concreti. La MIRA card è sempre in inglese: scrivi "testo" in inglese anche se lo studente ha risposto in italiano. Rispondi SOLO in JSON: {"testo":""}`,
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

  const message = `Scritto — controlla il blocco Interessi. Confermalo quando va bene.`;
  const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
  await saveFaseBConversation(supabase, profileId, fullConversation);

  return { message, phase: "interessi" as OnboardingPhase, done: true, interessi: { status: "draft" as CardBlockStatus, data: { testo } } };
}

const AUTODESCRIZIONE_QUESTIONS = [
  RESUME_FASE_B_QUESTIONS.autodescrizione!,
  `Quando lavori meglio — da solo, in gruppo, con una direzione chiara o con più libertà?`,
  `Cosa ti pesa fare, invece?`,
];

export async function afterInteressiApproved(history: ChatMessage[]) {
  const { supabase, profileId } = await getOnboardingContext();
  const message = AUTODESCRIZIONE_QUESTIONS[1]!;
  const fullConversation = [...history, { role: "assistant" as const, content: message }];
  await saveFaseBConversation(supabase, profileId, fullConversation);
  return { message, phase: "autodescrizione" as OnboardingPhase };
}

export async function submitAutodescrizioneRisposta(history: ChatMessage[], userMessage: string, subIndex: number) {
  const { supabase, profileId, studentProfileId } = await getOnboardingContext();
  const conversation = [...history, { role: "user" as const, content: userMessage }];
  const total = AUTODESCRIZIONE_QUESTIONS.length;
  const isLast = subIndex + 1 >= total;

  if (!isLast) {
    const message = AUTODESCRIZIONE_QUESTIONS[subIndex + 1]!;
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

  const message = `L'ho scritto con parole tue — modificalo pure, ed è la parte più personale della card. Confermalo quando va bene.`;
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
  const message = pianoCarrieraQuestion(blocks.header.data.livello);
  const fullConversation = [...history, { role: "assistant" as const, content: message }];
  await saveFaseBConversation(supabase, profileId, fullConversation);
  return { message, phase: "piano_carriera" as OnboardingPhase };
}

export async function submitPianoCarriera(history: ChatMessage[], userMessage: string) {
  const { supabase, profileId, studentProfileId, student } = await getOnboardingContext();
  const conversation = [...history, { role: "user" as const, content: userMessage }];

  const data = await extractJSON(
    `Estrai dal messaggio: {"stato":"direzione_chiara|ipotesi|esplorazione","testo":""}. "stato" è direzione_chiara SOLO se lo studente indica un settore/ruolo definito in modo esplicito e sicuro; ipotesi se menziona 2-3 direzioni in valutazione; esplorazione se non ha ancora idea o è vago. Non forzare mai direzione_chiara per default. "testo" va sempre valorizzato (riformula il messaggio se serve, non lasciarlo vuoto) e scritto in inglese anche se il messaggio è in italiano — la MIRA card è sempre in inglese. Rispondi solo JSON.`,
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

  const message = `Segnato — nessun problema se non hai ancora deciso, è un dato vero anche così. Conferma il blocco Piano di carriera per chiudere la tua card.`;
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
  const message = `La tua card è completa! La trovi nel tuo Profilo, modificabile quando vuoi. In bocca al lupo per le tue candidature.`;
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
