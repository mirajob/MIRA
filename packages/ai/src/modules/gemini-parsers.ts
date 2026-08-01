// Gemini variants of the transcript and CV parsers, used by the /admin/ai-test
// playground. They reuse the EXACT same prompts as the production OpenAI
// parsers so the only variable being benchmarked is the model itself, and they
// return the same ParsedTranscript / ParsedCV shapes so the dev page can render
// them identically to the MiraCard.

import {
  geminiGenerateJson,
  geminiGenerateJsonFromText,
  type GeminiModel,
  type GeminiUsage,
} from "./gemini-client";
import { EXTRACTION_PROMPT, type ParsedTranscript } from "./transcript-parser";
import { CV_EXTRACTION_PROMPT, type ParsedCV } from "./cv-parser";

const GEMINI_TIMEOUT_MS = 90_000;

// Il CV sta bene con "low". Il transcript no: provato con lo stesso libretto Bocconi, a
// ragionamento basso lo stesso esame è stato letto 25, 25, 25 e poi 27, mentre il voto vero
// è 26. Quella cifra nel PDF è ambigua e senza ragionamento il modello tira a indovinare,
// diversamente ogni volta. Un voto sbagliato sulla card di uno studente costa molto più dei
// secondi che si risparmiano, quindi il libretto resta su "high" finché non abbiamo di meglio.
// Dal playground /admin/ai-test si può confrontare l'uno contro l'altro sullo stesso file.
const TRANSCRIPT_THINKING: "high" | "low" = "high";
const CV_THINKING: "low" = "low";

/** Sotto questa soglia il PDF è di sole immagini (una scansione): serve la lettura visiva. */
const MIN_TEXT_CHARS = 400;

/** Quante parole vere servono perché il testo estratto sia considerato leggibile. */
const MIN_REAL_WORDS = 10;

/**
 * Il testo estratto è davvero leggibile?
 *
 * Alcuni PDF universitari (l'autocertificazione Bocconi è uno) usano font con una mappa
 * dei caratteri non standard: pdf.js restituisce sì del testo, ma è spazzatura del tipo
 * `!!"#! $$% "& '`. Mandarla al modello significa buttare una chiamata per poi rileggere
 * il file lo stesso. Le parole di almeno quattro lettere sono il segnale più semplice:
 * un libretto vero ne ha a decine (nomi degli esami), quella spazzatura quasi zero.
 */
function looksReadable(text: string): boolean {
  const words = text.match(/[A-Za-zÀ-ÿ]{4,}/g);
  return (words?.length ?? 0) >= MIN_REAL_WORDS;
}

/**
 * Il testo di un PDF, estratto in locale. Le autocertificazioni universitarie sono quasi
 * sempre PDF di testo: leggerlo qui costa millisecondi ed evita di far "guardare" al
 * modello un'immagine, che è la parte lenta e cara. Torna null se il PDF non ha testo
 * (scansione o foto), e in quel caso si passa dalla lettura visiva come prima.
 */
async function extractPdfText(base64Data: string): Promise<{ text: string | null; reason: string }> {
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const bytes = Uint8Array.from(Buffer.from(base64Data, "base64"));
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });
    const cleaned = (text ?? "").replace(/[ \t]+\n/g, "\n").trim();
    if (cleaned.length < MIN_TEXT_CHARS) return { text: null, reason: `poco_testo:${cleaned.length}` };
    if (!looksReadable(cleaned)) return { text: null, reason: `testo_illeggibile:${cleaned.length}` };
    return { text: cleaned, reason: `ok:${cleaned.length}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[MIRA AI] estrazione testo PDF fallita, si passa alla lettura visiva:", err);
    return { text: null, reason: `errore:${message.slice(0, 120)}` };
  }
}

export interface GeminiParseResult<T> {
  parsed: T;
  elapsedMs: number;
  model: GeminiModel;
  /** true = letto dal testo estratto in locale, false = lettura visiva del file. */
  viaText?: boolean;
  /** Perché è stata scelta quella strada: si ritrova in ai_logs, senza dover leggere i log Vercel. */
  textReason?: string;
  usage?: GeminiUsage;
}

export async function parseTranscriptWithGemini(
  base64Data: string,
  mimeType: string,
  model: GeminiModel,
  /** Solo per il playground: in produzione vale sempre TRANSCRIPT_THINKING. */
  thinkingOverride?: "low" | "high"
): Promise<GeminiParseResult<ParsedTranscript>> {
  const start = Date.now();
  const instruction = "Estrai tutti i dati da questo libretto universitario. SOLO esami completati con data e voto.";
  const options = { timeoutMs: GEMINI_TIMEOUT_MS, thinkingLevel: thinkingOverride ?? TRANSCRIPT_THINKING };

  const extraction =
    mimeType === "application/pdf" ? await extractPdfText(base64Data) : { text: null, reason: "non_pdf" };

  const readFile = () =>
    geminiGenerateJson(model, EXTRACTION_PROMPT, instruction, base64Data, mimeType, options);

  if (!extraction.text) {
    const result = await readFile();
    return {
      parsed: JSON.parse(result.text) as ParsedTranscript,
      elapsedMs: Date.now() - start,
      model,
      viaText: false,
      textReason: extraction.reason,
      usage: result.usage,
    };
  }

  const fromText = await geminiGenerateJsonFromText(
    model,
    EXTRACTION_PROMPT,
    `${instruction}\n\nTESTO DEL LIBRETTO:\n${extraction.text}`,
    options
  );
  const parsed = JSON.parse(fromText.text) as ParsedTranscript;

  // Se dal testo non esce nemmeno un esame, il PDF aveva sì del testo ma non quello che
  // serve (intestazioni in immagine, tabella disegnata): si rilegge il file come prima.
  if (!parsed.courses?.length) {
    const result = await readFile();
    return {
      parsed: JSON.parse(result.text) as ParsedTranscript,
      elapsedMs: Date.now() - start,
      model,
      viaText: false,
      textReason: "testo_senza_esami",
      usage: result.usage,
    };
  }

  return {
    parsed,
    elapsedMs: Date.now() - start,
    model,
    viaText: true,
    textReason: extraction.reason,
    usage: fromText.usage,
  };
}

export async function parseCVWithGemini(
  base64Data: string,
  mimeType: string,
  model: GeminiModel
): Promise<GeminiParseResult<ParsedCV>> {
  const start = Date.now();
  const result = await geminiGenerateJson(
    model,
    CV_EXTRACTION_PROMPT,
    "Estrai le informazioni da questo CV. Ignora la sezione Education.",
    base64Data,
    mimeType,
    { timeoutMs: GEMINI_TIMEOUT_MS, thinkingLevel: CV_THINKING }
  );
  const parsed = JSON.parse(result.text) as ParsedCV;
  return { parsed, elapsedMs: Date.now() - start, model, usage: result.usage };
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
