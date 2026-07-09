import { chatCompletion } from "../provider";

export interface ParsedCVExperience {
  title: string;
  organization: string;
  start_date: string;
  end_date: string;
  description: string;
  type: "work" | "internship" | "association" | "project" | "volunteering" | "other";
}

export interface ParsedCV {
  experiences: ParsedCVExperience[];
  skills: string[];
  languages: Array<{ language: string; level: string }>;
  raw_text_summary: string;
}

const CV_EXTRACTION_PROMPT = `Sei un parser di CV universitari italiani.

Estrai dal CV le seguenti informazioni — ignora completamente la sezione Education (quella viene dal libretto universitario):

- experiences: array di esperienze extracademiche. Per ognuna:
  - title: ruolo o titolo (es. "Stage Analista", "Membro del direttivo", "Co-fondatore")
  - organization: nome dell'azienda, associazione o progetto
  - start_date: data inizio (es. "settembre 2023", "2023" o stringa vuota se non visibile)
  - end_date: data fine (es. "luglio 2024", "presente" o stringa vuota se non visibile)
  - description: descrizione sintetica di cosa ha fatto concretamente (max 2 righe, usa le informazioni del CV)
  - type: "work" | "internship" | "association" | "project" | "volunteering" | "other"

- skills: lista di competenze tecniche o pratiche menzionate (es. "Python", "Excel", "Bloomberg", "Photoshop")
- languages: lingue conosciute con livello (es. [{"language": "Inglese", "level": "C1"}, {"language": "Spagnolo", "level": "B2"}])
- raw_text_summary: un paragrafo sintetico (3-4 righe) che riassume le esperienze principali dello studente in modo narrativo, utile come contesto per una conversazione

Rispondi SOLO in JSON valido:
{"experiences":[],"skills":[],"languages":[],"raw_text_summary":""}

Se un campo non è visibile nel CV, lascia array vuoto o stringa vuota. NON inventare.

La MIRA card è sempre in inglese: scrivi title, description e raw_text_summary in inglese anche se il CV è in italiano (non tradurre "organization" se è un nome proprio, es. il nome di un'azienda).`;

export async function parseCVFile(base64Data: string, mimeType: string): Promise<ParsedCV> {
  if (mimeType === "application/pdf") {
    return parseCVPdf(base64Data);
  }
  return parseCVImage(base64Data, mimeType);
}

async function parseCVImage(base64Data: string, mimeType: string): Promise<ParsedCV> {
  const dataUrl = `data:${mimeType};base64,${base64Data}`;

  const result = await chatCompletion(
    [
      { role: "system", content: CV_EXTRACTION_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: "Estrai le informazioni da questo CV. Ignora la sezione Education." },
          { type: "image_url", image_url: { url: dataUrl, detail: "high" as const } },
        ],
      },
    ],
    { temperature: 0.1, maxTokens: 2048, jsonMode: true }
  );

  return JSON.parse(result) as ParsedCV;
}

async function parseCVPdf(base64Data: string): Promise<ParsedCV> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const dataUrl = `data:application/pdf;base64,${base64Data}`;

  const body = {
    model: "gpt-4o",
    input: [
      { role: "system", content: CV_EXTRACTION_PROMPT },
      {
        role: "user",
        content: [
          { type: "input_text", text: "Estrai le informazioni da questo CV. Ignora la sezione Education." },
          { type: "input_file", filename: "cv.pdf", file_data: dataUrl },
        ],
      },
    ],
    text: { format: { type: "json_object" } },
    temperature: 0.1,
    max_output_tokens: 2048,
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
    throw new Error(`OpenAI Responses API error ${response.status}: ${error}`);
  }

  const data = await response.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const textOutput = data.output?.find((o: any) => o.type === "message")
    ?.content?.find((c: any) => c.type === "output_text")?.text;

  if (!textOutput) throw new Error("Nessuna risposta dall'AI per il parsing del CV.");

  return JSON.parse(textOutput) as ParsedCV;
}

export function formatCVForChat(cv: ParsedCV): string {
  const lines: string[] = ["CV dello studente:"];

  if (cv.raw_text_summary) {
    lines.push(cv.raw_text_summary);
  }

  if (cv.experiences.length > 0) {
    lines.push(`\nEsperienze (${cv.experiences.length}):`);
    for (const exp of cv.experiences) {
      const period = [exp.start_date, exp.end_date].filter(Boolean).join(" – ");
      lines.push(`- ${exp.title} @ ${exp.organization}${period ? ` (${period})` : ""}: ${exp.description}`);
    }
  }

  if (cv.skills.length > 0) {
    lines.push(`\nCompetenze: ${cv.skills.join(", ")}`);
  }

  if (cv.languages.length > 0) {
    lines.push(`Lingue: ${cv.languages.map((l) => `${l.language} ${l.level}`).join(", ")}`);
  }

  return lines.join("\n");
}
