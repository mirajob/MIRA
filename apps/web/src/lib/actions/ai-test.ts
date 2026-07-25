"use server";

import {
  parseTranscriptWithGemini,
  parseCVWithGemini,
  recomputeTranscriptAverages,
  GEMINI_MODELS,
  type GeminiModel,
  type ParsedTranscript,
  type ParsedCV,
} from "@mira/ai";
import { getUserContext } from "@/lib/auth";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

export type TranscriptTestResult =
  | { ok: true; parsed: ParsedTranscript; elapsedMs: number; model: GeminiModel }
  | { ok: false; error: string };

export type CvTestResult =
  | { ok: true; parsed: ParsedCV; elapsedMs: number; model: GeminiModel }
  | { ok: false; error: string };

/* eslint-disable @typescript-eslint/no-explicit-any */

function resolveModel(raw: FormDataEntryValue | null): GeminiModel {
  const m = String(raw ?? "");
  return (GEMINI_MODELS as string[]).includes(m) ? (m as GeminiModel) : "gemini-2.5-flash";
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
  const read = await readFile(formData);
  if ("error" in read) return { ok: false, error: read.error };

  try {
    const { parsed, elapsedMs } = await parseTranscriptWithGemini(read.base64, read.type, model);
    return { ok: true, parsed: recomputeTranscriptAverages(parsed), elapsedMs, model };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore sconosciuto." };
  }
}

export async function testCvGemini(formData: FormData): Promise<CvTestResult> {
  const model = resolveModel(formData.get("model"));
  const read = await readFile(formData);
  if ("error" in read) return { ok: false, error: read.error };

  try {
    const { parsed, elapsedMs } = await parseCVWithGemini(read.base64, read.type, model);
    return { ok: true, parsed, elapsedMs, model };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore sconosciuto." };
  }
}
