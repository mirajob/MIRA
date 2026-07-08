"use server";

import { chatCompletion } from "@mira/ai";
import { createServiceClient } from "@mira/supabase/server";
import { getCompanyContext } from "@/lib/auth";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface CandidateMatch {
  code: string;
  dimension: "competenze" | "disponibilita" | "entrambe";
  reason: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  candidates?: CandidateMatch[];
}

const SEARCH_SYSTEM_PROMPT = `Sei MIRA, l'assistente AI per il recruiting di talenti universitari Bocconi.

Aiuti le aziende a trovare studenti Bocconi con i profili più adatti alle loro esigenze, leggendo la MiraCard di ogni studente — un profilo costruito su evidenze reali (competenze, esperienze, disponibilità, lingue, come si descrive, piano di carriera), non auto-dichiarazioni generiche.

COMPORTAMENTO:
- Analizza davvero il contenuto delle card rispetto a quello che l'azienda cerca. Non fare matching per parole chiave isolate: ragiona su cosa significa davvero la richiesta e confrontala con l'evidenza in ogni card.
- Valuta due dimensioni separate: "competenze" (esperienze/competenze/formazione coerenti col ruolo) e "disponibilita" (periodo, ambito, tipo di opportunità compatibili con quanto richiesto). Un candidato può essere fortissimo su una dimensione e debole sull'altra: segnalalo sempre, non nasconderlo e non appiattire tutto in un punteggio unico.
- Se un candidato è forte su entrambe le dimensioni, usa "entrambe".
- IMPORTANTE: restituisci SEMPRE i migliori candidati disponibili (fino a 6), anche se nessuno soddisfa tutti i criteri alla perfezione. Un'azienda che cerca "Excel avanzato" preferisce vedere il candidato più vicino con questo gap segnalato onestamente nel "reason" (es. "forte in finanza e contabilità, ma la card non riporta competenze Excel specifiche"), piuttosto che non vedere nessuno. Restituisci un array vuoto SOLO se non c'è alcuno studente onboardato, oppure se il messaggio dell'azienda è una domanda di chiarimento e non una vera richiesta di ricerca.
- Non inventare mai informazioni non presenti nella card — i gap si segnalano dicendo cosa manca, non inventando cosa "potrebbe" esserci.
- Non usare nomi reali (non li conosci). Nel testo del messaggio non citare codici candidato: la UI mostrerà i risultati separatamente. Puoi riferirti a loro in modo generico ("un profilo con esperienza forte in...").
- Se la richiesta è troppo vaga per essere utile, fai una domanda di chiarimento e restituisci un array vuoto.

TONO: professionale ma diretto. Risposte brevi, non verbose.

Rispondi SOLO con un oggetto JSON in questa forma esatta, nessun altro testo:
{
  "message": "testo conversazionale per l'azienda — nessun nome, nessun codice candidato",
  "matches": [
    { "student_id": "<id esatto copiato dal profilo, non inventarlo>", "dimension": "competenze" | "disponibilita" | "entrambe", "reason": "una frase breve e specifica, basata su cosa c'è davvero nella card" }
  ]
}`;

function buildCandidateContext(
  students: Array<{ id: string; degree_program: string | null; degree_level: string | null; current_year: number | null }>,
  blocksByStudent: Map<string, Record<string, any>>
): string {
  return students.map((s) => {
    const blocks = blocksByStudent.get(s.id) ?? {};
    const header = blocks.header?.prose_content ?? {};
    const disp = blocks.disponibilita?.prose_content ?? {};
    const esperienze = blocks.esperienze?.prose_content?.items ?? [];
    const competenze = blocks.competenze?.prose_content?.items ?? [];
    const lingue = blocks.lingue?.prose_content?.items ?? [];
    const autodescrizione = blocks.autodescrizione?.prose_content?.testo ?? null;
    const pianoCarriera = blocks.piano_carriera?.prose_content?.testo ?? null;

    return `student_id: ${s.id}
- Corso: ${header.corso ?? s.degree_program ?? "n/d"} (${header.livello ?? s.degree_level ?? "n/d"}, anno ${header.anno ?? s.current_year ?? "n/d"})
- Cerca: ${disp.cosa_cerca ?? "n/d"}, ambito: ${disp.ambito ?? "n/d"}, periodo: ${disp.periodo ?? "n/d"}
- Competenze: ${competenze.map((c: any) => c.testo).filter(Boolean).join(", ") || "n/d"}
- Esperienze: ${esperienze.map((e: any) => `${e.ruolo || e.titolo || ""} @ ${e.organizzazione ?? ""} — ${e.descrizione ?? ""}`.trim()).filter((x: string) => x !== "@") .join(" | ") || "n/d"}
- Lingue: ${lingue.map((l: any) => `${l.lingua} (${l.livello})`).join(", ") || "n/d"}
- Come si descrive: ${autodescrizione ?? "n/d"}
- Piano di carriera: ${pianoCarriera ?? "n/d"}`;
  }).join("\n\n");
}

