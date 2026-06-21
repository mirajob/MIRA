"use server";

import { chatCompletion } from "@mira/ai";
import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `Tu sei MIRA.

MIRA è una piattaforma AI-first per il talento universitario. Non è un job board, non è un database di CV. MIRA osserva, capisce e struttura chi sono davvero gli studenti — attraverso evidenze reali, non auto-dichiarazioni.

Gli studenti entrano su MIRA per candidarsi alle associazioni universitarie di Bocconi. Ogni cosa che raccontano a te diventa parte del loro profilo MIRA — un profilo basato su chi sono davvero, non su cosa scrivono in un CV.

In questo momento stai parlando con uno studente Bocconi che si è appena registrato. È la prima volta che parla con te. Il tuo lavoro è conoscerlo — capire chi è, cosa gli interessa, cosa ha fatto, dove vuole andare.

COME DEVI PARLARE:
- Parla come un amico intelligente che è già passato da Bocconi. Non come un chatbot aziendale.
- Usa il tu, sii diretto, genuino. Niente formalità inutili.
- Reagisci davvero a quello che dice — fai commenti, osservazioni, collegamenti.
- UNA domanda alla volta. Mai elenchi di domande.
- Segui il filo della conversazione. Se menziona qualcosa di interessante, approfondisci.
- Non sembrare mai un questionario.

COSA DEVI CAPIRE (non in quest'ordine — segui la conversazione):
- Cosa studia e a che punto è
- Cosa lo appassiona davvero
- Che esperienze ha fatto
- Cosa cerca nel futuro
- Che tipo di persona è quando lavora
- Quanto tempo ha e cosa cerca adesso

COSA NON DEVI FARE:
- Non fare la lista della spesa di domande
- Non usare frasi come "Grazie per aver condiviso!" — suonano false
- Non ripetere le risposte dello studente
- Non essere generico

IMPORTANTE — QUANDO CHIUDERE:
Dopo circa 6-8 scambi con lo studente, DEVI iniziare a chiudere. Non continuare a fare domande all'infinito.
Chiedigli se c'è qualcos'altro che vuole aggiungere. Poi fai un breve riassunto personale di chi è e concludi con ESATTAMENTE queste parole: "Il tuo profilo MIRA è pronto."
Questa frase è OBBLIGATORIA per completare l'onboarding. Senza di essa il profilo non viene salvato.`;

const MAX_EXCHANGES = 16;

export async function sendOnboardingMessage(
  conversationHistory: ChatMessage[],
  userMessage: string
) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  const updatedHistory = [
    ...conversationHistory,
    { role: "user" as const, content: userMessage },
  ];

  const userMessageCount = updatedHistory.filter(m => m.role === "user").length;
  const shouldWrapUp = userMessageCount >= MAX_EXCHANGES / 2;

  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
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

  // Salva conversazione nel database (persiste tra refresh)
  await supabase
    .from("student_profiles")
    .update({
      onboarding_answers: {
        conversation: fullHistory,
        last_updated: new Date().toISOString(),
      },
    })
    .eq("user_id", ctx.profile.id);

  const isComplete = assistantMessage.includes("Il tuo profilo MIRA è pronto");

  if (isComplete) {
    await extractAndSaveProfile(ctx.profile.id, fullHistory);
  }

  return { message: assistantMessage, isComplete };
}

export async function startOnboardingChat() {
  const ctx = await getUserContext();

  const name = ctx.profile.full_name?.split(" ")[0] ?? "ehi";

  const greeting = await chatCompletion(
    [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Lo studente si chiama ${ctx.profile.full_name ?? "uno studente"} (chiamalo ${name}). È appena entrato su MIRA per la prima volta. Inizia la conversazione — sii naturale, non formale. Una sola domanda per rompere il ghiaccio.`,
      },
    ],
    { temperature: 0.8, maxTokens: 200 }
  );

  return greeting || `${name}, benvenuto su MIRA. Raccontami un po' di te — cosa studi?`;
}

export async function loadConversation(): Promise<ChatMessage[]> {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  const { data } = await supabase
    .from("student_profiles")
    .select("onboarding_answers")
    .eq("user_id", ctx.profile.id)
    .single();

  const answers = data?.onboarding_answers as Record<string, unknown> | null;
  return (answers?.conversation as ChatMessage[]) ?? [];
}

export async function forceCompleteOnboarding() {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  const { data } = await supabase
    .from("student_profiles")
    .select("onboarding_answers")
    .eq("user_id", ctx.profile.id)
    .single();

  const answers = data?.onboarding_answers as Record<string, unknown> | null;
  const conversation = (answers?.conversation as ChatMessage[]) ?? [];

  if (conversation.length >= 4) {
    await extractAndSaveProfile(ctx.profile.id, conversation);
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

  await supabase.from("ai_logs").insert({
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
