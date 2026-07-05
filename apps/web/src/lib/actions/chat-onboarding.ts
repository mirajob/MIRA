"use server";

import { chatCompletion } from "@mira/ai";
import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { generatePathwayAnalysis } from "./pathway";
import { ensureCardBlocksExist, approveCardBlock } from "./card-blocks";
import { EMPTY_ONBOARDING_BLOCKS } from "@/lib/onboarding-defaults";
import type {
  CardBlockType,
  CardBlockStatus,
  HeaderProseContent,
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

export type OnboardingPhase =
  | "welcome"
  | "dati_base"
  | "dati_base_magistrale"
  | "transcript"
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
  header: { status: CardBlockStatus; data: HeaderProseContent };
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

const FASE_A_BLOCK_TYPES = ["header", "formazione", "esperienze", "disponibilita"] as const;

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
    .select("block_type, prose_content, status")
    .eq("student_profile_id", studentProfileId)
    .in("block_type", ALL_BLOCK_TYPES);

  const blocks: OnboardingBlocksState = JSON.parse(JSON.stringify(EMPTY_ONBOARDING_BLOCKS));
  for (const row of blockRows ?? []) {
    // Difesa contro righe con prose_content vuoto ({}) create prima che ensureCardBlocksExist
    // scrivesse una forma di default corretta — mai passare {} ai renderer che si aspettano items/testo.
    const hasShape = row.prose_content && Object.keys(row.prose_content).length > 0;
    (blocks as any)[row.block_type] = {
      status: row.status,
      data: hasShape ? row.prose_content : (blocks as any)[row.block_type].data,
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
      const needsPreviousDegree =
        blocks.header.data.livello === "magistrale" &&
        !(student.availability as any)?.previous_degree?.university &&
        conversation.some((m) => m.content.includes("carriera precedente"));
      phase = needsPreviousDegree ? "dati_base_magistrale" : "dati_base";
    } else if (!transcriptUploaded && !skippedTranscript) {
      phase = "transcript";
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
  const { supabase, profileId } = await getOnboardingContext();

  const message = `Ciao ${firstName}! Io sono MIRA.

Costruiamo insieme la tua MIRA card: ti serve ora per candidarti, ed è il profilo con cui le aziende potranno trovarti e contattarti direttamente. Più è fatta bene, più lavora per te.

Partiamo dalle basi: studi triennale, magistrale o ciclo unico? E che corso?`;

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

export async function submitDatiBase(history: ChatMessage[], userMessage: string) {
  const { supabase, profileId, studentProfileId } = await getOnboardingContext();
  const conversation = [...history, { role: "user" as const, content: userMessage }];

  const data = await extractJSON(
    `Estrai dal messaggio dello studente: {"degree_level":"triennale|magistrale|ciclo_unico","degree_program":"nome corso","current_year":0}. Se un campo non emerge, null. Rispondi solo JSON.`,
    userMessage
  );

  // LEGACY-WRITE(card-rework): rimuovere in Step 5/6.
  await (supabase.from("student_profiles") as any)
    .update({
      degree_program: data.degree_program || null,
      degree_level: data.degree_level || null,
      current_year: data.current_year || null,
    })
    .eq("id", studentProfileId);

  await (supabase.from("card_blocks") as any)
    .update({
      prose_content: {
        corso: data.degree_program || null,
        livello: data.degree_level || null,
        anno: data.current_year || null,
        laurea_anno: null,
        media_voti: null,
      },
      status: "draft",
    })
    .eq("student_profile_id", studentProfileId)
    .eq("block_type", "header");

  let message: string;
  let phase: OnboardingPhase;

  if (data.degree_level === "magistrale") {
    message = `Perfetto. Se sei in magistrale, prima di andare avanti ho bisogno di ricostruire brevemente la tua carriera precedente. In quale università hai fatto la triennale, con che corso e con che voto ti sei laureato? Se vuoi, dimmi anche su cosa hai fatto la tesi.`;
    phase = "dati_base_magistrale";
  } else {
    message = `Segnato — lo vedi già sulla card qui a destra. Conferma il blocco Header quando sei pronto, poi passiamo al libretto.`;
    phase = "dati_base";
  }

  const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
  await saveConversation(supabase, profileId, fullConversation);

  const headerData: HeaderProseContent = {
    corso: data.degree_program || null,
    livello: data.degree_level || null,
    anno: data.current_year || null,
    laurea_anno: null,
    media_voti: null,
  };

  return { message, phase, header: { status: "draft" as CardBlockStatus, data: headerData } };
}

export async function submitPreviousDegree(history: ChatMessage[], userMessage: string) {
  const { supabase, profileId, studentProfileId, student } = await getOnboardingContext();
  const conversation = [...history, { role: "user" as const, content: userMessage }];

  const data = await extractJSON(
    `Estrai dal messaggio: {"university":"università triennale","program":"corso triennale","grade":"voto di laurea","thesis_topic":"tema tesi"}. Se non emerge, stringa vuota. Rispondi solo JSON.`,
    userMessage
  );

  // LEGACY-WRITE(card-rework): rimuovere in Step 5/6.
  const existingAvail = (student.availability as Record<string, unknown>) ?? {};
  await (supabase.from("student_profiles") as any)
    .update({ availability: { ...existingAvail, previous_degree: data } })
    .eq("id", studentProfileId);

  const message = `Grazie. Conferma il blocco Header qui a destra, poi carica il transcript della magistrale: da lì aggiorno esami, voti, CFU e media.`;
  const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
  await saveConversation(supabase, profileId, fullConversation);

  return { message, phase: "dati_base" as OnboardingPhase };
}

export async function confirmHeaderAndAskTranscript(history: ChatMessage[]) {
  const { supabase, profileId, blocks } = await getOnboardingContext();
  await approveCardBlock("header");

  const isMagistrale = blocks.header.data.livello === "magistrale";
  const message = isMagistrale
    ? `Ora puoi caricare il transcript della magistrale, così estraggo esami, voti, CFU e media aggiornati. Se non ce l'hai sotto mano, puoi saltare.`
    : `Se ce l'hai, carica il tuo transcript universitario (PDF): estraggo esami, voti, CFU e media ponderata automaticamente. Se non ce l'hai sotto mano, puoi saltare e andiamo avanti lo stesso.`;

  const fullConversation = [...history, { role: "assistant" as const, content: message }];
  await saveConversation(supabase, profileId, fullConversation);
  revalidatePath("/student/onboarding");

  return { message, phase: "transcript" as OnboardingPhase };
}

export async function skipTranscript(history: ChatMessage[]) {
  const { supabase, profileId } = await getOnboardingContext();
  const message = `Va bene, nessun problema — potrai caricarlo quando vuoi dal tuo Profilo. Hai già un CV? Lo uso per capire meglio le tue esperienze prima di farti domande mirate.`;
  const fullConversation: ChatMessage[] = [
    ...history,
    { role: "user", content: "[Libretto saltato]" },
    { role: "assistant", content: message },
  ];
  await saveConversation(supabase, profileId, fullConversation);
  return { message, phase: "cv" as OnboardingPhase };
}

export async function reactToTranscript(
  history: ChatMessage[],
  stats: { coursesCount: number; totalCredits: number; weightedAverage: number | null }
) {
  const { supabase, profileId, blocks } = await getOnboardingContext();
  const avgText = stats.weightedAverage ? `, media ${stats.weightedAverage.toFixed(1)}/30` : "";
  const message = `Fatto: ${stats.coursesCount} esami, ${stats.totalCredits} CFU${avgText}. La media la mostri tu se vuoi — c'è il toggle sul blocco Header nel tuo Profilo. Conferma il blocco Formazione qui a destra, poi ti chiedo del CV.`;
  const fullConversation = [...history, { role: "assistant" as const, content: message }];
  await saveConversation(supabase, profileId, fullConversation);
  return { message, phase: "transcript" as OnboardingPhase, header: blocks.header, formazione: blocks.formazione };
}

export async function confirmFormazioneAndAskCV(history: ChatMessage[]) {
  const { supabase, profileId } = await getOnboardingContext();
  await approveCardBlock("formazione");

  const message = `Hai un CV? Caricalo e parto da lì per farti domande più mirate sulle tue esperienze. Se non ce l'hai, nessun problema: lo costruiamo parlando.`;
  const fullConversation = [...history, { role: "assistant" as const, content: message }];
  await saveConversation(supabase, profileId, fullConversation);
  return { message, phase: "cv" as OnboardingPhase };
}

const HIDDEN_EXPERIENCE_QUESTION = `C'è qualcosa che non hai mai messo nel CV? Progetti personali, competizioni, sport a livello agonistico, volontariato, lavori — qualsiasi cosa pensi possa rappresentarti.`;

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
  const cv = student.cv_summary as { experiences?: Array<{ title: string; organization: string }> } | null;
  const experiences = cv?.experiences ?? [];
  const first = experiences[0];

  const message = first
    ? `Ho trovato ${experiences.length === 1 ? "un'esperienza" : `${experiences.length} esperienze`}. Su ${first.title} @ ${first.organization} — cosa hai fatto tu, concretamente?`
    : HIDDEN_EXPERIENCE_QUESTION;

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
    const cv = student.cv_summary as { experiences?: Array<{ title: string; organization: string }> } | null;
    const experiences = cv?.experiences ?? [];
    const next = experiences[subIndex + 1];
    const message = next
      ? `Segnato. Su ${next.title} @ ${next.organization} — cosa hai fatto tu, concretamente?`
      : HIDDEN_EXPERIENCE_QUESTION;
    const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
    await saveConversation(supabase, profileId, fullConversation);
    return { message, phase: "esperienze" as OnboardingPhase, done: false };
  }

  // Last answer: extract everything gathered in this phase into the esperienze block.
  const recentText = conversation
    .slice(-2 * totalSubQuestions - 2)
    .map((m) => `${m.role === "user" ? "Studente" : "MIRA"}: ${m.content}`)
    .join("\n");

  const extracted = await chatCompletion(
    [
      {
        role: "system",
        content: `Dalla conversazione, estrai le esperienze raccontate dallo studente. Per ognuna scrivi una descrizione di 2-3 righe di cosa ha fatto concretamente — fatti, non aggettivi di carattere. Rispondi SOLO in JSON: {"items":[{"titolo":"","organizzazione":"","periodo":"","descrizione":""}]}`,
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

export async function confirmEsperienzeAndAskDisponibilita(history: ChatMessage[]) {
  const { supabase, profileId } = await getOnboardingContext();
  await approveCardBlock("esperienze");

  const message = `Ultima cosa della parte essenziale: cosa cerchi e da quando? Stage, part-time, progetto... e dove?`;
  const fullConversation = [...history, { role: "assistant" as const, content: message }];
  await saveConversation(supabase, profileId, fullConversation);
  return { message, phase: "disponibilita" as OnboardingPhase };
}

export async function submitDisponibilita(history: ChatMessage[], userMessage: string) {
  const { supabase, profileId, studentProfileId, student } = await getOnboardingContext();
  const conversation = [...history, { role: "user" as const, content: userMessage }];

  const data = await extractJSON(
    `Estrai dal messaggio: {"cosa_cerca":"stage curriculare|stage extracurriculare|part-time|progetto|nulla per ora","da_quando":"","dove":"","vincoli":""}. Se un campo non emerge, stringa vuota. Rispondi solo JSON.`,
    userMessage
  );

  const disponibilitaData: DisponibilitaProseContent = {
    cosa_cerca: data.cosa_cerca || null,
    da_quando: data.da_quando || null,
    dove: data.dove || null,
    vincoli: data.vincoli || null,
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
        period: data.da_quando || null,
        city: data.dove || null,
      },
    })
    .eq("id", studentProfileId);

  const message = `Segnato — controlla il blocco Disponibilità. Confermalo per sbloccare la candidatura.`;
  const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
  await saveConversation(supabase, profileId, fullConversation);

  return { message, phase: "disponibilita" as OnboardingPhase, disponibilita: { status: "draft" as CardBlockStatus, data: disponibilitaData } };
}

export async function confirmDisponibilitaAndGate(history: ChatMessage[]) {
  const { supabase, profileId, studentProfileId } = await getOnboardingContext();
  await approveCardBlock("disponibilita");

  await (supabase.from("student_profiles") as any)
    .update({ onboarding_completed: true, onboarding_completed_at: new Date().toISOString() })
    .eq("id", studentProfileId);

  const { data: allBlocks } = await (supabase.from("card_blocks") as any)
    .select("status")
    .eq("student_profile_id", studentProfileId);
  const approvedCount = (allBlocks ?? []).filter((b: any) => b.status === "approved").length;
  const pct = Math.round((approvedCount / 9) * 100);

  const message = `Candidatura sbloccata. La tua card è al ${pct}%: puoi già candidarti alle associazioni su MIRA. Oppure completiamo le ultime sezioni — competenze, interessi, come ti descrivi, piano di carriera — in circa 5 minuti: le associazioni vedono un profilo molto più forte.`;
  const fullConversation = [...history, { role: "assistant" as const, content: message }];
  await saveConversation(supabase, profileId, fullConversation);

  generatePathwayAnalysis(profileId).catch((err) => console.error("Background pathway analysis failed:", err));
  revalidatePath("/student");

  return { message, phase: "gate" as OnboardingPhase, progressPct: pct };
}

// ---------------------------------------------------------------------------
// Fase B — competenze, lingue, interessi, come si descrive, piano di carriera
// ---------------------------------------------------------------------------

export async function startFaseB() {
  const { supabase, profileId, studentProfileId, blocks } = await getOnboardingContext();

  const contextLines = [
    ...blocks.formazione.data.items.map((i) => `Esame: ${i.esame} (voto ${i.voto ?? "idoneo"})`),
    ...blocks.esperienze.data.items.map((i) => `Esperienza: ${i.titolo || i.organizzazione} — ${i.descrizione}`),
  ].join("\n");

  const extracted = await chatCompletion(
    [
      {
        role: "system",
        content: `Proponi 2-4 competenze concrete in formato frase-di-una-riga, derivate SOLO dai fatti elencati (esami o esperienze reali, mai inventati). Ogni competenza indica se è "teorica" o "applicata" e a quale esame/esperienza fa riferimento (evidenza). Vietati aggettivi di carattere. Rispondi SOLO in JSON: {"items":[{"testo":"","tipo":"teorica|applicata","evidenza_ref":""}]}`,
      },
      { role: "user", content: contextLines || "Nessun esame o esperienza disponibile." },
    ],
    { temperature: 0.3, maxTokens: 600, jsonMode: true }
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

  await (supabase.from("card_blocks") as any)
    .update({ prose_content: { items }, status: "draft" })
    .eq("student_profile_id", studentProfileId)
    .eq("block_type", "competenze");

  const listText = items.map((i) => `• ${i.testo}${i.evidenza_ref ? ` (${i.tipo ?? "—"} — ${i.evidenza_ref})` : ""}`).join("\n");
  const message = `Completiamo insieme le ultime sezioni: 5 minuti e la tua card è finita.\n\nDai tuoi esami e dalle tue esperienze ti propongo queste competenze:\n${listText || "(nessuna bozza — puoi aggiungerne dal Profilo dopo)"}\n\nConfermi, o vuoi correggere qualcosa?`;

  await saveFaseBConversation(supabase, profileId, [{ role: "assistant", content: message }]);

  return { message, phase: "competenze" as OnboardingPhase, competenze: { status: "draft" as CardBlockStatus, data: { items } } };
}

const RESUME_FASE_B_QUESTIONS: Partial<Record<OnboardingPhase, string>> = {
  lingue: `Che lingue conosci, e a che livello?`,
  interessi: `Cosa ti interessa a livello professionale — settori, ruoli, tipi di lavoro?`,
  autodescrizione: `Raccontami un progetto di cui vai fiero: che ruolo hai preso?`,
  piano_carriera: `Come ti vedi nei prossimi 1-2 anni? Direzione chiara, qualche ipotesi, o stai ancora esplorando?`,
};

/** Resume cross-sessione: un solo messaggio di ripresa, mai il replay dell'intera Fase A. */
export async function resumeFaseB(phase: OnboardingPhase) {
  const { supabase, profileId } = await getOnboardingContext();

  if (phase === "competenze") {
    return startFaseB();
  }
  if (phase === "chiusura") {
    return completeChiusura();
  }

  const question = RESUME_FASE_B_QUESTIONS[phase] ?? "Continuiamo?";
  const message = `Bentornato! Completiamo insieme le ultime sezioni della tua card.\n\n${question}`;
  await saveFaseBConversation(supabase, profileId, [{ role: "assistant", content: message }]);
  return { message, phase };
}

export async function confirmCompetenzeAndAskLingue(history: ChatMessage[]) {
  const { supabase, profileId } = await getOnboardingContext();
  await approveCardBlock("competenze");
  const message = RESUME_FASE_B_QUESTIONS.lingue!;
  const fullConversation = [...history, { role: "assistant" as const, content: message }];
  await saveFaseBConversation(supabase, profileId, fullConversation);
  return { message, phase: "lingue" as OnboardingPhase };
}

export async function submitLingue(history: ChatMessage[], userMessage: string) {
  const { supabase, profileId, studentProfileId } = await getOnboardingContext();
  const conversation = [...history, { role: "user" as const, content: userMessage }];

  const data = await extractJSON(
    `Estrai le lingue menzionate: {"items":[{"lingua":"","livello":""}]}. Rispondi solo JSON.`,
    userMessage
  );
  const items: LinguaItem[] = (data.items ?? []).map((it: any) => ({
    id: crypto.randomUUID(),
    lingua: it.lingua ?? "",
    livello: it.livello ?? "",
    certificazione: null,
    verified: false,
    origin: "onboarding",
  }));

  await (supabase.from("card_blocks") as any)
    .update({ prose_content: { items }, status: "draft" })
    .eq("student_profile_id", studentProfileId)
    .eq("block_type", "lingue");

  const message = `Segnate — controlla il blocco Lingue. Confermalo, poi parliamo di interessi.`;
  const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
  await saveFaseBConversation(supabase, profileId, fullConversation);

  return { message, phase: "lingue" as OnboardingPhase, lingue: { status: "draft" as CardBlockStatus, data: { items } } };
}

export async function confirmLingueAndAskInteressi(history: ChatMessage[]) {
  const { supabase, profileId } = await getOnboardingContext();
  await approveCardBlock("lingue");
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
        content: `Scrivi una prosa breve (2-3 frasi) che unisce interessi professionali e personali dello studente, in terza persona, solo fatti/temi concreti. Rispondi SOLO in JSON: {"testo":""}`,
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

  const message = `Scritto — controlla il blocco Interessi. Confermalo, poi passiamo a come ti descrivi.`;
  const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
  await saveFaseBConversation(supabase, profileId, fullConversation);

  return { message, phase: "interessi" as OnboardingPhase, done: true, interessi: { status: "draft" as CardBlockStatus, data: { testo } } };
}

const AUTODESCRIZIONE_QUESTIONS = [
  RESUME_FASE_B_QUESTIONS.autodescrizione!,
  `Quando lavori meglio — da solo, in gruppo, con una direzione chiara o con più libertà?`,
  `Cosa ti pesa fare, invece?`,
];

export async function confirmInteressiAndAskAutodescrizione(history: ChatMessage[]) {
  const { supabase, profileId } = await getOnboardingContext();
  await approveCardBlock("interessi");
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
        content: `Scrivi un paragrafo breve (max 4 frasi) in PRIMA PERSONA che riassume come lo studente si descrive, basato SOLO su quello che ha detto. Mai aggettivi di carattere dedotti da te ("intraprendente", "resiliente") — solo ciò che lo studente ha effettivamente detto, riformulato in prima persona scorrevole. Rispondi SOLO in JSON: {"testo":""}`,
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

  const message = `L'ho scritto con parole tue — modificalo pure, ed è la parte più personale della card. Confermalo quando va bene, poi l'ultima domanda: il piano di carriera.`;
  const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
  await saveFaseBConversation(supabase, profileId, fullConversation);

  return {
    message,
    phase: "autodescrizione" as OnboardingPhase,
    done: true,
    autodescrizione: { status: "draft" as CardBlockStatus, data: { testo } },
  };
}

export async function confirmAutodescrizioneAndAskPiano(history: ChatMessage[]) {
  const { supabase, profileId } = await getOnboardingContext();
  await approveCardBlock("autodescrizione");
  const message = RESUME_FASE_B_QUESTIONS.piano_carriera!;
  const fullConversation = [...history, { role: "assistant" as const, content: message }];
  await saveFaseBConversation(supabase, profileId, fullConversation);
  return { message, phase: "piano_carriera" as OnboardingPhase };
}

export async function submitPianoCarriera(history: ChatMessage[], userMessage: string) {
  const { supabase, profileId, studentProfileId, student } = await getOnboardingContext();
  const conversation = [...history, { role: "user" as const, content: userMessage }];

  const data = await extractJSON(
    `Estrai dal messaggio: {"stato":"direzione_chiara|ipotesi|esplorazione","testo":""}. "stato" è direzione_chiara SOLO se lo studente indica un settore/ruolo definito in modo esplicito e sicuro; ipotesi se menziona 2-3 direzioni in valutazione; esplorazione se non ha ancora idea o è vago. Non forzare mai direzione_chiara per default. Rispondi solo JSON.`,
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

export async function confirmPianoCarrieraAndChiudi(history: ChatMessage[]) {
  const { supabase, profileId } = await getOnboardingContext();
  await approveCardBlock("piano_carriera");
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

// ---------------------------------------------------------------------------

const CORRECTABLE_BLOCK_PROMPTS: Partial<Record<CardBlockType, string>> = {
  header: `Aggiorna i dati del corso in base alla correzione: {"corso":"","livello":"","anno":0}. Rispondi solo JSON.`,
  esperienze: `Riscrivi le esperienze in base alla correzione, stesso formato di prima: {"items":[{"titolo":"","organizzazione":"","periodo":"","descrizione":""}]}. Rispondi solo JSON.`,
  disponibilita: `Aggiorna disponibilità in base alla correzione: {"cosa_cerca":"","da_quando":"","dove":"","vincoli":""}. Rispondi solo JSON.`,
  competenze: `Aggiorna le competenze in base alla correzione: {"items":[{"testo":"","tipo":"teorica|applicata","evidenza_ref":""}]}. Rispondi solo JSON.`,
  lingue: `Aggiorna le lingue in base alla correzione: {"items":[{"lingua":"","livello":""}]}. Rispondi solo JSON.`,
  interessi: `Riscrivi il testo interessi in base alla correzione: {"testo":""}. Rispondi solo JSON.`,
  autodescrizione: `Riscrivi il testo in prima persona in base alla correzione: {"testo":""}. Rispondi solo JSON.`,
  piano_carriera: `Aggiorna il piano di carriera in base alla correzione: {"stato":"direzione_chiara|ipotesi|esplorazione","testo":""}. Rispondi solo JSON.`,
};

export async function submitCorrection(blockType: CardBlockType, history: ChatMessage[], userMessage: string) {
  const { supabase, profileId, studentProfileId, blocks } = await getOnboardingContext();
  const conversation = [...history, { role: "user" as const, content: userMessage }];
  const prompt = CORRECTABLE_BLOCK_PROMPTS[blockType];
  const isFaseB = !FASE_A_BLOCK_TYPES.includes(blockType as any);

  if (prompt) {
    const data = await extractJSON(prompt, userMessage);
    if (blockType === "header") {
      await (supabase.from("card_blocks") as any)
        .update({ prose_content: { ...blocks.header.data, corso: data.corso, livello: data.livello, anno: data.anno } })
        .eq("student_profile_id", studentProfileId)
        .eq("block_type", "header");
    } else if (blockType === "esperienze" || blockType === "competenze" || blockType === "lingue") {
      const items = (data.items ?? []).map((it: any) => ({
        id: crypto.randomUUID(),
        verified: false,
        origin: "onboarding",
        ...it,
      }));
      await (supabase.from("card_blocks") as any)
        .update({ prose_content: { items } })
        .eq("student_profile_id", studentProfileId)
        .eq("block_type", blockType);
    } else {
      await (supabase.from("card_blocks") as any)
        .update({ prose_content: data })
        .eq("student_profile_id", studentProfileId)
        .eq("block_type", blockType);
    }
  }

  const message = `Corretto — dai un'occhiata al blocco qui a destra. Conferma quando va bene.`;
  const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
  if (isFaseB) await saveFaseBConversation(supabase, profileId, fullConversation);
  else await saveConversation(supabase, profileId, fullConversation);

  const { blocks: freshBlocks } = await getOnboardingContext();
  return { message, blocks: freshBlocks };
}

export async function forceCompleteOnboarding() {
  const { studentProfileId, supabase, profileId } = await getOnboardingContext();

  const placeholders: Record<string, unknown> = {
    header: { corso: "[test] Corso placeholder", livello: "triennale", anno: 1, laurea_anno: null, media_voti: null },
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

  generatePathwayAnalysis(profileId).catch((err) => console.error("Background pathway analysis failed:", err));
  revalidatePath("/student");

  return { success: true };
}