export async function createCompanySearch(slug: string) {
  const { company } = await getCompanyContext(slug);
  const supabase = await createServiceClient();

  const { data, error } = await (supabase.from("company_searches") as any)
    .insert({
      company_id: (company as any).id,
      title: "Nuova ricerca",
      messages: [],
    })
    .select("id, title, created_at")
    .single();

  if (error) return { error: error.message };
  return { search: data };
}

export async function loadCompanySearches(slug: string) {
  const { company } = await getCompanyContext(slug);
  const supabase = await createServiceClient();

  const { data } = await (supabase.from("company_searches") as any)
    .select("id, title, created_at, updated_at")
    .eq("company_id", (company as any).id)
    .eq("status", "active")
    .order("updated_at", { ascending: false });

  return data ?? [];
}

export async function loadSearchMessages(slug: string, searchId: string): Promise<ChatMessage[]> {
  const { company } = await getCompanyContext(slug);
  const supabase = await createServiceClient();

  const { data } = await (supabase.from("company_searches") as any)
    .select("messages, company_id")
    .eq("id", searchId)
    .eq("company_id", (company as any).id)
    .maybeSingle();

  return (data?.messages as ChatMessage[]) ?? [];
}

export async function sendSearchMessage(
  slug: string,
  searchId: string,
  userMessage: string,
  history: ChatMessage[]
) {
  const { company } = await getCompanyContext(slug);
  const supabase = await createServiceClient();
  const companyId = (company as any).id as string;

  const { data: students } = await (supabase.from("student_profiles") as any)
    .select("id, degree_program, degree_level, current_year")
    .eq("onboarding_completed", true);

  const studentIds = (students ?? []).map((s: any) => s.id);

  const { data: blockRows } = studentIds.length
    ? await (supabase.from("card_blocks") as any)
        .select("student_profile_id, block_type, prose_content")
        .in("student_profile_id", studentIds)
        .eq("status", "approved")
    : { data: [] };

  const blocksByStudent = new Map<string, Record<string, any>>();
  for (const row of blockRows ?? []) {
    const existing = blocksByStudent.get(row.student_profile_id) ?? {};
    existing[row.block_type] = row;
    blocksByStudent.set(row.student_profile_id, existing);
  }

  const candidateContext = buildCandidateContext(students ?? [], blocksByStudent);

  const systemWithProfiles = `${SEARCH_SYSTEM_PROMPT}

---
MIRACARD DEGLI STUDENTI ONBOARDATI (${(students ?? []).length} studenti, solo blocchi approvati dallo studente):

${candidateContext || "Nessuno studente onboardato al momento."}
---`;

  const updatedHistory: ChatMessage[] = [...history, { role: "user", content: userMessage }];

  const messages = [
    { role: "system" as const, content: systemWithProfiles },
    ...updatedHistory.map((m) => ({ role: m.role, content: m.content })),
  ];

  const raw = await chatCompletion(messages, { temperature: 0.4, maxTokens: 1500, jsonMode: true });

  let parsed: { message: string; matches: Array<{ student_id: string; dimension: string; reason: string }> };
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { message: raw, matches: [] };
  }

  const validStudentIds = new Set((students ?? []).map((s: any) => s.id));
  const validDimensions = new Set(["competenze", "disponibilita", "entrambe"]);

  const candidates: CandidateMatch[] = [];
  for (const m of parsed.matches ?? []) {
    if (!validStudentIds.has(m.student_id)) continue;
    const { data: code } = await supabase.rpc("get_or_create_candidate_code", {
      p_company_id: companyId,
      p_student_profile_id: m.student_id,
    });
    if (!code) continue;
    candidates.push({
      code: code as unknown as string,
      dimension: validDimensions.has(m.dimension) ? (m.dimension as CandidateMatch["dimension"]) : "competenze",
      reason: m.reason ?? "",
    });
  }

  const assistantMessage: ChatMessage = { role: "assistant", content: parsed.message, candidates };
  const fullHistory: ChatMessage[] = [...updatedHistory, assistantMessage];

  let title: string | undefined;
  if (history.length === 0) {
    title = userMessage.slice(0, 60) + (userMessage.length > 60 ? "..." : "");
  }

  await (supabase.from("company_searches") as any)
    .update({
      messages: fullHistory,
      ...(title ? { title } : {}),
    })
    .eq("id", searchId)
    .eq("company_id", companyId);

  return { message: parsed.message, candidates };
}

export async function updateSearchTitle(slug: string, searchId: string, title: string) {
  const { company } = await getCompanyContext(slug);
  const supabase = await createServiceClient();
  await (supabase.from("company_searches") as any)
    .update({ title })
    .eq("id", searchId)
    .eq("company_id", (company as any).id);
}

export async function deleteSearch(slug: string, searchId: string) {
  const { company } = await getCompanyContext(slug);
  const supabase = await createServiceClient();
  await (supabase.from("company_searches") as any)
    .update({ status: "archived" })
    .eq("id", searchId)
    .eq("company_id", (company as any).id);
}
