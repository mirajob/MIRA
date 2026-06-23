import { chatCompletion, AI_CONFIG } from "../provider";

export interface ParsedCourse {
  course_name: string;
  course_code: string;
  credits: number;
  grade: string;
  grade_numeric: number | null;
  is_pass_fail: boolean;
  academic_year: string;
  semester: string;
}

export interface ParsedTranscript {
  degree_program: string;
  degree_level: "triennale" | "magistrale" | "ciclo_unico" | "phd";
  courses: ParsedCourse[];
  weighted_average: number | null;
  total_credits: number;
  graded_credits: number;
  pass_fail_credits: number;
}

const EXTRACTION_PROMPT = `Sei un parser di libretti universitari italiani, specializzato in Bocconi.

REGOLA FONDAMENTALE: estrai TUTTI gli esami GIÀ COMPLETATI — quelli che hanno SIA una data di superamento SIA un voto o esito (es. "TWENTY-SEVEN", "PASS", "THIRTY.="). Ignora completamente le righe senza data e senza voto: sono esami futuri pianificati, NON ancora sostenuti.

ATTENZIONE: Non saltare nessun esame completato. Controlla OGNI riga del documento. Se un esame ha una data e un voto/esito, DEVE essere incluso. Tipicamente un libretto Bocconi di secondo anno ha 10-15 esami completati — se ne trovi meno di 8, probabilmente ne stai saltando alcuni. Ricontrolla.

Per ogni esame COMPLETATO determina:
- course_name: nome esatto del corso
- course_code: codice del corso (se visibile)
- credits: numero di crediti (CFU/ECTS)
- grade: voto come stringa ("27", "30", "30L", "pass", "idoneo"). Converti da inglese: TWENTY-SEVEN→"27", THIRTY→"30", THIRTY.=→"30", PASS→"pass". ATTENZIONE: THIRTY.= significa 30, NON 30 e lode. Il 30 e lode (30L) ha una notazione diversa (es. "THIRTY CUM LAUDE" o simile). Se non sei sicuro, metti 30.
- grade_numeric: voto numerico (27, 30, 31 SOLO per 30L esplicito) oppure null se pass/fail. THIRTY.= = 30, non 31.
- is_pass_fail: true se il voto è "PASS"/"idoneo"/"approvato" oppure se è un seminario/laboratorio da 1 CFU. Esami con 1 CFU sono quasi sempre seminari pass/fail — NON assegnare voto numerico 30
- academic_year: anno accademico
- semester: semestre se visibile

Calcola (SOLO sugli esami completati):
- weighted_average: media ponderata = somma(voto_numerico × crediti) / somma(crediti) SOLO per esami con grade_numeric (non null). 30L conta come 31, ma THIRTY.= conta come 30
- total_credits: totale crediti degli esami completati
- graded_credits: crediti degli esami con voto numerico
- pass_fail_credits: crediti degli esami pass/fail

Estrai anche dal documento:
- degree_program: nome del corso di laurea (es. "International Economics and Management (BIEM)")
- degree_level: triennale se "Bachelor", magistrale se "Master", ciclo_unico, phd

Rispondi SOLO in JSON valido con questa struttura:
{"degree_program":"","degree_level":"triennale|magistrale|ciclo_unico|phd","courses":[...],"weighted_average":null,"total_credits":0,"graded_credits":0,"pass_fail_credits":0}`;

export async function parseTranscriptFile(base64Data: string, mimeType: string): Promise<ParsedTranscript> {
  const isPdf = mimeType === "application/pdf";

  if (isPdf) {
    return parseTranscriptPdf(base64Data);
  }

  return parseTranscriptImage(base64Data, mimeType);
}

async function parseTranscriptImage(base64Data: string, mimeType: string): Promise<ParsedTranscript> {
  const dataUrl = `data:${mimeType};base64,${base64Data}`;

  const result = await chatCompletion(
    [
      { role: "system", content: EXTRACTION_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: "Estrai tutti i dati da questo libretto. SOLO esami completati con data e voto." },
          { type: "image_url", image_url: { url: dataUrl, detail: "high" as const } },
        ],
      },
    ],
    { temperature: 0.1, maxTokens: 4096, jsonMode: true }
  );

  return JSON.parse(result) as ParsedTranscript;
}

async function parseTranscriptPdf(base64Data: string): Promise<ParsedTranscript> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const dataUrl = `data:application/pdf;base64,${base64Data}`;

  const body = {
    model: "gpt-4o",
    input: [
      { role: "system", content: EXTRACTION_PROMPT },
      {
        role: "user",
        content: [
          { type: "input_text", text: "Estrai tutti i dati da questo libretto universitario. SOLO esami completati con data e voto." },
          { type: "input_file", filename: "libretto.pdf", file_data: dataUrl },
        ],
      },
    ],
    text: { format: { type: "json_object" } },
    temperature: 0.1,
    max_output_tokens: 4096,
  };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`[MIRA AI] OpenAI Responses API error ${response.status}:`, error);
    throw new Error(`OpenAI Responses API error ${response.status}: ${error}`);
  }

  const data = await response.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const textOutput = data.output?.find((o: any) => o.type === "message")
    ?.content?.find((c: any) => c.type === "output_text")?.text;

  if (!textOutput) {
    throw new Error("Nessuna risposta dall'AI per il parsing del transcript.");
  }

  return JSON.parse(textOutput) as ParsedTranscript;
}

export function formatTranscriptForChat(transcript: ParsedTranscript): string {
  const lines: string[] = [];

  lines.push(`Corso: ${transcript.degree_program} (${transcript.degree_level})`);
  lines.push(`Esami sostenuti: ${transcript.courses.length}`);
  lines.push(`Crediti totali: ${transcript.total_credits} CFU`);

  if (transcript.weighted_average) {
    lines.push(`Media ponderata: ${transcript.weighted_average.toFixed(1)}/30`);
  }

  if (transcript.graded_credits > 0) {
    lines.push(`Crediti con voto: ${transcript.graded_credits}`);
  }
  if (transcript.pass_fail_credits > 0) {
    lines.push(`Crediti idoneità: ${transcript.pass_fail_credits}`);
  }

  const topGrades = transcript.courses
    .filter((c) => c.grade_numeric && c.grade_numeric >= 28)
    .map((c) => c.course_name);

  if (topGrades.length > 0) {
    lines.push(`Voti più alti in: ${topGrades.slice(0, 5).join(", ")}`);
  }

  return lines.join("\n");
}
