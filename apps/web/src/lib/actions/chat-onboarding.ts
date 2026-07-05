"use server";

import { chatCompletion } from "@mira/ai";
import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { generatePathwayAnalysis } from "./pathway";
import { ensureCardBlocksExist, approveCardBlock } from "./card-blocks";
import type {
  CardBlockType,
  CardBlockStatus,
  HeaderProseContent,
  FormazioneProseContent,
  EsperienzaItem,
  EsperienzeProseContent,
  DisponibilitaProseContent,
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
  | "gate";

export interface FaseABlocksState {
  header: { status: CardBlockStatus; data: HeaderProseContent };
  formazione: { status: CardBlockStatus; data: FormazioneProseContent };
  esperienze: { status: CardBlockStatus; data: EsperienzeProseContent };
  disponibilita: { status: CardBlockStatus; data: DisponibilitaProseContent };
}

export interface OnboardingState {
  conversation: ChatMessage[];
  phase: OnboardingPhase;
  blocks: FaseABlocksState;
  transcriptUploaded: boolean;
  cvUploaded: boolean;
}

const FASE_A_BLOCK_TYPES = ["header", "formazione", "esperienze", "disponibilita"] as const;

export const EMPTY_FASE_A_BLOCKS: FaseABlocksState = {
  header: { status: "empty", data: { corso: null, livello: null, anno: null, laurea_anno: null, media_voti: null } },
  formazione: { status: "empty", data: { items: [] } },
  esperienze: { status: "empty", data: { items: [] } },
  disponibilita: { status: "empty", data: { cosa_cerca: null, da_quando: null, dove: null, vincoli: null } },
};

async function getOnboardingContext() {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();
  const profileId = (ctx.profile as any).id as string;

  const { data: student } = await (supabase.from("student_profiles") as any)
    .select("id, degree_program, degree_level, current_year, transcript_uploaded, cv_uploaded, cv_summary, availability, onboarding_answers")
    .eq("user_id", profileId)
    .single();

  const studentProfileId = student.id as string;
  await ensureCardBlocksExist(studentProfileId);

  const { data: blockRows } = await (supabase.from("card_blocks") as any)
    .select("block_type, prose_content, status")
    .eq("student_profile_id", studentProfileId)
    .in("block_type", FASE_A_BLOCK_TYPES);

  const blocks: FaseABlocksState = JSON.parse(JSON.stringify(EMPTY_FASE_A_BLOCKS));
  for (const row of blockRows ?? []) {
    (blocks as any)[row.block_type] = { status: row.status, data: row.prose_content };
  }

  return { ctx, supabase, profileId, studentProfileId, student, blocks };
}

async function saveConversation(supabase: any, profileId: string, conversation: ChatMessage[]) {
  await supabase
    .from("student_profiles")
    .update({ onboarding_answers: { conversation, last_updated: new Date().toISOString() } })
    .eq("user_id", profileId);
}

export async function loadOnboardingState(): Promise<OnboardingState> {
  const { student, blocks } = await getOnboardingContext();

  const answers = student.onboarding_answers as Record<string, unknown> | null;
  const conversation = (answers?.conversation as ChatMessage[]) ?? [];
  const transcriptUploaded = !!student.transcript_uploaded;
  const cvUploaded = !!student.cv_uploaded;
  const skippedTranscript = conversation.some((m) => m.content === "[Libretto saltato]");
  const skippedCV = conversation.some((m) => m.content === "[CV saltato]");

  let phase: OnboardingPhase;
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
  } else if (blocks.disponibilita.status !== "approved") {
    phase = "disponibilita";
  } else {
    phase = "gate";
  }

  return { conversation, phase, blocks, transcriptUploaded, cvUploaded };
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

  const message = `Candidatura sbloccata. La tua card è al ${pct}%: puoi già candidarti alle associazioni su MIRA. Le prossime sezioni (competenze, interessi, piano di carriera) arriveranno presto per rendere il profilo ancora più forte.`;
  const fullConversation = [...history, { role: "assistant" as const, content: message }];
  await saveConversation(supabase, profileId, fullConversation);

  generatePathwayAnalysis(profileId).catch((err) => console.error("Background pathway analysis failed:", err));
  revalidatePath("/student");

  return { message, phase: "gate" as OnboardingPhase, progressPct: pct };
}

const CORRECTABLE_BLOCK_PROMPTS: Partial<Record<CardBlockType, string>> = {
  header: `Aggiorna i dati del corso in base alla correzione: {"corso":"","livello":"","anno":0}. Rispondi solo JSON.`,
  esperienze: `Riscrivi le esperienze in base alla correzione, stesso formato di prima: {"items":[{"titolo":"","organizzazione":"","periodo":"","descrizione":""}]}. Rispondi solo JSON.`,
  disponibilita: `Aggiorna disponibilità in base alla correzione: {"cosa_cerca":"","da_quando":"","dove":"","vincoli":""}. Rispondi solo JSON.`,
};

export async function submitCorrection(blockType: CardBlockType, history: ChatMessage[], userMessage: string) {
  const { supabase, profileId, studentProfileId } = await getOnboardingContext();
  const conversation = [...history, { role: "user" as const, content: userMessage }];
  const prompt = CORRECTABLE_BLOCK_PROMPTS[blockType];

  if (prompt) {
    const data = await extractJSON(prompt, userMessage);
    if (blockType === "header") {
      await (supabase.from("card_blocks") as any)
        .update({ prose_content: { corso: data.corso, livello: data.livello, anno: data.anno, laurea_anno: null, media_voti: null } })
        .eq("student_profile_id", studentProfileId)
        .eq("block_type", "header");
    } else if (blockType === "esperienze") {
      const items = (data.items ?? []).map((it: any) => ({
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
        .update({ prose_content: { items } })
        .eq("student_profile_id", studentProfileId)
        .eq("block_type", "esperienze");
    } else if (blockType === "disponibilita") {
      await (supabase.from("card_blocks") as any)
        .update({ prose_content: data })
        .eq("student_profile_id", studentProfileId)
        .eq("block_type", "disponibilita");
    }
  }

  const message = `Corretto — dai un'occhiata al blocco qui a destra. Conferma quando va bene.`;
  const fullConversation = [...conversation, { role: "assistant" as const, content: message }];
  await saveConversation(supabase, profileId, fullConversation);

  const { blocks } = await getOnboardingContext();
  return { message, blocks };
}

export async function forceCompleteOnboarding() {
  const { studentProfileId, supabase, profileId } = await getOnboardingContext();

  const placeholders: Record<string, unknown> = {
    header: { corso: "[test] Corso placeholder", livello: "triennale", anno: 1, laurea_anno: null, media_voti: null },
    formazione: { items: [] },
    esperienze: { items: [{ id: crypto.randomUUID(), titolo: "[test] Esperienza placeholder", ruolo: "", organizzazione: "", periodo: "", descrizione: "[test] descrizione placeholder", verified: false, origin: "onboarding" }] },
    disponibilita: { cosa_cerca: "[test] stage", da_quando: "[test] subito", dove: "[test] Milano", vincoli: null },
  };

  for (const blockType of FASE_A_BLOCK_TYPES) {
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
