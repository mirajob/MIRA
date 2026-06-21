"use server";

import { chatCompletion } from "@mira/ai";
import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

async function getStudentContext() {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();
  const profileId = (ctx.profile as any).id as string;

  const { data: student } = await (supabase.from("student_profiles") as any)
    .select("degree_program, degree_level, current_year, transcript_summary, transcript_uploaded")
    .eq("user_id", profileId)
    .single();

  const { data: associations } = await (supabase.from("association_profiles") as any)
    .select("name, slug, category, short_description")
    .eq("public_page_status", "published");

  const { data: openCycles } = await (supabase.from("application_cycles") as any)
    .select("title, association_id, closes_at, association_profiles(name)")
    .eq("status", "open");

  return { ctx, supabase, profileId, student, associations, openCycles };
}

function buildSystemPrompt(student: any, associations: any[], openCycles: any[]): string {
  let studentContext = "";
  if (student?.transcript_uploaded && student?.transcript_summary) {
    const ts = student.transcript_summary;
    studentContext = `
DATI DELLO STUDENTE (dal transcript caricato):
- Corso: ${ts.degree_program || student.degree_program || "non noto"}
- Livello: ${ts.degree_level || student.degree_level || "non noto"}
- Esami completati: ${ts.courses?.length ?? 0}
- Crediti totali: ${ts.total_credits ?? 0} CFU
- Media ponderata: ${ts.weighted_average ? `${ts.weighted_average}/30` : "non calcolata"}
- Voti più alti: ${ts.courses?.filter((c: any) => c.grade_numeric >= 28).map((c: any) => `${c.course_name} (${c.grade})`).slice(0, 5).join(", ") || "nessuno"}

Lo studente È GIÀ ISCRITTO a Bocconi. Non chiedergli se ha preparato la candidatura per Bocconi — ci è già dentro.`;
  }

  let assocContext = "";
  if (associations?.length > 0) {
    const list = associations.map((a: any) => `- ${a.name} (${a.category || "generale"}): ${a.short_description || ""}`).join("\n");
    const openList = openCycles?.map((c: any) => `- ${c.association_profiles?.name}: "${c.title}"${c.closes_at ? ` (scade ${new Date(c.closes_at).toLocaleDateString("it-IT")})` : ""}`).join("\n") || "nessuna al momento";

    assocContext = `
ASSOCIAZIONI SU MIRA:
${list}

CANDIDATURE APERTE ORA:
${openList}

Quando lo studente parla di associazioni, TU SAI quali ci sono su MIRA. Se menziona un'associazione presente, digli che può candidarsi direttamente dalla piattaforma dopo aver completato il profilo.`;
  }

  return `Tu sei MIRA, la piattaforma AI per il talento universitario di Bocconi.

CHI SEI: MIRA accompagna gli studenti Bocconi nel loro percorso — orientamento professionale, candidature alle associazioni, profilo basato su evidenze reali. In futuro: simulazioni di lavoro e matching con aziende.

CONTESTO CONVERSAZIONE:
Lo studente si è appena registrato e sta facendo l'onboarding. Gli hai già mandato un messaggio di presentazione e gli hai chiesto se studia triennale o magistrale. NON ripresentarti.
${studentContext}
${assocContext}

FLUSSO:
1. Se non ha ancora caricato il transcript, chiedigli di farlo (PDF da yoU@B)
2. Se ha caricato il transcript, commenta i dati in modo naturale — cosa noti, cosa ti colpisce. NON elencare i corsi.
3. Poi fai domande personali (una alla volta): cosa lo appassiona, che esperienze ha, cosa cerca, che tipo è.
4. Se menziona associazioni, collegati a quelle disponibili su MIRA.

COME PARLARE:
- Come un amico intelligente che conosce Bocconi. Diretto, genuino.
- UNA domanda alla volta. Mai elenchi.
- Reagisci davvero — commenti concreti basati sui suoi dati reali.
- Lo studente È GIÀ A BOCCONI. Non chiedergli se vuole entrare a Bocconi.

NON FARE:
- Non ripresentarti
- Non chiedere "come stai"
- Non dire "Grazie per aver condiviso!"
- Non elencare corsi del libretto
- Non suggerire di "preparare la candidatura per Bocconi" — ci è già dentro
- Non essere un generico career coach — sei MIRA, sai le cose concrete

CHIUDERE:
Dopo circa 6-8 scambi, chiedi se vuole aggiungere altro. Poi fai un breve riassunto personale e concludi con ESATTAMENTE: "Il tuo profilo MIRA è pronto."`;
}

const MAX_EXCHANGES = 16;

export async function saveConversation(messages: ChatMessage[]) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();
  await supabase
    .from("student_profiles")
    .update({
      onboarding_answers: {
        conversation: messages,
        last_updated: new Date().toISOString(),
      },
    })
    .eq("user_id", ctx.profile.id);
}

