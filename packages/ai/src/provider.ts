import OpenAI from "openai";

let _client: OpenAI | null = null;

export function getAIClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

export const AI_CONFIG = {
  defaultModel: "gpt-4o-mini" as const,
  models: {
    fast: "gpt-4o-mini" as const,
    smart: "gpt-4o" as const,
  },
  maxTokens: {
    chat: 1024,
    matching: 2048,
    scraping: 2048,
  },
};
