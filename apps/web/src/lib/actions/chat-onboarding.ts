"use server";

import { chatCompletion } from "@mira/ai";
import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `Tu sei MIRA, la piattaforma AI per il talento universitario.

CONTESTO:
Lo studente si è appena registrato. Gli hai già mandato un messaggio di presentazione (hardcoded) che spiega cos'è MIRA e gli ha chiesto se studia triennale o magistrale. Ora stai rispondendo alle sue risposte. NON ripresentarti — sei già nel mezzo della conversazione.

FLUSSO:
1. Lo studente ha risposto se studia triennale o magistrale. In base alla risposta:
   - Triennale: chiedigli di caricare il transcript PDF da yoU@B ("Perfetto! Caricheresti il tuo libretto? Puoi scaricarlo come PDF da yoU@B — così vedo subito il tuo percorso.")
   - Magistrale: chiedigli il transcript della magistrale e se vuole anche quello della triennale
2. Se carica il transcript, riceverai un messaggio di sistema con i dati estratti. Commentali in modo naturale — cosa noti, cosa ti incuriosisce. NON fare un elenco. Conferma il corso e l'anno con lo studente.
3. Poi fai domande personali (una alla volta): cosa lo appassiona, che esperienze ha, cosa cerca nel futuro, che tipo è quando lavora.
4. Se non carica il transcript, chiedigli cosa studia e prosegui normalmente.

COME PARLARE:
- Come un amico intelligente, diretto, genuino. Non un chatbot.
- Usa il tu. Niente formalità.
- Reagisci davvero — commenti, osservazioni, collegamenti.
- UNA domanda alla volta. Mai elenchi.
- Segui il filo della conversazione.

NON FARE:
- Non ripresentarti (l'hai già fatto)
- Non chiedere "come stai" — sei già nel mezzo della conversazione
- Non fare liste di domande
- Non usare "Grazie per aver condiviso!"
- Non ripetere le risposte dello studente
- Non elencare i corsi del libretto — commenta

CHIUDERE:
Dopo circa 6-8 scambi, chiedi se vuole aggiungere altro. Poi fai un breve riassunto personale di chi è e concludi con ESATTAMENTE: "Il tuo profilo MIRA è pronto."
Questa frase è OBBLIGATORIA per completare l'onboarding.`;

const MAX_EXCHANGES = 16;

export async function sendTranscriptMessage(
  conversationHistory: ChatMessage[],
  transcriptSummary: string
) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  const updatedHistory = [
    ...conversationHistory,
    { role: "user" as const, content: "[Ho caricato il mio libretto]" },
  ];

  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    ...updatedHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    {
      role: "system" as const,
      content: `DATI ESTRATTI DAL LIBRETTO DELLO STUDENTE:\n${transcriptSummary}\n\nCommenta quello che vedi in modo naturale — cosa noti, cosa ti incuriosisce. Poi fai una domanda per approfondire.`,
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
    .eq("user_id", ctx.profile.id);

  return { message: assistantMessage };
}

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
