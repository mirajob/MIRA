// Minimal REST client for Google's Gemini API, in the same raw-fetch style as
// the OpenAI provider (packages/ai/src/provider.ts). Gemini reads PDFs and
// images natively as inline base64 data, so a single call handles both the
// transcript (PDF/screenshot) and the CV without a separate PDF text-extraction
// step. Used for now only by the /admin/ai-test playground while we benchmark
// Gemini against the current OpenAI parsers for speed and accuracy.

export type GeminiModel = "gemini-2.5-flash" | "gemini-2.5-pro";

export const GEMINI_MODELS: GeminiModel[] = ["gemini-2.5-flash", "gemini-2.5-pro"];

interface GeminiOptions {
  /** Abort the request after this many ms with a clear error instead of hanging. */
  timeoutMs?: number;
  /** "high" reasoning ≈ larger thinkingBudget. Default keeps thinking low for speed. */
  thinkingBudget?: number;
}

/**
 * One-shot structured generation: system instruction + a text prompt + one
 * inline file (PDF or image). Forces JSON output and returns the raw JSON text.
 */
export async function geminiGenerateJson(
  model: GeminiModel,
  systemPrompt: string,
  userText: string,
  fileBase64: string,
  fileMimeType: string,
  options: GeminiOptions = {}
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [
      {
        role: "user",
        parts: [
          { text: userText },
          { inlineData: { mimeType: fileMimeType, data: fileBase64 } },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
      maxOutputTokens: 16384,
      // thinkingBudget 0 disables Gemini's internal reasoning tokens = fastest.
      // Bump it for accuracy on dense transcripts. -1 lets the model decide.
      thinkingConfig: { thinkingBudget: options.thinkingBudget ?? 0 },
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const controller = options.timeoutMs ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), options.timeoutMs) : null;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
      ...(controller ? { signal: controller.signal } : {}),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Timeout: la richiesta Gemini ha superato ${(options.timeoutMs ?? 0) / 1000}s.`);
    }
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
  }

  if (!response.ok) {
    const error = await response.text();
    console.error(`[MIRA AI] Gemini API error ${response.status}:`, error);
    throw new Error(`Gemini API error ${response.status}: ${error}`);
  }

  const data = await response.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts = data.candidates?.[0]?.content?.parts as Array<{ text?: string }> | undefined;
  const textOutput = parts?.map((p) => p.text ?? "").join("").trim();

  if (!textOutput) {
    // A finishReason of MAX_TOKENS with no text usually means thinkingBudget ate
    // the whole budget — surface it clearly rather than a generic empty error.
    const finishReason = data.candidates?.[0]?.finishReason;
    throw new Error(`Nessuna risposta da Gemini (finishReason: ${finishReason ?? "unknown"}).`);
  }

  return textOutput;
}
