"use server";

import {
  parseTranscriptWithGemini,
  parseCVWithGemini,
  recomputeTranscriptAverages,
  GEMINI_MODELS,
  estimateGeminiCost,
  type GeminiModel,
  type ParsedTranscript,
  type ParsedCV,
} from "@mira/ai";
import { getUserContext } from "@/lib/auth";
import { createServiceClient } from "@mira/supabase/server";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Anche le prove del playground sono chiamate vere che Google fattura: se non finissero in
 * ai_logs, la pagina Consumi AI mostrerebbe meno di quanto spendiamo davvero. Il modulo
 * "ai_test" le tiene distinte dai caricamenti degli studenti.
 */
async function logTest(input: {
  kind: "transcript" | "cv";
  model: string;
  usage?: { inputTokens: number; outputTokens: number };
  summary: Record<string, unknown>;
  error?: string;
}) {
  try {
    const ctx = await getUserContext();
    const supabase = await createServiceClient();
    await (supabase.from("ai_logs") as any).insert({
      module: "ai_test",
      provider: "google",
      model: input.model,
      entity_type: input.kind === "transcript" ? "student_transcript" : "student_profile",
      user_id: (ctx.profile as any).id,
      input_metadata: { playground: true, kind: input.kind },
      output_summary: input.summary,
      tokens_input: input.usage?.inputTokens ?? null,
      tokens_output: input.usage?.outputTokens ?? null,
      estimated_cost: input.usage ? estimateGeminiCost(input.model, input.usage) : null,
      status: input.error ? "error" : "success",
      error_message: input.error ?? null,
    });
  } catch (err) {
    console.error("[MIRA] log della prova playground fallito:", err);
  }
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

export type TranscriptTestResult =
  | {
      ok: true;
      parsed: ParsedTranscript;
      elapsedMs: number;
      model: GeminiModel;
      cost: number | null;
      tokens: string;
      viaText: boolean;
      thinking: "low" | "high";
    }
  | { ok: false; error: string };

export type CvTestResult =
  | { ok: true; parsed: ParsedCV; elapsedMs: number; model: GeminiModel; cost: number | null; tokens: string; viaText: boolean }
  | { ok: false; error: string };

/* eslint-disable @typescript-eslint/no-explicit-any */

function resolveModel(raw: FormDataEntryValue | null): GeminiModel {
  const m = String(raw ?? "");
  return (GEMINI_MODELS as string[]).includes(m) ? (m as GeminiModel) : "gemini-flash-latest";
}

async function readFile(formData: FormData): Promise<{ base64: string; type: string } | { error: string }> {
  const ctx = await getUserContext();
  if (!(ctx as any).isMiraAdmin) return { error: "Accesso riservato agli amministratori MIRA." };

  const file = formData.get("file") as File | null;
  if (!file) return { error: "Nessun file selezionato." };
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Formato non supportato. Carica un PDF o uno screenshot (PNG, JPG, WebP)." };
  }
  if (file.size > MAX_FILE_SIZE) return { error: "File troppo grande (max 10MB)." };

  const buffer = Buffer.from(await file.arrayBuffer());
  return { base64: buffer.toString("base64"), type: file.type };
}

export async function testTranscriptGemini(formData: FormData): Promise<TranscriptTestResult> {
  const model = resolveModel(formData.get("model"));
  const thinking = formData.get("thinking") === "low" ? "low" : "high";
  const read = await readFile(formData);
  if ("error" in read) return { ok: false, error: read.error };

  try {
    const { parsed, elapsedMs, usage, viaText } = await parseTranscriptWithGemini(
      read.base64,
      read.type,
      model,
      thinking
    );
    const corrected = recomputeTranscriptAverages(parsed);
    await logTest({
      kind: "transcript",
      model,
      usage,
      summary: { courses_found: corrected.courses.length, thinking, via_text: !!viaText },
    });
    return {
      ok: true,
      parsed: corrected,
      elapsedMs,
      model,
      cost: usage ? estimateGeminiCost(model, usage) : null,
      tokens: usage ? `${usage.inputTokens} in / ${usage.outputTokens} out` : "n/d",
      viaText: !!viaText,
      thinking,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto.";
    await logTest({ kind: "transcript", model, summary: {}, error: message });
    return { ok: false, error: message };
  }
}

export async function testCvGemini(formData: FormData): Promise<CvTestResult> {
  const model = resolveModel(formData.get("model"));
  const read = await readFile(formData);
  if ("error" in read) return { ok: false, error: read.error };

  try {
    const { parsed, elapsedMs, usage } = await parseCVWithGemini(read.base64, read.type, model);
    await logTest({
      kind: "cv",
      model,
      usage,
      summary: { experiences_found: parsed.experiences.length, skills_found: parsed.skills.length },
    });
    return {
      ok: true,
      parsed,
      elapsedMs,
      model,
      cost: usage ? estimateGeminiCost(model, usage) : null,
      tokens: usage ? `${usage.inputTokens} in / ${usage.outputTokens} out` : "n/d",
      viaText: false,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto.";
    await logTest({ kind: "cv", model, summary: {}, error: message });
    return { ok: false, error: message };
  }
}
