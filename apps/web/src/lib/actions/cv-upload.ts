"use server";

import { parseCVFile, formatCVForChat } from "@mira/ai";
import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyRow = Record<string, any>;

export async function uploadCV(formData: FormData) {
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
    .select("id, cv_uploaded")
    .eq("user_id", profileId)
    .single() as { data: AnyRow | null };

  if (!studentProfile) return { error: "Profilo studente non trovato." };
  if (studentProfile.cv_uploaded) return { error: "CV già caricato." };

  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = `cv/${profileId}/${Date.now()}_${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("transcripts")
    .upload(filePath, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error("CV storage upload error:", uploadError);
    return { error: `Errore nel caricamento: ${uploadError.message}` };
  }

  await (supabase.from("uploaded_files") as any).insert({
    owner_user_id: profileId,
    bucket: "transcripts",
    file_path: filePath,
    file_type: file.type,
    file_name: file.name,
    file_size: file.size,
    visibility_scope: "private",
    linked_entity_type: "student_cv",
    linked_entity_id: studentProfile.id,
  });

  try {
    const base64 = buffer.toString("base64");
    const parsed = await parseCVFile(base64, file.type);

    await (supabase.from("student_profiles") as any)
      .update({
        cv_uploaded: true,
        cv_summary: parsed,
      })
      .eq("id", studentProfile.id);

    await (supabase.from("ai_logs") as any).insert({
      module: "cv_parser",
      provider: "openai",
      model: "gpt-4o",
      entity_type: "student_profile",
      user_id: profileId,
      input_metadata: { file_name: file.name, file_size: file.size, file_type: file.type },
      output_summary: {
        experiences_found: parsed.experiences.length,
        skills_found: parsed.skills.length,
      },
      status: "success",
    });

    const summary = formatCVForChat(parsed);
    return { success: true, summary };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Errore sconosciuto";
    console.error("CV parse error:", errorMsg);
    // Still mark as uploaded (file is saved), but without structured data
    await (supabase.from("student_profiles") as any)
      .update({ cv_uploaded: true })
      .eq("id", studentProfile.id);
    return { error: `Errore parsing CV: ${errorMsg}` };
  }
}
