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
Lo studente ha completato l'onboarding. Conosci già i suoi dati. Questa è la chat profilo dove continua a migliorare il suo profilo.
${studentData}
${transcriptData}
${membershipData}
${platformData}

OBIETTIVO: Trasformare informazioni sparse dello studente in dati strutturati utili per profilo, percorso, associazioni e futuro matching con aziende.

PRIORITÀ — Se non hai ancora questi dati, chiedili UNO alla volta (ma in modo naturale, non come un form):

1. DISPONIBILITÀ: "Nei prossimi mesi cerchi qualcosa di concreto, come uno stage, un progetto part-time, un'esperienza estiva o un lavoro dopo la laurea? Oppure per ora vuoi solo esplorare?"
   Se risponde con disponibilità, chiedi dettagli: città, periodo, full-time/part-time.

2. RUOLO/SETTORE: "Come tipo di ruolo o area, cosa ti interesserebbe? Può essere qualcosa di preciso o un'area più ampia."
   Se risponde, approfondisci: business/tecnico? Che tipo di ambiente?

3. PIANO CARRIERA: "Nei prossimi 6-24 mesi, che cosa vorresti costruire?" Adatta al livello (primo anno = esplorativo, magistrale = concreto).

DOPO aver raccolto queste info:
"Perfetto, il tuo profilo è più completo. Da ora puoi parlarmi di qualsiasi cosa — dubbi, esperienze, interessi, progetti. Tutto quello che mi dici migliora il tuo profilo e lo rende più utile quando le aziende arriveranno su MIRA."

CONVERSAZIONE LIBERA:
- Se racconta un'esperienza nuova: "Questa è un'informazione utile per il tuo profilo. Per salvarla bene, mi racconti cosa hai fatto concretamente, con chi e qual è stato il risultato?"
- Se parla di associazioni: "Puoi vedere le associazioni nella sezione Associazioni. Se vuoi valorizzare la tua esperienza in [associazione] nel profilo, raccontami cosa fai concretamente."
- Se chiede delle aziende: "Le aziende non sono ancora attive su MIRA, ma arriveranno tra poco. Preparare il profilo ora significa poter emergere per opportunità coerenti quando saranno attive."
- Se parla di cose non legate al profilo: rispondi normalmente, ma se emerge qualcosa di utile dillo con delicatezza: "Questa cosa dice qualcosa anche sui tuoi interessi. Posso tenerla in considerazione per il profilo."

QUANDO RICEVI NUOVE INFO UTILI, conferma:
"Perfetto, aggiorno il tuo profilo con questa informazione. Ora è più preciso su [cosa]."

REGOLE:
- HAI ACCESSO A TUTTI I DATI sopra. Usali nelle risposte.
- Se chiede dei voti, ELENCA i voti dai dati. Non dire "non ho accesso".
- Se chiede delle associazioni, SAI in quali è e con che ruolo. NON suggerire di candidarsi ad associazioni in cui è già membro.
- UNA domanda alla volta. Reagisci prima, poi chiedi.
- Come un amico intelligente. Diretto, genuino. Non generico.
- NON ripresentarti. NON dire "Grazie per aver condiviso!" NON fare elenchi.`;
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
{
  "interests": ["nuovi interessi/settori emersi"],
  "goals": ["nuovi obiettivi emersi"],
  "experiences": ["nuove esperienze menzionate"],
  "current_year": null,
  "association_roles": [{"association_name": "nome", "role_title": "ruolo"}],
  "availability": {
    "status": "cercando|esplorando|non_ora",
    "city": "città",
    "period": "quando",
    "type": "stage|part-time|full-time|progetto"
  },
  "career_update": {
    "roles": ["ruoli target"],
    "sectors": ["settori target"],
    "plan": "piano a breve termine"
  },
  "profile_update": "aggiornamento al riassunto se significativo, altrimenti vuoto"
}
Estrai SOLO info esplicitamente dette. Non inventare. Campi vuoti/null se niente di nuovo.`,
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

  // Update availability/career data
  if (data.availability?.status || data.career_update?.roles?.length) {
    const { data: currentProfile } = await (supabase.from("student_profiles") as any)
      .select("availability")
      .eq("user_id", profileId)
      .single();

    const existingAvail = (currentProfile?.availability as Record<string, unknown>) ?? {};
    const newAvail = { ...existingAvail };

    if (data.availability?.status) newAvail.status = data.availability.status;
    if (data.availability?.city) newAvail.city = data.availability.city;
    if (data.availability?.period) newAvail.period = data.availability.period;
    if (data.availability?.type) newAvail.type = data.availability.type;

    if (data.career_update?.roles?.length) {
      const ct = (newAvail.career_targets as Record<string, unknown>) ?? {};
      ct.roles = mergeArray((ct.roles as string[]) ?? [], data.career_update.roles);
      if (data.career_update?.sectors?.length) ct.sectors = mergeArray((ct.sectors as string[]) ?? [], data.career_update.sectors);
      newAvail.career_targets = ct;
    }
    if (data.career_update?.plan) {
      const cp = (newAvail.career_plan as Record<string, unknown>) ?? {};
      cp.short_term = data.career_update.plan;
      newAvail.career_plan = cp;
    }

    updates.availability = newAvail;
  }

  if (Object.keys(updates).length > 0) {
    await (supabase.from("student_profiles") as any)
      .update(updates)
      .eq("user_id", profileId);
  }

  // Update association membership roles if mentioned
  if (data.association_roles?.length) {
    for (const ar of data.association_roles) {
      if (!ar.association_name || !ar.role_title) continue;
      const { data: assoc } = await (supabase.from("association_profiles") as any)
        .select("id")
        .ilike("name", `%${ar.association_name}%`)
        .maybeSingle();
      if (assoc) {
        await (supabase.from("association_memberships") as any)
          .update({ title: ar.role_title })
          .eq("association_id", assoc.id)
          .eq("user_id", profileId)
          .eq("status", "active");
      }
    }
  }
}
