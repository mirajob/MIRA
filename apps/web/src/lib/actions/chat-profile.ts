"use server";

import { chatCompletion } from "@mira/ai";
import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const STRUCTURED_QUESTIONS = [
  "Per rendere il tuo profilo visibile alle aziende quando arriveranno, ho bisogno di sapere alcune cose. Da quando sei disponibile per uno stage o un'opportunità lavorativa? E in quale città?",
  "Che tipo di ruolo ti interessa? (es. analyst, consulting, marketing, tech...)",
  "Quali settori ti attraggono di più?",
  "Qual è il tuo piano a breve termine — cosa vorresti fare nei prossimi 6-12 mesi?",
];

const PROFILE_SYSTEM_PROMPT = `Tu sei MIRA. Lo studente ha già completato l'onboarding e ora sta arricchendo il suo profilo.

SEI IN DUE FASI:
1. Se non hai ancora raccolto le info strutturate (disponibilità, ruolo cercato, settori, piano carriera), fai domande precise UNA alla volta. Non essere generico — chiedi cose concrete.
2. Una volta raccolte, dì: "Perfetto, il tuo profilo è pronto per le aziende! Da ora in poi questa chat è il tuo spazio — parlami di qualsiasi cosa, dubbi, interessi, esperienze. Tutto quello che mi dici migliora il tuo profilo. E se cambi disponibilità, basta dirmelo qui."

COME PARLARE:
- Diretto, genuino, come un amico.
- UNA domanda alla volta.
- Reagisci a quello che dice — non ignorare le risposte.

NON FARE:
- Non ripresentarti
- Non fare liste di domande
- Non essere un chatbot generico`;

export async function sendProfileMessage(
  conversationHistory: ChatMessage[],
  userMessage: string
) {
  const ctx = await getUserContext();
  const profileId = (ctx.profile as any).id as string;
  const supabase = await createServiceClient();

  const { data: student } = await (supabase.from("student_profiles") as any)
    .select("profile_summary, degree_program, transcript_summary, onboarding_answers")
    .eq("user_id", profileId)
    .single();

  const updatedHistory = [
    ...conversationHistory,
    { role: "user" as const, content: userMessage },
  ];

  let studentContext = "";
  if (student?.transcript_summary) {
    const ts = student.transcript_summary;
    studentContext = `\nDATI STUDENTE: ${ts.degree_program || student.degree_program || ""}, media ${ts.weighted_average || "?"}/30, ${ts.courses?.length || 0} esami.`;
  }

  const messages = [
    { role: "system" as const, content: PROFILE_SYSTEM_PROMPT + studentContext },
    ...updatedHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  const assistantMessage = await chatCompletion(messages, {
    temperature: 0.7,
    maxTokens: 400,
  });

  const fullHistory = [
    ...updatedHistory,
    { role: "assistant" as const, content: assistantMessage },
  ];

  const answers = student?.onboarding_answers || {};
  await (supabase.from("student_profiles") as any)
    .update({
      onboarding_answers: {
        ...answers,
        profile_chat: fullHistory,
        profile_chat_updated: new Date().toISOString(),
      },
    })
    .eq("user_id", profileId);

  // Update profile summary every 4 messages
  if (fullHistory.length % 4 === 0 && fullHistory.length > 2) {
    await updateProfileFromChat(profileId, fullHistory);
  }

  return { message: assistantMessage };
}

export async function loadProfileChat(): Promise<ChatMessage[]> {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  const { data } = await supabase
    .from("student_profiles")
    .select("onboarding_answers")
    .eq("user_id", (ctx.profile as any).id)
    .single();

  const answers = data?.onboarding_answers as Record<string, unknown> | null;
  return (answers?.profile_chat as ChatMessage[]) ?? [];
}

export async function dismissRoadmap() {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  const { data } = await supabase
    .from("student_profiles")
    .select("onboarding_answers")
    .eq("user_id", (ctx.profile as any).id)
    .single();

  const answers = (data?.onboarding_answers as Record<string, unknown>) || {};
  await supabase
    .from("student_profiles")
    .update({
      onboarding_answers: { ...answers, roadmap_dismissed: true },
    })
    .eq("user_id", (ctx.profile as any).id);
}

async function updateProfileFromChat(profileId: string, conversation: ChatMessage[]) {
  const conversationText = conversation
    .map((m) => `${m.role === "user" ? "Studente" : "MIRA"}: ${m.content}`)
    .join("\n");

  const extracted = await chatCompletion(
    [
      {
        role: "system",
        content: `Dalla conversazione, estrai info aggiuntive per il profilo. Rispondi SOLO in JSON:
{"availability":"disponibilità (quando, dove)","desired_role":"ruolo cercato","sectors":["settori"],"short_term_plan":"piano a breve termine","profile_update":"se c'è qualcosa di nuovo da aggiungere al riassunto del profilo, scrivilo qui. Altrimenti lascia vuoto."}
Non inventare. Solo info esplicitamente dette dallo studente.`,
      },
      { role: "user", content: conversationText },
    ],
    { temperature: 0.1, maxTokens: 512, jsonMode: true }
  );

  const data = JSON.parse(extracted);
  const supabase = await createServiceClient();

  const updates: Record<string, unknown> = {};
  if (data.availability) updates.availability = { description: data.availability };
  if (data.desired_role || data.sectors?.length || data.short_term_plan) {
    updates.goals = [data.desired_role, data.short_term_plan].filter(Boolean);
  }

  if (Object.keys(updates).length > 0) {
    await (supabase.from("student_profiles") as any)
      .update(updates)
      .eq("user_id", profileId);
  }
}
