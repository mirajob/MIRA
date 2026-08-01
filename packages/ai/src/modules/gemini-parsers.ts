// Gemini variants of the transcript and CV parsers, used by the /admin/ai-test
// playground. They reuse the EXACT same prompts as the production OpenAI
// parsers so the only variable being benchmarked is the model itself, and they
// return the same ParsedTranscript / ParsedCV shapes so the dev page can render
// them identically to the MiraCard.

import { geminiGenerateJson, geminiGenerateJsonFromText, type GeminiModel } from "./gemini-client";
import { EXTRACTION_PROMPT, type ParsedTranscript } from "./transcript-parser";
import { CV_EXTRACTION_PROMPT, type ParsedCV } from "./cv-parser";

const GEMINI_TIMEOUT_MS = 90_000;

// Ragionamento basso su entrambi (2026-08-01). Sul transcript era "high" da quando il
// modello sbagliava a leggere le tabelle, ma quel costo si pagava su OGNI caricamento: un
// minuto di attesa e un conto molto più salato, mentre il CV con "low" viene letto bene.
// La media, che è il numero più delicato, la ricalcoliamo comunque noi in codice.
const TRANSCRIPT_THINKING: "low" = "low";
const CV_THINKING: "low" = "low";

/** Sotto questa soglia il PDF è di sole immagini (una scansione): serve la lettura visiva. */
const MIN_TEXT_CHARS = 400;

/**
 * Il testo di un PDF, estratto in locale. Le autocertificazioni universitarie sono quasi
 * sempre PDF di testo: leggerlo qui costa millisecondi ed evita di far "guardare" al
 * modello un'immagine, che è la parte lenta e cara. Torna null se il PDF non ha testo
 * (scansione o foto), e in quel caso si passa dalla lettura visiva come prima.
 */
async function extractPdfText(base64Data: string): Promise<string | null> {
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const bytes = Uint8Array.from(Buffer.from(base64Data, "base64"));
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });
    const cleaned = (text ?? "").replace(/[ \t]+\n/g, "\n").trim();
    return cleaned.length >= MIN_TEXT_CHARS ? cleaned : null;
  } catch (err) {
    console.error("[MIRA AI] estrazione testo PDF fallita, si passa alla lettura visiva:", err);
    return null;
  }
}

export interface GeminiParseResult<T> {
  parsed: T;
  elapsedMs: number;
  model: GeminiModel;
  /** true = letto dal testo estratto in locale, false = lettura visiva del file. */
  viaText?: boolean;
}

export async function parseTranscriptWithGemini(
  base64Data: string,
  mimeType: string,
  model: GeminiModel
): Promise<GeminiParseResult<ParsedTranscript>> {
  const start = Date.now();
  const instruction = "Estrai tutti i dati da questo libretto universitario. SOLO esami completati con data e voto.";
  const options = { timeoutMs: GEMINI_TIMEOUT_MS, thinkingLevel: TRANSCRIPT_THINKING };

  const pdfText = mimeType === "application/pdf" ? await extractPdfText(base64Data) : null;

  const readFile = () =>
    geminiGenerateJson(model, EXTRACTION_PROMPT, instruction, base64Data, mimeType, options);

  if (!pdfText) {
    const parsed = JSON.parse(await readFile()) as ParsedTranscript;
    return { parsed, elapsedMs: Date.now() - start, model, viaText: false };
  }

  const parsed = JSON.parse(
    await geminiGenerateJsonFromText(
      model,
      EXTRACTION_PROMPT,
      `${instruction}\n\nTESTO DEL LIBRETTO:\n${pdfText}`,
      options
    )
  ) as ParsedTranscript;

  // Se dal testo non esce nemmeno un esame, il PDF aveva sì del testo ma non quello che
  // serve (intestazioni in immagine, tabella disegnata): si rilegge il file come prima.
  if (!parsed.courses?.length) {
    const fromFile = JSON.parse(await readFile()) as ParsedTranscript;
    return { parsed: fromFile, elapsedMs: Date.now() - start, model, viaText: false };
  }

  return { parsed, elapsedMs: Date.now() - start, model, viaText: true };
}

export async function parseCVWithGemini(
  base64Data: string,
  mimeType: string,
  model: GeminiModel
): Promise<GeminiParseResult<ParsedCV>> {
  const start = Date.now();
  const raw = await geminiGenerateJson(
    model,
    CV_EXTRACTION_PROMPT,
    "Estrai le informazioni da questo CV. Ignora la sezione Education.",
    base64Data,
    mimeType,
    { timeoutMs: GEMINI_TIMEOUT_MS, thinkingLevel: CV_THINKING }
  );
  const parsed = JSON.parse(raw) as ParsedCV;
  return { parsed, elapsedMs: Date.now() - start, model };
}

// Recompute the weighted average in code — the same correction the production
// upload path applies, since model arithmetic on grades is unreliable.
export function recomputeTranscriptAverages(parsed: ParsedTranscript): ParsedTranscript {
  let weightedSum = 0;
  let gradedCredits = 0;
  let passfailCredits = 0;
  for (const c of parsed.courses) {
    if (c.grade_numeric != null && !c.is_pass_fail) {
      weightedSum += c.grade_numeric * c.credits;
      gradedCredits += c.credits;
    } else {
      passfailCredits += c.credits;
    }
  }
  const correctAverage = gradedCredits > 0 ? Math.round((weightedSum / gradedCredits) * 100) / 100 : null;
  return {
    ...parsed,
    weighted_average: correctAverage,
    graded_credits: gradedCredits,
    pass_fail_credits: passfailCredits,
    total_credits: gradedCredits + passfailCredits,
  };
}
