"use server";

import { chatCompletion } from "@mira/ai";
import { createServiceClient } from "@mira/supabase/server";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function generatePathwayAnalysis(userId: string) {
  const supabase = await createServiceClient();

  const { data: student } = await (supabase.from("student_profiles") as any)
    .select("id, profile_summary, degree_program, degree_level, current_year, interests, goals, experiences, transcript_summary, availability")
    .eq("user_id", userId)
    .single();

  if (!student) return { error: "Profilo studente non trovato" };

  const ts = student.transcript_summary as Record<string, any> | null;
  const avail = (student.availability as Record<string, any>) ?? {};
  const ct = avail.career_targets ?? {};
  const cp = avail.career_plan ?? {};
  const ws = avail.work_style ?? {};
  const pd = avail.previous_degree ?? {};
  const pi = avail.personal_interests ?? [];

  // Build student context
  let studentContext = `PROFILO STUDENTE:
Riassunto: ${student.profile_summary || "Non disponibile"}
Corso: ${student.degree_program || "?"} (${student.degree_level || "?"})
Anno: ${student.current_year || "?"}
${ts?.weighted_average ? `Media ponderata: ${ts.weighted_average}/30` : ""}
${ts?.total_credits ? `Crediti: ${ts.total_credits} CFU` : ""}

INTERESSI: ${(student.interests ?? []).join(", ") || "non specificati"}
OBIETTIVI: ${(student.goals ?? []).join(", ") || "non specificati"}
ESPERIENZE: ${(student.experiences ?? []).join("; ") || "nessuna"}
INTERESSI PERSONALI: ${pi.join(", ") || "non specificati"}

TARGET CARRIERA: ruoli=${(ct.roles ?? []).join(", ")}, settori=${(ct.sectors ?? []).join(", ")}, aziende=${(ct.companies ?? []).join(", ")}, geografie=${(ct.geography ?? []).join(", ")}
PIANO CARRIERA: breve termine=${cp.short_term || "?"}, medio termine=${cp.medium_term || "?"}, exchange=${cp.exchange_interest || "?"}, magistrale=${cp.masters_interest || "?"}, chiarezza=${cp.clarity_level || "?"}
STILE LAVORO: leadership=${ws.leadership || "?"}, teamwork=${ws.teamwork_preference || "?"}, stile=${ws.style || "?"}, comunicazione=${ws.communication || "?"}, punti forza=${(ws.strengths ?? []).join(", ")}, da migliorare=${(ws.improvements ?? []).join(", ")}`;

  if (pd.university) {
    studentContext += `\nPERCORSO PRECEDENTE: ${pd.university}, ${pd.program || "?"}, voto ${pd.grade || "?"}, tesi: ${pd.thesis_topic || "?"}`;
  }

  if (ts?.courses?.length) {
    const courseList = ts.courses.map((c: any) =>
      `${c.course_name} (${c.grade || "idoneo"}, ${c.credits} CFU)`
    ).join(", ");
    studentContext += `\nESAMI: ${courseList}`;
  }

  // Fetch active associations for suggestions
  const { data: associations } = await (supabase.from("association_profiles") as any)
    .select("name, category, short_description")
    .eq("public_page_status", "published");

  const assocList = (associations ?? [])
    .map((a: any) => `${a.name} (${a.category}): ${a.short_description || ""}`)
    .join("\n");

  const prompt = `Analizza il percorso di questo studente universitario e genera un'analisi narrativa completa.

${studentContext}

ASSOCIAZIONI ATTIVE SULLA PIATTAFORMA:
${assocList || "Nessuna associazione attiva al momento"}

Rispondi in JSON con questa struttura:
{
  "profile_overview": "Paragrafo di 3-4 frasi che descrive cosa emerge dal percorso dello studente. Non dire solo 'finanza' o 'startup' — spiega PERCHÉ MIRA vede quelle aree. Collega esami, esperienze e interessi.",

  "competencies": [
    {
      "area": "nome competenza",
      "source": "academic" o "practical",
      "description": "2-3 frasi: da dove emerge questa competenza, cosa significa concretamente, per quali ruoli o direzioni è utile. NON esagerare: un esame non equivale a una competenza pratica."
    }
  ],

  "coherent_directions": [
    {
      "direction": "nome direzione (es. Venture Capital, Consulenza, Data Analysis)",
      "description": "2-3 frasi: perché questa direzione è coerente con il profilo. Collega esami, esperienze e interessi.",
      "gaps": "1-2 frasi: cosa servirebbe per rendere questa direzione più solida."
    }
  ],

  "association_suggestions": [
    {
      "name": "nome associazione dalla lista sopra",
      "reason": "1-2 frasi: perché potrebbe essere coerente con il profilo dello studente."
    }
  ],

  "areas_to_strengthen": [
    {
      "area": "nome area",
      "description": "1-2 frasi: perché è utile rafforzare quest'area e come potrebbe farlo."
    }
  ],

  "next_steps": "Paragrafo di 3-4 frasi con consigli concreti: cosa fare per rendere il profilo più forte. Non consigli generici — basati su ciò che manca rispetto alle ambizioni dichiarate."
}

REGOLE:
- Scrivi in italiano, tono positivo ma onesto
- NON trasformare ogni esame in una competenza enorme — un esame dà una BASE, non una competenza pratica
- Distingui tra competenze ACCADEMICHE (da transcript) e PRATICHE (da esperienze)
- Le esperienze dichiarate vanno presentate come "dallo studente emerge...", non come fatti certi
- Se mancano dati, non inventare — scrivi "da esplorare" o "non ancora emerso"
- Le direzioni devono essere realistiche per uno studente universitario
- I suggerimenti associazioni devono basarsi solo sulle associazioni nella lista fornita
- I prossimi passi devono essere actionable, non generici`;

  const systemMsg = `Sei MIRA, una piattaforma AI per studenti universitari. Analizzi il percorso dello studente per aiutarlo a capire chi è, dove può andare e cosa può rafforzare. Scrivi in modo narrativo, mai con tag o punteggi. Non inventare informazioni. Rispondi SOLO in JSON valido.`;

  try {
    const result = await chatCompletion(
      [
        { role: "system", content: systemMsg },
        { role: "user", content: prompt },
      ],
      { temperature: 0.4, maxTokens: 3000, jsonMode: true }
    );

    const analysis = JSON.parse(result);
    const pathwayData = {
      ...analysis,
      generated_at: new Date().toISOString(),
    };

    await (supabase.from("student_profiles") as any)
      .update({ pathway_analysis: pathwayData })
      .eq("user_id", userId);

    return { success: true };
  } catch (err) {
    console.error("Pathway analysis generation error:", err);
    return { error: "Errore nella generazione dell'analisi" };
  }
}
