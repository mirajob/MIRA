"use server";

import { chatCompletion } from "@mira/ai";
import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { generatePathwayAnalysis } from "./pathway";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

async function getStudentContext() {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();
  const profileId = (ctx.profile as any).id as string;

  const { data: student } = await (supabase.from("student_profiles") as any)
    .select("degree_program, degree_level, current_year, transcript_summary, transcript_uploaded")
    .eq("user_id", profileId)
    .single();

  const { data: associations } = await (supabase.from("association_profiles") as any)
    .select("name, slug, category, short_description")
    .eq("public_page_status", "published");

  const { data: openCycles } = await (supabase.from("application_cycles") as any)
    .select("title, association_id, closes_at, association_profiles(name)")
    .eq("status", "open");

  return { ctx, supabase, profileId, student, associations, openCycles };
}

function buildSystemPrompt(student: any, associations: any[], openCycles: any[]): string {
  let studentContext = "";
  if (student?.transcript_uploaded && student?.transcript_summary) {
    const ts = student.transcript_summary;
    studentContext = `
DATI DELLO STUDENTE (dal transcript caricato):
- Corso: ${ts.degree_program || student.degree_program || "non noto"}
- Livello: ${ts.degree_level || student.degree_level || "non noto"}
- Esami completati: ${ts.courses?.length ?? 0}
- Crediti totali: ${ts.total_credits ?? 0} CFU
- Media ponderata: ${ts.weighted_average ? `${ts.weighted_average}/30` : "non calcolata"}
- Voti più alti: ${ts.courses?.filter((c: any) => c.grade_numeric >= 28).map((c: any) => `${c.course_name} (${c.grade})`).slice(0, 5).join(", ") || "nessuno"}

Lo studente È GIÀ ISCRITTO a Bocconi. Non chiedergli se ha preparato la candidatura per Bocconi — ci è già dentro.`;
  }

  let assocContext = "";
  if (associations?.length > 0) {
    const list = associations.map((a: any) => `- ${a.name} (${a.category || "generale"}): ${a.short_description || ""}`).join("\n");
    const openList = openCycles?.map((c: any) => `- ${c.association_profiles?.name}: "${c.title}"${c.closes_at ? ` (scade ${new Date(c.closes_at).toLocaleDateString("it-IT")})` : ""}`).join("\n") || "nessuna al momento";

    assocContext = `
ASSOCIAZIONI SU MIRA:
${list}

CANDIDATURE APERTE ORA:
${openList}

Quando lo studente parla di associazioni, TU SAI quali ci sono su MIRA. Se menziona un'associazione presente, digli che può candidarsi direttamente dalla piattaforma dopo aver completato il profilo.`;
  }

  return `Tu sei MIRA, la piattaforma AI per il talento universitario di Bocconi.
Lo studente si è appena registrato e sta facendo l'onboarding. Gli hai già mandato il messaggio di presentazione e gli hai chiesto se studia triennale, magistrale o ciclo unico. NON ripresentarti.
${studentContext}
${assocContext}

FLUSSO OBBLIGATORIO — segui questi step in ordine, UNA domanda alla volta:

STEP 1 — PERCORSO ACCADEMICO
Dopo che lo studente ha risposto triennale/magistrale/ciclo unico:

SE TRIENNALE O CICLO UNICO:
"Perfetto. Per costruire il tuo profilo iniziale parto dai dati più oggettivi: il tuo percorso accademico. Se ce l'hai, carica il transcript universitario o un documento con esami, voti e CFU. Da lì potrò ricavare automaticamente università, corso, esami sostenuti, voti, CFU e media ponderata. Ti chiederò solo alcune informazioni che non sono sempre nel transcript, come l'anno di corso. Puoi caricarlo qui."

SE MAGISTRALE:
"Perfetto. Se sei in magistrale, prima di leggere il transcript attuale ho bisogno di ricostruire brevemente il tuo percorso precedente. Mi dici: in quale università hai fatto la triennale? Qual era il nome del corso? Con che voto ti sei laureato? Se vuoi, su cosa hai fatto la tesi?"
Dopo la risposta sulla triennale:
"Grazie. Ora puoi caricare il transcript della magistrale, così aggiorno il tuo profilo con esami, voti, CFU, media e competenze collegate al percorso che stai facendo ora."

DOPO IL TRANSCRIPT: Commenta i dati in modo naturale — cosa noti, cosa ti colpisce. NON elencare i corsi. Poi chiedi l'anno di corso se non è emerso.

STEP 2 — ESPERIENZE, PROGETTI, ATTIVITÀ
Adatta la domanda al livello:
- Primo anno: "Ora passiamo a quello che hai fatto fuori dagli esami. Se sei all'inizio dell'università è normalissimo non avere ancora esperienze lavorative strutturate. Vanno benissimo anche attività scolastiche, volontariato, sport, progetti personali, piccoli lavori, esperienze in associazioni, competizioni, viaggi studio o qualsiasi cosa ti abbia fatto imparare qualcosa. Raccontami tutto quello che pensi possa rappresentarti."
- Triennale avanzata: "Ora vorrei capire meglio cosa hai fatto fuori dal percorso accademico. Puoi raccontarmi esperienze lavorative, stage, associazioni, progetti universitari, progetti personali, volontariato, sport, competizioni, attività imprenditoriali o qualsiasi esperienza in cui hai avuto responsabilità concrete. Non serve che sia tutto 'da CV': mi interessa capire cosa hai fatto davvero e cosa hai imparato."
- Magistrale: "Ora vorrei ricostruire le tue esperienze extra-accademiche e professionali. Raccontami stage, lavori, associazioni, progetti universitari, tesi/progetti di ricerca, esperienze imprenditoriali, volontariato, competizioni o altre attività rilevanti. Per ogni esperienza, se riesci, indicami cosa facevi concretamente, quanto è durata e cosa hai imparato."

STEP 3 — INTERESSI
"Ora vorrei capire meglio cosa ti interessa. Da un lato, dimmi quali settori, ruoli o tipi di lavoro ti incuriosiscono, anche se non sei ancora sicuro: finanza, consulenza, marketing, startup, tech, sostenibilità, diritto, ricerca, prodotto, vendite, comunicazione o qualsiasi altra area. Dall'altro, raccontami anche interessi personali, hobby o attività che senti ti rappresentino. Spesso aiutano a capire molto meglio il tipo di ambiente e di lavoro in cui potresti trovarti bene."

STEP 4 — PIANI FUTURI
Adatta al livello:
- Primo anno: "Guardando ai prossimi anni, hai già qualche idea su cosa vorresti esplorare? Può essere una magistrale, un exchange, un settore professionale, uno stage, un'esperienza all'estero, un'associazione o anche solo un tipo di percorso che ti incuriosisce. Se non lo sai ancora, va benissimo."
- Secondo anno: "Nei prossimi mesi potresti iniziare a fare alcune scelte importanti: exchange, stage, associazioni, magistrale o prime idee di carriera. Hai già qualche direzione in mente?"
- Terzo anno: "Come immagini il tuo percorso dopo la triennale? Magistrale, lavoro, stage, estero? Raccontami sia ciò che hai già fatto o stai facendo, sia le opzioni che stai valutando."
- Magistrale: "Guardando ai prossimi 6-24 mesi, che direzione vorresti prendere? Mi interessa capire se hai già target di carriera, settori, aziende, ruoli, paesi o percorsi specifici in mente."

STEP 5 — ATTITUDINI
"Ultima parte: vorrei capire meglio come sei come persona e come lavori con gli altri. Puoi descriverti liberamente, oppure pensare a queste domande: ti senti più intraprendente o preferisci avere una direzione chiara? Ti piace parlare e presentare idee, oppure preferisci analizzare e costruire in profondità? Ti trovi meglio in gruppo o da solo? Sei più metodico o creativo? Cosa ti viene naturale fare meglio degli altri? E cosa vorresti migliorare?"

STEP 6 — CHIUSURA
"Perfetto, ho abbastanza informazioni per creare il tuo profilo iniziale. Da qui puoi candidarti alle associazioni disponibili su MIRA e, man mano che aggiungerai nuove esperienze o parlerai con me, il tuo profilo diventerà più preciso. Questo sarà utile anche per le opportunità aziendali: le aziende potranno cercare profili coerenti con ciò che stanno cercando e contattarti quando ci sarà un buon match."
Poi concludi con ESATTAMENTE: "Il tuo profilo MIRA è pronto."

REGOLE:
- UNA domanda alla volta. Mai elenchi di domande.
- Reagisci a quello che dice prima di passare allo step successivo.
- Come un amico intelligente che conosce Bocconi. Diretto, genuino.
- Lo studente È GIÀ A BOCCONI. Non chiedergli se vuole entrarci.
- NON ripresentarti. NON dire "Grazie per aver condiviso!" NON elencare i corsi del libretto.
- Se menziona associazioni, collegale a quelle su MIRA.
- Adatta il tono e le domande al livello dello studente.`;
}

