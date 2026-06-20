"use server";

import { getAIClient, AI_CONFIG } from "@mira/ai";
import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `Sei MIRA, l'assistente AI della piattaforma universitaria MIRA. Stai facendo l'onboarding di uno studente Bocconi.

Il tuo obiettivo è conoscere lo studente attraverso una conversazione naturale e guidata. NON fare domande multiple alla volta — fai UNA domanda per volta e aspetta la risposta.

Devi raccogliere queste informazioni (in ordine flessibile):
1. Corso di laurea e anno
2. Interessi accademici e professionali
3. Esperienze passate (stage, lavoro, progetti)
4. Perché vuole unirsi a un'associazione
5. Settori di interesse (finance, consulting, tech, etc.)
6. Stile di lavoro preferito
7. Disponibilità settimanale
8. Lingue parlate
9. Competenze specifiche
10. Obiettivi a lungo termine

Regole:
- Sii amichevole ma professionale, come un mentor
- Usa il tu, in italiano
- Fai domande aperte che invitano a raccontare
- Quando hai abbastanza info su un argomento, passa al prossimo
- NON chiedere tutto subito — una cosa alla volta
- Quando hai raccolto tutte le info essenziali (almeno 1-7), chiedi se vuole aggiungere altro, poi concludi dicendo "Ho tutto quello che mi serve! Il tuo profilo MIRA è pronto."
- La frase finale DEVE contenere esattamente: "Il tuo profilo MIRA è pronto."`;

export async function sendOnboardingMessage(
  conversationHistory: ChatMessage[],
  userMessage: string
) {
  const ctx = await getUserContext();
  const client = getAIClient();

  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    ...conversationHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: userMessage },
  ];

  const response = await client.chat.completions.create({
    model: AI_CONFIG.defaultModel,
    messages,
    max_tokens: AI_CONFIG.maxTokens.chat,
    temperature: 0.7,
  });

  const assistantMessage = response.choices[0]?.message?.content ?? "";
  const isComplete = assistantMessage.includes("Il tuo profilo MIRA è pronto");

  if (isComplete) {
    await extractAndSaveProfile(ctx.profile.id, [
      ...conversationHistory,
      { role: "user", content: userMessage },
      { role: "assistant", content: assistantMessage },
    ]);
  }

  return { message: assistantMessage, isComplete };
}

export async function startOnboardingChat() {
  const ctx = await getUserContext();
  const client = getAIClient();

  const response = await client.chat.completions.create({
    model: AI_CONFIG.defaultModel,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Lo studente si chiama ${ctx.profile.full_name ?? "uno studente"} e la sua email è ${ctx.profile.email}. Salutalo e inizia la conversazione chiedendogli del suo percorso accademico.`,
      },
    ],
    max_tokens: AI_CONFIG.maxTokens.chat,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content ?? "Ciao! Raccontami di te.";
}

async function extractAndSaveProfile(profileId: string, conversation: ChatMessage[]) {
  const client = getAIClient();
  const supabase = await createServiceClient();

  const conversationText = conversation
    .map((m) => `${m.role === "user" ? "Studente" : "MIRA"}: ${m.content}`)
    .join("\n");

  const extractionResponse = await client.chat.completions.create({
    model: AI_CONFIG.defaultModel,
    messages: [
      {
        role: "system",
        content: `Estrai le informazioni dello studente dalla conversazione. Rispondi SOLO in JSON:
{
  "degree_program": "corso di laurea",
  "degree_level": "triennale|magistrale|ciclo_unico|phd",
  "current_year": numero,
  "interests": ["interesse1", "interesse2"],
  "goals": ["obiettivo1"],
  "experiences": ["esperienza1"],
  "profile_summary": "riassunto in 2-3 frasi di chi è lo studente",
  "working_style": "stile di lavoro",
  "availability": "disponibilità",
  "languages": "lingue",
  "skills": "competenze",
  "association_motivation": "perché vuole entrare in associazione"
}`,
      },
      { role: "user", content: conversationText },
    ],
    max_tokens: 1024,
    temperature: 0.1,
    response_format: { type: "json_object" },
  });

  const extracted = JSON.parse(extractionResponse.choices[0]?.message?.content ?? "{}");

  await supabase
    .from("student_profiles")
    .update({
      degree_program: extracted.degree_program ?? null,
      degree_level: extracted.degree_level ?? null,
      current_year: extracted.current_year ?? null,
      interests: extracted.interests ?? [],
      goals: extracted.goals ?? [],
      experiences: extracted.experiences ?? [],
      profile_summary: extracted.profile_summary ?? null,
      working_style: extracted.working_style ? { description: extracted.working_style } : null,
      availability: extracted.availability ? { description: extracted.availability } : null,
      onboarding_answers: {
        languages: extracted.languages ?? "",
        skills: extracted.skills ?? "",
        association_motivation: extracted.association_motivation ?? "",
        working_style: extracted.working_style ?? "",
        availability: extracted.availability ?? "",
      },
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
    output_summary: { extracted_fields: Object.keys(extracted) },
    status: "success",
  });

  revalidatePath("/student");
  revalidatePath("/student/onboarding");
}
