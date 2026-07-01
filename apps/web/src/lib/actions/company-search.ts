"use server";

import { chatCompletion } from "@mira/ai";
import { createServiceClient } from "@mira/supabase/server";
import { getCompanyContext } from "@/lib/auth";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SEARCH_SYSTEM_PROMPT = `Sei MIRA, l'assistente AI per il recruiting di talenti universitari Bocconi.

Aiuti le aziende a trovare studenti Bocconi con i profili più adatti alle loro esigenze. Hai accesso ai profili degli studenti onboardati sulla piattaforma.

COMPORTAMENTO:
- Quando l'azienda descrive cosa cerca, analizza i profili disponibili e identifica i candidati più coerenti
- Per ogni candidato identificato, spiega PERCHÉ è adatto (competenze specifiche, esperienze rilevanti, interessi allineati)
- Mantieni l'anonimato: usa solo codice anonimo (es. "Candidato A", "Candidato B") — mai il nome reale
- Puoi fare domande di chiarimento per restringere la ricerca
- Dopo aver presentato i candidati, chiedi se l'azienda vuole contattarne qualcuno

TONO: professionale ma diretto. Non verbose. Risposte strutturate, facili da leggere.`;

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

  // Load student profiles for context
  const { data: students } = await (supabase.from("student_profiles") as any)
    .select("id, degree_program, degree_level, current_year, interests, goals, experiences, profile_summary, availability")
    .eq("onboarding_completed", true)
    .not("profile_summary", "is", null);

  const studentContext = (students ?? []).map((s: any, idx: number) => {
    const code = `Candidato ${String.fromCharCode(65 + idx)}`;
    const av = s.availability ?? {};
    return `${code} [ID:${s.id}]:
- Corso: ${s.degree_program ?? "n/d"} (${s.degree_level ?? "n/d"}, anno ${s.current_year ?? "n/d"})
- Sommario: ${s.profile_summary ?? "non disponibile"}
- Interessi: ${(s.interests ?? []).join(", ") || "n/d"}
- Obiettivi: ${(s.goals ?? []).slice(0, 3).join(", ") || "n/d"}
- Esperienze: ${(s.experiences ?? []).slice(0, 2).join(" | ") || "n/d"}
- Settori target: ${(av.career_targets?.sectors ?? []).join(", ") || "n/d"}
- Stile: ${av.work_style?.style ?? "n/d"}, ${av.work_style?.teamwork_preference ?? "n/d"}`;
  }).join("\n\n");

  const systemWithProfiles = `${SEARCH_SYSTEM_PROMPT}

---
PROFILI STUDENTI DISPONIBILI (${(students ?? []).length} studenti onboardati):

${studentContext || "Nessuno studente onboardato al momento."}
---

Quando identifichi candidati adatti, includi sempre il loro ID tra parentesi quadre [ID:uuid] in modo che il sistema possa proporre l'azione di contatto.`;

  const updatedHistory: ChatMessage[] = [...history, { role: "user", content: userMessage }];

  const messages = [
    { role: "system" as const, content: systemWithProfiles },
    ...updatedHistory,
  ];

  const assistantMessage = await chatCompletion(messages, { temperature: 0.6, maxTokens: 1024 });

  const fullHistory: ChatMessage[] = [...updatedHistory, { role: "assistant", content: assistantMessage }];

  // Update title on first real message
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
    .eq("company_id", (company as any).id);

  return { message: assistantMessage };
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
