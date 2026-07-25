// Gemini variants of the transcript and CV parsers, used by the /admin/ai-test
// playground. They reuse the EXACT same prompts as the production OpenAI
// parsers so the only variable being benchmarked is the model itself, and they
// return the same ParsedTranscript / ParsedCV shapes so the dev page can render
// them identically to the MiraCard.

import { geminiGenerateJson, type GeminiModel } from "./gemini-client";
import { EXTRACTION_PROMPT, type ParsedTranscript } from "./transcript-parser";
import { CV_EXTRACTION_PROMPT, type ParsedCV } from "./cv-parser";

const GEMINI_TIMEOUT_MS = 90_000;

// Grades are the most delicate data on the card: parse the transcript with "high"
// thinking for accuracy. The CV is lower-stakes, so keep it "low" for speed.
const TRANSCRIPT_THINKING: "high" = "high";
const CV_THINKING: "low" = "low";

export interface GeminiParseResult<T> {
  parsed: T;
  elapsedMs: number;
  model: GeminiModel;
}

export async function parseTranscriptWithGemini(
  base64Data: string,
  mimeType: string,
  model: GeminiModel
): Promise<GeminiParseResult<ParsedTranscript>> {
  const start = Date.now();
  const raw = await geminiGenerateJson(
    model,
    EXTRACTION_PROMPT,
    "Estrai tutti i dati da questo libretto universitario. SOLO esami completati con data e voto.",
    base64Data,
    mimeType,
    { timeoutMs: GEMINI_TIMEOUT_MS, thinkingLevel: TRANSCRIPT_THINKING }
  );
  const parsed = JSON.parse(raw) as ParsedTranscript;
  return { parsed, elapsedMs: Date.now() - start, model };
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
