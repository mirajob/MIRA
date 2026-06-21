import { chatCompletion } from "../provider";

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

REGOLA FONDAMENTALE: estrai SOLO gli esami GIÀ COMPLETATI — quelli che hanno SIA una data di superamento SIA un voto o esito (es. "TWENTY-SEVEN", "PASS", "THIRTY.="). Ignora completamente le righe senza data e senza voto: sono esami futuri pianificati, NON ancora sostenuti.

Per ogni esame COMPLETATO determina:
- course_name: nome esatto del corso
- course_code: codice del corso (se visibile)
- credits: numero di crediti (CFU/ECTS)
- grade: voto come stringa ("27", "30L", "pass", "idoneo"). Converti da inglese: TWENTY-SEVEN→"27", THIRTY.=→"30L", PASS→"pass"
- grade_numeric: voto numerico (27, 30, 31 per 30L/THIRTY.=) oppure null se pass/fail
- is_pass_fail: true se il voto è "PASS"/"idoneo"/"approvato" oppure se è un seminario/laboratorio da 1 CFU. Esami con 1 CFU sono quasi sempre seminari pass/fail — NON assegnare voto numerico 30
- academic_year: anno accademico
- semester: semestre se visibile

Calcola (SOLO sugli esami completati):
- weighted_average: media ponderata = somma(voto_numerico × crediti) / somma(crediti) SOLO per esami con grade_numeric (non null). 30L/THIRTY.= conta come 31
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
    return parseTranscriptPdfText(base64Data);
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
    { temperature: 0.1, maxTokens: 4096, jsonMode: true, model: "gpt-4o" }
  );

  return JSON.parse(result) as ParsedTranscript;
}

async function parseTranscriptPdfText(base64Data: string): Promise<ParsedTranscript> {
  const { extractText } = await import("unpdf");
  const buffer = Buffer.from(base64Data, "base64");
  const uint8 = new Uint8Array(buffer);
  const { text } = await extractText(uint8);

  if (!text || text.trim().length < 30) {
    throw new Error("Il PDF non contiene testo leggibile.");
  }

  const result = await chatCompletion(
    [
      { role: "system", content: EXTRACTION_PROMPT },
      { role: "user", content: `Ecco il testo estratto dal libretto universitario:\n\n${text.slice(0, 15000)}` },
    ],
    { temperature: 0.1, maxTokens: 4096, jsonMode: true, model: "gpt-4o" }
  );

  return JSON.parse(result) as ParsedTranscript;
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
