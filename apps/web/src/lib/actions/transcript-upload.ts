"use server";

import { parseTranscriptFile, formatTranscriptForChat, type ParsedCourse } from "@mira/ai";
import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyRow = Record<string, any>;

export async function uploadTranscript(formData: FormData) {
  const ctx = await getUserContext();
  const profileId = (ctx.profile as any).id as string;
  const supabase = await createServiceClient();

  const file = formData.get("file") as File | null;
  if (!file) return { error: "Nessun file selezionato." };
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Formato non supportato. Carica un PDF o uno screenshot (PNG, JPG, WebP)." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { error: "File troppo grande (max 10MB)." };
  }

  const { data: studentProfile } = await (supabase
    .from("student_profiles") as any)
    .select("id")
    .eq("user_id", profileId)
    .single() as { data: AnyRow | null };

  if (!studentProfile) return { error: "Profilo studente non trovato." };

  const buffer = Buffer.from(await file.arrayBuffer());

  const filePath = `${profileId}/${Date.now()}_${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("transcripts")
    .upload(filePath, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    return { error: `Errore nel caricamento: ${uploadError.message}` };
  }

  const { data: uploadedFile } = await (supabase
    .from("uploaded_files") as any)
    .insert({
      owner_user_id: profileId,
      bucket: "transcripts",
      file_path: filePath,
      file_type: file.type,
      file_name: file.name,
      file_size: file.size,
      visibility_scope: "private",
      linked_entity_type: "student_profile",
      linked_entity_id: studentProfile.id,
    })
    .select("id")
    .single() as { data: AnyRow | null };

  const { data: transcript } = await (supabase
    .from("student_transcripts") as any)
    .insert({
      student_profile_id: studentProfile.id,
      uploaded_file_id: uploadedFile?.id ?? null,
      extraction_status: "processing",
    })
    .select("id")
    .single() as { data: AnyRow | null };

  try {
    const base64 = buffer.toString("base64");
    const parsed = await parseTranscriptFile(base64, file.type);

    await (supabase.from("student_transcripts") as any)
      .update({
        extraction_status: "completed",
        extracted_data: parsed,
        weighted_average: parsed.weighted_average,
        total_credits: parsed.total_credits,
        extraction_confidence: "ai_vision",
      })
      .eq("id", transcript!.id);

    if (parsed.courses.length > 0) {
      await (supabase.from("student_courses") as any).insert(
        parsed.courses.map((c: ParsedCourse) => ({
          student_profile_id: studentProfile.id,
          transcript_id: transcript!.id,
          course_name: c.course_name,
          course_code: c.course_code || null,
          credits: c.credits,
          grade: c.grade,
          grade_numeric: c.grade_numeric,
          academic_year: c.academic_year || null,
          semester: c.semester || null,
          source: "transcript",
        }))
      );
    }

    await (supabase.from("student_profiles") as any)
      .update({
        degree_program: parsed.degree_program || null,
        degree_level: parsed.degree_level || null,
        transcript_uploaded: true,
        transcript_summary: parsed,
      })
      .eq("id", studentProfile.id);

    await (supabase.from("ai_logs") as any).insert({
      module: "transcript_parser",
      provider: "openai",
      model: "gpt-4o",
      entity_type: "student_transcript",
      entity_id: transcript!.id,
      user_id: profileId,
      input_metadata: { file_name: file.name, file_size: file.size, file_type: file.type },
      output_summary: {
        courses_found: parsed.courses.length,
        total_credits: parsed.total_credits,
        weighted_average: parsed.weighted_average,
      },
      status: "success",
    });

    const summary = formatTranscriptForChat(parsed);
    return { success: true, summary, parsed };
  } catch (err) {
    await (supabase.from("student_transcripts") as any)
      .update({
        extraction_status: "failed",
        extraction_notes: err instanceof Error ? err.message : "Unknown error",
      })
      .eq("id", transcript!.id);

    return { error: "Non sono riuscito a leggere il libretto. Prova con uno screenshot più chiaro." };
  }
}