export async function sendTranscriptMessage(
  conversationHistory: ChatMessage[],
  transcriptSummary: string
) {
  const { supabase, profileId, student, associations, openCycles } = await getStudentContext();
  const systemPrompt = buildSystemPrompt(student, associations, openCycles);

  const updatedHistory = [
    ...conversationHistory,
    { role: "user" as const, content: "[Ho caricato il mio libretto]" },
  ];

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...updatedHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    {
      role: "system" as const,
      content: `DATI APPENA ESTRATTI DAL LIBRETTO:\n${transcriptSummary}\n\nCommenta in modo naturale — cosa noti, cosa ti colpisce. Poi fai una domanda per approfondire i suoi interessi.`,
    },
  ];

  const assistantMessage = await chatCompletion(messages, {
    temperature: 0.7,
    maxTokens: 512,
  });

  const fullHistory = [
    ...updatedHistory,
    { role: "assistant" as const, content: assistantMessage },
  ];

  await supabase
    .from("student_profiles")
    .update({
      onboarding_answers: {
        conversation: fullHistory,
        last_updated: new Date().toISOString(),
      },
    })
    .eq("user_id", profileId);

  return { message: assistantMessage };
}

export async function sendOnboardingMessage(
  conversationHistory: ChatMessage[],
  userMessage: string
) {
  const { supabase, profileId, student, associations, openCycles } = await getStudentContext();
  const systemPrompt = buildSystemPrompt(student, associations, openCycles);

  const updatedHistory = [
    ...conversationHistory,
    { role: "user" as const, content: userMessage },
  ];

  const userMessageCount = updatedHistory.filter(m => m.role === "user").length;
  const shouldWrapUp = userMessageCount >= MAX_EXCHANGES / 2;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...updatedHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  if (shouldWrapUp) {
    messages.push({
      role: "system" as const,
      content: "ATTENZIONE: Hai già fatto abbastanza domande. È ora di chiudere. Fai un breve riassunto dello studente e concludi con: \"Il tuo profilo MIRA è pronto.\"",
    });
  }

  const assistantMessage = await chatCompletion(messages, {
    temperature: 0.7,
    maxTokens: 512,
  });

  const fullHistory = [
    ...updatedHistory,
    { role: "assistant" as const, content: assistantMessage },
  ];

  await supabase
    .from("student_profiles")
    .update({
      onboarding_answers: {
        conversation: fullHistory,
        last_updated: new Date().toISOString(),
      },
    })
    .eq("user_id", profileId);

  const isComplete = assistantMessage.includes("Il tuo profilo MIRA è pronto");

  if (isComplete) {
    await extractAndSaveProfile(profileId, fullHistory);
  }

  return { message: assistantMessage, isComplete };
}

export async function loadConversation(): Promise<ChatMessage[]> {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  const { data } = await supabase
    .from("student_profiles")
    .select("onboarding_answers")
    .eq("user_id", (ctx.profile as any).id)
    .single();

  const answers = data?.onboarding_answers as Record<string, unknown> | null;
  return (answers?.conversation as ChatMessage[]) ?? [];
}

export async function forceCompleteOnboarding() {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();
  const profileId = (ctx.profile as any).id as string;

  const { data } = await supabase
    .from("student_profiles")
    .select("onboarding_answers")
    .eq("user_id", profileId)
    .single();

  const answers = data?.onboarding_answers as Record<string, unknown> | null;
  const conversation = (answers?.conversation as ChatMessage[]) ?? [];

  if (conversation.length >= 4) {
    await extractAndSaveProfile(profileId, conversation);
    return { success: true };
  }

  return { error: "Rispondi ad almeno un paio di domande prima di completare." };
}

async function extractAndSaveProfile(profileId: string, conversation: ChatMessage[]) {
  const supabase = await createServiceClient();

  const conversationText = conversation
    .map((m) => `${m.role === "user" ? "Studente" : "MIRA"}: ${m.content}`)
    .join("\n");

  const extracted = await chatCompletion(
    [
      {
        role: "system",
        content: `Estrai le informazioni dalla conversazione. Rispondi SOLO in JSON:
{"degree_program":"","degree_level":"triennale|magistrale|ciclo_unico|phd","current_year":0,"interests":[""],"goals":[""],"experiences":[""],"profile_summary":"riassunto personale 2-3 frasi di chi è questa persona","working_style":"","availability":"","languages":"","skills":"","association_motivation":""}
Se un campo non è emerso dalla conversazione, lascialo vuoto. Non inventare.`,
      },
      { role: "user", content: conversationText },
    ],
    { temperature: 0.1, maxTokens: 1024, jsonMode: true }
  );

  const data = JSON.parse(extracted);

  await supabase
    .from("student_profiles")
    .update({
      degree_program: data.degree_program || null,
      degree_level: data.degree_level || null,
      current_year: data.current_year || null,
      interests: data.interests?.filter(Boolean) ?? [],
      goals: data.goals?.filter(Boolean) ?? [],
      experiences: data.experiences?.filter(Boolean) ?? [],
      profile_summary: data.profile_summary || null,
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq("user_id", profileId);

  await (supabase.from("ai_logs") as any).insert({
    module: "student_onboarding",
    provider: "openai",
    model: "gpt-4o-mini",
    entity_type: "student_profile",
    user_id: profileId,
    input_metadata: { message_count: conversation.length },
    status: "success",
  });

  revalidatePath("/student");
}
