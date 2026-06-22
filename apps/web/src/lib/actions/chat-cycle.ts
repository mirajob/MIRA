"use server";

import { chatCompletion } from "@mira/ai";
import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `Sei MIRA, e stai aiutando il presidente di un'associazione universitaria a creare un nuovo ciclo di candidatura.

IL TUO OBIETTIVO: raccogliere tutte le informazioni necessarie per creare il ciclo. Fai UNA domanda alla volta.

FLUSSO DI DOMANDE (in ordine):
1. "Come vuoi chiamare questo ciclo di candidatura?" (es. Recruiting Fall 2026)
2. "Scrivi una descrizione per i candidati — cosa devono sapere di questa selezione?" (opzionale)
3. "Per quali posizioni aprite le candidature? Elencale una per una. Scrivi 'generica' se è una candidatura aperta senza ruoli specifici."
4. Per ogni posizione: "Cosa cercate per [nome posizione]? Descrivi il profilo ideale e i requisiti."
5. "Avete domande specifiche che volete fare ai candidati? Se sì, elencale. Altrimenti scrivi 'no'."
6. "Quando apre e quando chiude il ciclo? (es. dal 1 luglio al 15 settembre)"
7. Fai un RIEPILOGO completo di tutto e chiedi: "Va bene così? Scrivi 'conferma' per creare il ciclo, oppure dimmi cosa modificare."

REGOLE:
- UNA domanda alla volta
- Sii conciso e diretto
- Se il presidente risponde in modo vago, chiedi di essere più specifico
- Quando hai tutte le info, fai il riepilogo PRIMA di chiedere conferma
- Non creare nulla finché il presidente non scrive "conferma"
- Quando il presidente conferma, rispondi ESATTAMENTE con: "CICLO_PRONTO" seguito dal JSON dei dati

FORMATO CONFERMA (quando il presidente scrive "conferma"):
CICLO_PRONTO
{"title":"...","description":"...","positions":[{"name":"...","description":"...","requirements":"..."}],"questions":["domanda 1","domanda 2"],"opens_at":"YYYY-MM-DD","closes_at":"YYYY-MM-DD"}`;

export async function sendCycleMessage(
  conversationHistory: ChatMessage[],
  userMessage: string,
  associationName: string
) {
  const updatedHistory = [
    ...conversationHistory,
    { role: "user" as const, content: userMessage },
  ];

  const today = new Date().toISOString().split("T")[0];
  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT + `\n\nASSOCIAZIONE: ${associationName}\nDATA ODIERNA: ${today}. Usa l'anno corretto (2026) per le date.` },
    ...updatedHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  const assistantMessage = await chatCompletion(messages, {
    temperature: 0.5,
    maxTokens: 800,
  });

  return { message: assistantMessage };
}

export async function createCycleFromChat(
  associationId: string,
  conversation: ChatMessage[]
) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  const { data: membership } = await (supabase.from("association_memberships") as any)
    .select("role, permissions")
    .eq("association_id", associationId)
    .eq("user_id", (ctx.profile as any).id)
    .eq("status", "active")
    .maybeSingle();

  const canCreate =
    ctx.isMiraAdmin ||
    membership?.role === "association_president" ||
    (membership?.permissions as Record<string, boolean>)?.manage_application_cycles;

  if (!canCreate) return { error: "Non hai i permessi" };

  const lastAssistantMsg = [...conversation].reverse().find((m) => m.role === "assistant");
  if (!lastAssistantMsg?.content.includes("CICLO_PRONTO")) {
    return { error: "Il ciclo non è ancora stato confermato" };
  }

  const jsonStr = lastAssistantMsg.content.split("CICLO_PRONTO")[1].trim();
  let cycleData: any;
  try {
    cycleData = JSON.parse(jsonStr);
  } catch {
    // Try extracting JSON from the message
    const jsonMatch = lastAssistantMsg.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { error: "Errore nel parsing dei dati del ciclo" };
    cycleData = JSON.parse(jsonMatch[0]);
  }

  if (!cycleData.title) return { error: "Il titolo è obbligatorio" };

  const positions = (cycleData.positions ?? []).map((p: any) => ({
    name: p.name,
    description: p.description || null,
    requirements: p.requirements || null,
  }));

  const { data: cycle, error } = await (supabase.from("application_cycles") as any)
    .insert({
      association_id: associationId,
      title: cycleData.title,
      description: cycleData.description || null,
      status: "open",
      opens_at: cycleData.opens_at || null,
      closes_at: cycleData.closes_at || null,
      available_roles: positions,
      created_by_user_id: (ctx.profile as any).id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Add questions if any
  if (cycleData.questions?.length) {
    for (let i = 0; i < cycleData.questions.length; i++) {
      const q = cycleData.questions[i];
      if (!q || q === "no") continue;
      await (supabase.from("application_questions") as any).insert({
        application_cycle_id: cycle.id,
        question_text: typeof q === "string" ? q : q.text,
        question_type: "free_text",
        required: true,
        order_index: i,
      });
    }
  }

  const { data: association } = await (supabase.from("association_profiles") as any)
    .select("slug")
    .eq("id", associationId)
    .single();

  revalidatePath(`/association/${association?.slug}/cycles`);
  return { success: true, cycleId: cycle.id, slug: association?.slug };
}
