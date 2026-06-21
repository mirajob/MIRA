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

Analizza il documento del libretto e estrai TUTTI i corsi.

Per ogni corso determina:
- course_name: nome esatto del corso
- course_code: codice del corso (se visibile)
- credits: numero di crediti (CFU/ECTS)
- grade: voto come stringa ("28", "30L", "idoneo", "approvato")
- grade_numeric: voto numerico (28, 30, 31 per 30L) oppure null se pass/fail
- is_pass_fail: true se è un'idoneità/pass-fail (tipicamente: lingua, stage, laboratori, seminari — riconoscibili perché il voto è "idoneo"/"approvato"/"pass" oppure non c'è voto numerico)
- academic_year: anno accademico (es. "2024/2025")
- semester: semestre se visibile

Calcola:
- weighted_average: media ponderata = somma(voto_numerico × crediti) / somma(crediti) SOLO per esami con voto numerico (30L conta come 31)
- total_credits: totale crediti di tutti gli esami
- graded_credits: crediti degli esami con voto numerico
- pass_fail_credits: crediti degli esami pass/fail

Rispondi SOLO in JSON valido con questa struttura:
{"degree_program":"","degree_level":"triennale|magistrale|ciclo_unico|phd","courses":[...],"weighted_average":null,"total_credits":0,"graded_credits":0,"pass_fail_credits":0}`;

export async function parseTranscriptFile(base64Data: string, mimeType: string): Promise<ParsedTranscript> {
  const dataUrl = `data:${mimeType};base64,${base64Data}`;

  const isImage = mimeType.startsWith("image/");

  const content = isImage
    ? [
        { type: "text" as const, text: "Estrai tutti i dati da questo libretto universitario." },
        { type: "image_url" as const, image_url: { url: dataUrl, detail: "high" as const } },
      ]
    : [
        { type: "text" as const, text: "Estrai tutti i dati da questo libretto universitario." },
        { type: "file" as const, file: { filename: "libretto.pdf", file_data: dataUrl } },
      ];

  const result = await chatCompletion(
    [
      { role: "system", content: EXTRACTION_PROMPT },
      { role: "user", content },
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
