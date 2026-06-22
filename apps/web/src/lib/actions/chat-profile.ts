"use server";

import { chatCompletion } from "@mira/ai";
import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

async function buildFullContext(profileId: string) {
  const supabase = await createServiceClient();

  const { data: student } = await (supabase.from("student_profiles") as any)
    .select("profile_summary, degree_program, degree_level, current_year, transcript_summary, transcript_uploaded, interests, goals, experiences, onboarding_answers")
    .eq("user_id", profileId)
    .single();

  const { data: courses } = await (supabase.from("student_courses") as any)
    .select("course_name, grade, grade_numeric, credits, semester")
    .eq("student_id", profileId)
    .order("grade_numeric", { ascending: false });

  const { data: memberships } = await (supabase.from("association_memberships") as any)
    .select("role, title, activity_description, association_profiles(name, slug, category, short_description)")
    .eq("user_id", profileId)
    .eq("status", "active");

  const { data: associations } = await (supabase.from("association_profiles") as any)
    .select("name, category, short_description")
    .eq("public_page_status", "published");

  const { data: openCycles } = await (supabase.from("application_cycles") as any)
    .select("title, closes_at, association_profiles(name)")
    .eq("status", "open");

  return { student, courses, memberships, associations, openCycles };
}

function buildSystemPrompt(ctx: Awaited<ReturnType<typeof buildFullContext>>): string {
  const { student, courses, memberships, associations, openCycles } = ctx;
  const ts = student?.transcript_summary;

  let studentData = "";
  if (student) {
    studentData = `
PROFILO STUDENTE:
- Corso: ${ts?.degree_program || student.degree_program || "non noto"}
- Livello: ${ts?.degree_level || student.degree_level || "non noto"}
- Anno: ${student.current_year || "non noto"}`;
    if (student.profile_summary) studentData += `\n- Riassunto: ${student.profile_summary}`;
    if (student.interests?.length) studentData += `\n- Interessi: ${student.interests.join(", ")}`;
    if (student.goals?.length) studentData += `\n- Obiettivi: ${student.goals.join(", ")}`;
    if (student.experiences?.length) studentData += `\n- Esperienze: ${student.experiences.join(", ")}`;
  }

  let transcriptData = "";
  if (ts) {
    transcriptData = `
DATI ACCADEMICI (dal transcript):
- Media ponderata: ${ts.weighted_average ? `${ts.weighted_average}/30` : "non calcolata"} (calcolata solo su esami con voto numerico, esclusi pass/fail)
- Crediti con voto: ${ts.graded_credits ?? 0} CFU
- Crediti pass/fail: ${ts.pass_fail_credits ?? 0} CFU (NON contano nella media)
- Crediti totali: ${ts.total_credits ?? 0} CFU
- Esami completati: ${ts.courses?.length ?? 0}
NOTA: gli esami pass/fail (es. seminari da 1 CFU) NON hanno voto numerico e NON entrano nel calcolo della media ponderata.`;
  }

  if (courses?.length) {
    const courseList = courses.map((c: any) =>
      `  ${c.course_name}: ${c.grade} (${c.credits} CFU)`
    ).join("\n");
    transcriptData += `\n\nTUTTI GLI ESAMI CON VOTI:\n${courseList}`;
  } else if (ts?.courses?.length) {
    const courseList = ts.courses.map((c: any) =>
      `  ${c.course_name}: ${c.grade} (${c.credits} CFU)`
    ).join("\n");
    transcriptData += `\n\nTUTTI GLI ESAMI CON VOTI:\n${courseList}`;
  }

  let membershipData = "";
  if (memberships?.length) {
    const list = memberships.map((m: any) => {
      const name = m.association_profiles?.name ?? "?";
      const role = m.role === "association_president" ? "Presidente"
        : m.role === "association_admin" ? "Admin"
        : m.title || "Membro";
      let desc = `- ${name}: ${role}`;
      if (m.activity_description) desc += ` — ${m.activity_description}`;
      return desc;
    }).join("\n");
    membershipData = `\nASSOCIAZIONI DELLO STUDENTE:\n${list}`;
  }

  const memberAssociationNames = new Set(
    (memberships ?? []).map((m: any) => m.association_profiles?.name).filter(Boolean)
  );

  let platformData = "";
  if (associations?.length) {
    const otherAssociations = associations.filter((a: any) => !memberAssociationNames.has(a.name));
    const relevantCycles = (openCycles ?? []).filter((c: any) =>
      !memberAssociationNames.has(c.association_profiles?.name)
    );

    if (otherAssociations.length) {
      platformData += `\nALTRE ASSOCIAZIONI SU MIRA (lo studente NON è membro):\n${otherAssociations.map((a: any) => `- ${a.name} (${a.category || "generale"})`).join("\n")}`;
    }
    if (relevantCycles.length) {
      platformData += `\n\nCANDIDATURE APERTE (per associazioni in cui NON è già membro):\n${relevantCycles.map((c: any) =>
        `- ${c.association_profiles?.name}: "${c.title}"${c.closes_at ? ` (scade ${new Date(c.closes_at).toLocaleDateString("it-IT")})` : ""}`
      ).join("\n")}`;
    }
  }

  return `Tu sei MIRA, la piattaforma AI per il talento universitario di Bocconi.

CHI SEI: MIRA accompagna gli studenti Bocconi nel percorso — orientamento, candidature alle associazioni, profilo basato su evidenze. In futuro: simulazioni e matching con aziende.
${studentData}
${transcriptData}
${membershipData}
${platformData}

COME COMPORTARTI:
- HAI ACCESSO A TUTTI I DATI sopra. Usali direttamente nelle risposte.
- Se ti chiede dei voti, ELENCA i voti specifici dai dati sopra. Non dire "non ho accesso".
- Se ti chiede della media, USA il dato dalla sezione DATI ACCADEMICI.
- Se ti chiede delle associazioni, SAI in quali è e con che ruolo.
- NON suggerire MAI di candidarsi ad associazioni in cui è GIÀ MEMBRO o di cui è PRESIDENTE.
- Se è presidente/admin di un'associazione, puoi aiutarlo con la gestione (candidature, board, ecc.)
- Tutto quello che lo studente ti dice arricchisce il suo profilo MIRA automaticamente.

COME PARLARE:
- Come un amico intelligente che conosce Bocconi. Diretto, genuino.
- UNA domanda alla volta. Mai elenchi.
- Reagisci davvero — commenti concreti basati sui dati reali.
- Lo studente È GIÀ A BOCCONI. Non chiedergli se vuole entrarci.

NON FARE:
- Non dire MAI "non ho accesso ai dati" — HAI tutti i dati sopra
- Non suggerire di candidarsi alle proprie associazioni
- Non ripresentarti ogni volta
- Non dire "Grazie per aver condiviso!"
- Non essere un generico career coach — sei MIRA, sai le cose concrete`;
}