const MAX_EXCHANGES = 16;

export async function saveConversation(messages: ChatMessage[]) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();
  await supabase
    .from("student_profiles")
    .update({
      onboarding_answers: {
        conversation: messages,
        last_updated: new Date().toISOString(),
      },
    })
    .eq("user_id", ctx.profile.id);
}

export async function sendTranscriptMessage(
  conversationHistory: ChatMessage[],
  transcriptSummary: string
) {
  const { supabase, profileId, student, associations, openCycles } = await getStudentContext();
  const systemPrompt = buildSystemPrompt(student, associations, openCycles);

  const updatedHistory = [
    ...conversationHistory,
    { role: "user" as const, content: "[Ho caricato il mio libretto]" },
  ];

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...updatedHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    {
      role: "system" as const,
      content: `DATI APPENA ESTRATTI DAL LIBRETTO:\n${transcriptSummary}\n\nCommenta in modo naturale — cosa noti, cosa ti colpisce. Poi fai una domanda per approfondire i suoi interessi.`,
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
    .eq("user_id", profileId);

  return { message: assistantMessage };
}

export async function sendOnboardingMessage(
  conversationHistory: ChatMessage[],
  userMessage: string
) {
  const { supabase, profileId, student, associations, openCycles } = await getStudentContext();
  const systemPrompt = buildSystemPrompt(student, associations, openCycles);

  const updatedHistory = [
    ...conversationHistory,
    { role: "user" as const, content: userMessage },
  ];

  const userMessageCount = updatedHistory.filter(m => m.role === "user").length;
  const shouldWrapUp = userMessageCount >= MAX_EXCHANGES / 2;

  const messages = [
    { role: "system" as const, content: systemPrompt },
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

  await supabase
    .from("student_profiles")
    .update({
      onboarding_answers: {
        conversation: fullHistory,
        last_updated: new Date().toISOString(),
      },
    })
    .eq("user_id", profileId);

  const isComplete = assistantMessage.includes("Il tuo profilo MIRA è pronto");

  if (isComplete) {
    await extractAndSaveProfile(profileId, fullHistory);
  }

  return { message: assistantMessage, isComplete };
}

export async function loadConversation(): Promise<ChatMessage[]> {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  const { data } = await supabase
    .from("student_profiles")
    .select("onboarding_answers")
    .eq("user_id", (ctx.profile as any).id)
    .single();

  const answers = data?.onboarding_answers as Record<string, unknown> | null;
  return (answers?.conversation as ChatMessage[]) ?? [];
}

export async function forceCompleteOnboarding() {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();
  const profileId = (ctx.profile as any).id as string;

  const { data } = await supabase
    .from("student_profiles")
    .select("onboarding_answers")
    .eq("user_id", profileId)
    .single();

  const answers = data?.onboarding_answers as Record<string, unknown> | null;
  const conversation = (answers?.conversation as ChatMessage[]) ?? [];

  if (conversation.length >= 4) {
    await extractAndSaveProfile(profileId, conversation);
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
        content: `Estrai TUTTE le informazioni dalla conversazione di onboarding. Rispondi SOLO in JSON:
{
  "degree_program": "nome corso di laurea",
  "degree_level": "triennale|magistrale|ciclo_unico",
  "current_year": 0,
  "previous_degree": {
    "university": "università triennale (solo se magistrale)",
    "program": "corso triennale",
    "grade": "voto laurea",
    "thesis_topic": "tema tesi"
  },
  "interests": ["settori/ruoli che interessano lo studente"],
  "personal_interests": ["hobby, passioni, attività personali"],
  "goals": ["obiettivi professionali e accademici"],
  "experiences": ["esperienze: stage, lavori, associazioni, progetti, volontariato, sport"],
  "career_targets": {
    "roles": ["ruoli target"],
    "sectors": ["settori target"],
    "companies": ["aziende menzionate"],
    "geography": ["città/paesi di interesse"]
  },
  "career_plan": {
    "short_term": "prossimi 6-12 mesi",
    "medium_term": "1-3 anni",
    "exchange_interest": "interessato|fatto|programmato|no",
    "masters_interest": "sì|no|incerto",
    "clarity_level": "molto_chiaro|abbastanza_chiaro|esplorativo|incerto"
  },
  "work_style": {
    "leadership": "alta|media|bassa",
    "teamwork_preference": "gruppo|solo|entrambi",
    "style": "analitico|creativo|metodico|flessibile",
    "communication": "estroverso|introverso|equilibrato",
    "strengths": ["punti di forza dichiarati"],
    "improvements": ["aree di miglioramento"]
  },
  "profile_summary": "Scrivi 3-4 frasi in terza persona che descrivono lo studente in modo curato. Esempio di tono: 'Mario è uno studente di triennale con un profilo orientato a finanza, startup e venture capital. Dal suo percorso emergono buone basi economico-finanziarie e una forte propensione all'iniziativa. Le esperienze imprenditoriali raccontate indicano interesse per costruzione di progetti, fintech e contesti competitivi.' NON elencare tag o liste — scrivi un paragrafo discorsivo che dia un'immagine chiara della persona."
}
Se un campo non è emerso dalla conversazione, lascia stringa vuota, null o array vuoto. NON inventare.`,
      },
      { role: "user", content: conversationText },
    ],
    { temperature: 0.1, maxTokens: 2048, jsonMode: true }
  );

  const data = JSON.parse(extracted);

  console.log("[MIRA] Extracted onboarding data keys:", Object.keys(data));
  console.log("[MIRA] Extracted data:", JSON.stringify(data).slice(0, 2000));

  // Save all structured data
  const profileUpdate: Record<string, unknown> = {
    degree_program: data.degree_program || null,
    degree_level: data.degree_level || null,
    current_year: data.current_year || null,
    interests: data.interests?.filter(Boolean) ?? [],
    goals: data.goals?.filter(Boolean) ?? [],
    experiences: data.experiences?.filter(Boolean) ?? [],
    profile_summary: data.profile_summary || null,
    onboarding_completed: true,
    onboarding_completed_at: new Date().toISOString(),
    // Always save ALL structured data in availability (JSON)
    availability: {
      career_targets: data.career_targets ?? {},
      career_plan: data.career_plan ?? {},
      work_style: data.work_style ?? {},
      previous_degree: data.previous_degree ?? {},
      personal_interests: data.personal_interests ?? [],
      raw_extraction: data,
    },
  };

  // Legacy compatibility block removed — always save above
  if (false) {
  }

  await supabase
    .from("student_profiles")
    .update(profileUpdate)
    .eq("user_id", profileId);

  await (supabase.from("ai_logs") as any).insert({
    module: "student_onboarding",
    provider: "openai",
    model: "gpt-4o-mini",
    entity_type: "student_profile",
    user_id: profileId,
    input_metadata: { message_count: conversation.length },
    status: "success",
  });

  // Generate pathway analysis in background
  generatePathwayAnalysis(profileId).catch((err) =>
    console.error("Background pathway analysis failed:", err)
  );

  revalidatePath("/student");
}
