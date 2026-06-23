export const AI_CONFIG = {
  defaultModel: "gemini-2.0-flash" as const,
};

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: "low" | "high" | "auto" } };

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
}

interface ChatOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
}

export async function chatCompletion(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    console.error("[MIRA AI] GOOGLE_AI_API_KEY is not set. Available env keys:", Object.keys(process.env).filter(k => k.includes("GOOGLE") || k.includes("OPENAI") || k.includes("SUPABASE")).join(", "));
    throw new Error("GOOGLE_AI_API_KEY is not set");
  }

  const model = options.model ?? AI_CONFIG.defaultModel;

  // Convert messages to Gemini format
  // Gemini doesn't have "system" role — prepend system messages as user context
  const systemParts = messages.filter((m) => m.role === "system");
  const nonSystemMessages = messages.filter((m) => m.role !== "system");

  const systemInstruction = systemParts.length > 0
    ? systemParts.map((m) => typeof m.content === "string" ? m.content : m.content.map((p) => p.type === "text" ? p.text : "").join("\n")).join("\n\n")
    : undefined;

  const contents = nonSystemMessages.map((m) => {
    const role = m.role === "assistant" ? "model" : "user";

    if (typeof m.content === "string") {
      return { role, parts: [{ text: m.content }] };
    }

    // Handle multimodal content
    const parts = m.content.map((p) => {
      if (p.type === "text") return { text: p.text };
      if (p.type === "image_url") {
        const url = p.image_url.url;
        if (url.startsWith("data:")) {
          const [meta, data] = url.split(",");
          const mimeType = meta.match(/data:(.*);/)?.[1] || "image/jpeg";
          return { inlineData: { mimeType, data } };
        }
        return { text: `[Image: ${url}]` };
      }
      return { text: "" };
    });

    return { role, parts };
  });

  // Ensure first message is from user (Gemini requirement)
  if (contents.length === 0 || contents[0].role !== "user") {
    contents.unshift({ role: "user", parts: [{ text: "." }] });
  }

  // Ensure alternating user/model messages (Gemini requirement)
  const fixedContents: typeof contents = [];
  for (let i = 0; i < contents.length; i++) {
    const current = contents[i];
    const prev = fixedContents[fixedContents.length - 1];
    if (prev && prev.role === current.role) {
      // Merge consecutive same-role messages
      prev.parts.push(...current.parts);
    } else {
      fixedContents.push(current);
    }
  }

  const body: Record<string, unknown> = {
    contents: fixedContents,
    generationConfig: {
      maxOutputTokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0.7,
      ...(options.jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  };

  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`[MIRA AI] Gemini API error ${response.status}:`, error);
    throw new Error(`Gemini API error ${response.status}: ${error}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text && data.candidates?.[0]?.finishReason === "SAFETY") {
    console.error("[MIRA AI] Gemini blocked by safety filters:", JSON.stringify(data.candidates[0]));
    return "Mi dispiace, non sono riuscito a generare una risposta. Riprova con una domanda diversa.";
  }
  if (!text) {
    console.error("[MIRA AI] Unexpected Gemini response:", JSON.stringify(data).slice(0, 500));
  }
  return text ?? "";
}
