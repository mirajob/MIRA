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
2. "Scrivi una descrizione per i candidati — cosa devono sapere di questa selezione?" (opzionale, rispondi "no" per saltare)
3. "Aprite per posizioni specifiche (es. M&A Analyst, VP Marketing) o è una candidatura generica aperta a tutti?"
   - Se dice "generica" o simile → positions vuoto, vai al punto 4
   - Se elenca posizioni → salvale con nome e descrizione breve (se la danno). NON chiedere requisiti per singola posizione.
4. "Che tipo di profilo cercate in generale per questa selezione? Descrivete il candidato ideale: interessi, competenze, attitudini, anno di corso, esperienze utili..." — QUESTA È LA DOMANDA PIÙ IMPORTANTE. I requisiti sono generali per l'associazione, non per singola posizione. MIRA userà questi criteri per valutare i candidati e suggerire la posizione più adatta.
5. "Volete fare domande specifiche ai candidati? Se sì, elencale. Se no, scrivi 'no'."
6. "Quando apre e quando chiude il ciclo? (es. dal 1 luglio al 15 settembre)"
7. Fai un RIEPILOGO completo e chiedi: "Va bene così? Scrivi 'conferma' per creare il ciclo, oppure dimmi cosa modificare."

REGOLE:
- UNA domanda alla volta, conciso e diretto
- "generica" NON è il nome di una posizione — significa candidatura aperta senza ruoli specifici
- NON chiedere requisiti per singola posizione. I requisiti sono GENERALI per l'associazione. MIRA valuterà il fit del candidato con l'associazione e suggerirà la posizione migliore.
- Se il presidente dice qualcosa di ambiguo, interpreta con buon senso
- Quando hai tutte le info, fai il riepilogo PRIMA di chiedere conferma
- Non creare nulla finché il presidente non scrive "conferma"
- Quando il presidente conferma, rispondi con un messaggio di conferma E aggiungi alla fine ESATTAMENTE: CICLO_PRONTO seguito dal JSON

FORMATO CONFERMA:
CICLO_PRONTO
{"title":"...","description":"...","requirements":"requisiti GENERALI per la valutazione AI — profilo ideale, competenze, attitudini, anno di corso","positions":[{"name":"...","description":"..."}],"questions":["domanda 1","domanda 2"],"opens_at":"YYYY-MM-DD","closes_at":"YYYY-MM-DD"}

Se candidatura generica, positions deve essere un array vuoto [].
Le positions NON devono avere il campo "requirements" — i requisiti sono solo generali.`;

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
      evaluation_criteria: cycleData.requirements ? { general_requirements: cycleData.requirements } : {},
      created_by_user_id: (ctx.profile as any).id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Add questions if any
  const rawQuestions = cycleData.questions ?? [];
  const questionTexts: string[] = [];
  for (const q of rawQuestions) {
    if (!q) continue;
    const text = typeof q === "string" ? q : (q.text || q.question || q.question_text || "");
    const lower = text.toLowerCase().trim();
    if (!lower || lower === "no" || lower === "nessuna" || lower === "none") continue;
    questionTexts.push(text);
  }

  if (questionTexts.length > 0) {
    const questionRows = questionTexts.map((text, i) => ({
      application_cycle_id: cycle.id,
      question_text: text,
      question_type: "long_text",
      required: true,
      order_index: i,
      options: [],
    }));
    await (supabase.from("application_questions") as any).insert(questionRows);
  }

  const { data: association } = await (supabase.from("association_profiles") as any)
    .select("slug")
    .eq("id", associationId)
    .single();

  revalidatePath(`/association/${association?.slug}/cycles`);
  return { success: true, cycleId: cycle.id, slug: association?.slug };
}
