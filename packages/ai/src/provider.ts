export const AI_CONFIG = {
  defaultModel: "gpt-4o-mini" as const,
  visionModel: "gpt-4o" as const,
  apiUrl: "https://api.openai.com/v1/chat/completions",
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
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const hasMedia = messages.some(
    (m) => Array.isArray(m.content) && m.content.some((p) => p.type === "image_url")
  );

  const body = {
    model: options.model ?? AI_CONFIG.defaultModel,
    messages,
    max_tokens: options.maxTokens ?? 1024,
    temperature: options.temperature ?? 0.7,
    ...(options.jsonMode ? { response_format: { type: "json_object" } } : {}),
  };

  const response = await fetch(AI_CONFIG.apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}