export async function sendProfileMessage(
  conversationHistory: ChatMessage[],
  userMessage: string
) {
  const userCtx = await getUserContext();
  const profileId = (userCtx.profile as any).id as string;
  const supabase = await createServiceClient();

  const fullCtx = await buildFullContext(profileId);
  const systemPrompt = buildSystemPrompt(fullCtx);

  const updatedHistory = [
    ...conversationHistory,
    { role: "user" as const, content: userMessage },
  ];

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...updatedHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  const assistantMessage = await chatCompletion(messages, {
    temperature: 0.7,
    maxTokens: 500,
  });

  const fullHistory = [
    ...updatedHistory,
    { role: "assistant" as const, content: assistantMessage },
  ];

  const answers = fullCtx.student?.onboarding_answers || {};
  await (supabase.from("student_profiles") as any)
    .update({
      onboarding_answers: {
        ...answers,
        profile_chat: fullHistory,
        profile_chat_updated: new Date().toISOString(),
      },
    })
    .eq("user_id", profileId);

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
  const recent = conversation.slice(-8);
  const conversationText = recent
    .map((m) => `${m.role === "user" ? "Studente" : "MIRA"}: ${m.content}`)
    .join("\n");

  const extracted = await chatCompletion(
    [
      {
        role: "system",
        content: `Dagli ultimi messaggi della conversazione, estrai info nuove per il profilo. Rispondi SOLO in JSON:
{"interests":["nuovi interessi emersi"],"goals":["nuovi obiettivi emersi"],"experiences":["nuove esperienze menzionate"],"current_year":null,"profile_update":"aggiornamento al riassunto del profilo se c'è qualcosa di nuovo e significativo, altrimenti vuoto"}
current_year: numero intero (1, 2, 3...) se lo studente ha detto in che anno è. null se non menzionato.
SOLO info esplicitamente dette dallo studente. Non inventare. Array vuoti se niente di nuovo.`,
      },
      { role: "user", content: conversationText },
    ],
    { temperature: 0.1, maxTokens: 512, jsonMode: true }
  );

  const data = JSON.parse(extracted);
  const supabase = await createServiceClient();

  const { data: current } = await (supabase.from("student_profiles") as any)
    .select("interests, goals, experiences, profile_summary")
    .eq("user_id", profileId)
    .single();

  const updates: Record<string, unknown> = {};

  const mergeArray = (existing: string[], incoming: string[]) => {
    const set = new Set([...(existing || []), ...incoming.filter(Boolean)]);
    return [...set];
  };

  if (data.interests?.length) updates.interests = mergeArray(current?.interests, data.interests);
  if (data.goals?.length) updates.goals = mergeArray(current?.goals, data.goals);
  if (data.experiences?.length) updates.experiences = mergeArray(current?.experiences, data.experiences);
  if (data.current_year) updates.current_year = data.current_year;
  if (data.profile_update) updates.profile_summary = data.profile_update;

  if (Object.keys(updates).length > 0) {
    await (supabase.from("student_profiles") as any)
      .update(updates)
      .eq("user_id", profileId);
  }
}
