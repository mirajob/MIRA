// Minimal REST client for Google's Gemini API, in the same raw-fetch style as
// the OpenAI provider (packages/ai/src/provider.ts). Gemini reads PDFs and
// images natively as inline base64 data, so a single call handles both the
// transcript (PDF/screenshot) and the CV without a separate PDF text-extraction
// step. Used for now only by the /admin/ai-test playground while we benchmark
// Gemini against the current OpenAI parsers for speed and accuracy.

// The `-latest` aliases always point to the current-generation Flash/Pro. We use
// them (rather than a pinned 2.5/3.x id) because Google gates specific versions
// by account: the 2.5 series returns 404 "no longer available to new users" on
// newer accounts, while `-latest` resolves to whatever that account can call.
export type GeminiModel = "gemini-flash-latest" | "gemini-pro-latest";

export const GEMINI_MODELS: GeminiModel[] = ["gemini-flash-latest", "gemini-pro-latest"];

// Gemini 3.x replaced the numeric `thinkingBudget` with a coarse `thinkingLevel`.
// The current Flash rejects `thinkingBudget` outright (400), so we drive thinking
// with the level: "low" for speed, "high" for accuracy on delicate data (grades).
export type ThinkingLevel = "low" | "high";

interface GeminiOptions {
  /** Abort the request after this many ms with a clear error instead of hanging. */
  timeoutMs?: number;
  /** Reasoning depth. "low" = fastest, "high" = most accurate. Default: "low". */
  thinkingLevel?: ThinkingLevel;
  /** Quanti tentativi in più sugli errori temporanei di capacità. Default: 2. */
  retries?: number;
}

/** 503 (modello sovraccarico), 429 (quota momentanea) e 500 sono temporanei: si riprova. */
function isTransientStatus(status: number): boolean {
  return status === 429 || status === 500 || status === 503;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Come geminiGenerateJson ma SENZA file: si manda solo testo.
 *
 * Serve per i PDF di testo (le autocertificazioni universitarie lo sono quasi sempre):
 * il testo si estrae in locale in una frazione di secondo e il modello legge caratteri
 * invece di guardare un'immagine. È la stessa risposta, ma molto più veloce e molto
 * meno cara, perché non si pagano i token dell'immagine.
 */
export async function geminiGenerateJsonFromText(
  model: GeminiModel,
  systemPrompt: string,
  userText: string,
  options: GeminiOptions = {}
): Promise<string> {
  return generate(model, systemPrompt, [{ text: userText }], options);
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
  return generate(
    model,
    systemPrompt,
    [{ text: userText }, { inlineData: { mimeType: fileMimeType, data: fileBase64 } }],
    options
  );
}

async function generate(
  model: GeminiModel,
  systemPrompt: string,
  parts: Array<Record<string, unknown>>,
  options: GeminiOptions
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
      maxOutputTokens: 16384,
      thinkingConfig: { thinkingLevel: options.thinkingLevel ?? "low" },
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  // "This model is currently experiencing high demand" arriva come 503 e passa da solo in
  // pochi secondi: senza questi tentativi lo studente vedeva l'errore grezzo dell'API e
  // restava senza libretto, con l'unica alternativa di riprovare a mano.
  const maxAttempts = 1 + (options.retries ?? 2);
  let lastTransientError = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await callGemini(url, apiKey, body, options);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const transient = message.startsWith("__TRANSIENT__");
      if (!transient || attempt === maxAttempts) {
        throw new Error(message.replace("__TRANSIENT__", ""));
      }
      lastTransientError = message.replace("__TRANSIENT__", "");
      await sleep(attempt * 1500);
    }
  }

  throw new Error(lastTransientError || "Gemini non ha risposto.");
}

async function callGemini(
  url: string,
  apiKey: string,
  body: unknown,
  options: GeminiOptions
): Promise<string> {
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
    const prefix = isTransientStatus(response.status) ? "__TRANSIENT__" : "";
    throw new Error(`${prefix}Gemini API error ${response.status}: ${error}`);
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
