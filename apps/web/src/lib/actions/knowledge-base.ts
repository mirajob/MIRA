"use server";

import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function uploadKnowledgeDocument(formData: FormData) {
  const ctx = await getUserContext();
  if (!ctx.isMiraAdmin) redirect("/student");

  const service = await createServiceClient();

  const title = formData.get("title") as string;
  const sourceType = formData.get("sourceType") as string;
  const category = formData.get("category") as string;
  const visibilityScope = formData.get("visibilityScope") as string || "global_mira";
  const file = formData.get("file") as File | null;
  const pastedText = formData.get("pastedText") as string;

  if (!title) return { error: "Il titolo è obbligatorio" };

  let uploadedFileId = null;

  if (file && file.size > 0) {
    if (file.size > 50 * 1024 * 1024) {
      return { error: "Il file non può superare i 50MB" };
    }

    const ext = file.name.split(".").pop();
    const path = `documents/${Date.now()}_${file.name}`;

    const { error: uploadError } = await service.storage
      .from("knowledge-base")
      .upload(path, file, { upsert: true });

    if (uploadError) return { error: `Errore upload: ${uploadError.message}` };

    const { data: fileRecord } = await service.from("uploaded_files").insert({
      owner_user_id: ctx.profile.id,
      bucket: "knowledge-base",
      file_path: path,
      file_type: file.type,
      file_name: file.name,
      file_size: file.size,
      visibility_scope: "admin_only",
      linked_entity_type: "knowledge_document",
    }).select("id").single();

    uploadedFileId = fileRecord?.id;
  }

  const { error } = await service.from("knowledge_documents").insert({
    title,
    source_type: sourceType || "file",
    category: category || null,
    visibility_scope: visibilityScope,
    uploaded_file_id: uploadedFileId,
    uploaded_by_user_id: ctx.profile.id,
    processing_status: pastedText ? "ready" : "uploaded",
    metadata: pastedText ? { pasted_text: pastedText } : {},
  });

  if (error) return { error: error.message };

  await service.from("audit_logs").insert({
    actor_user_id: ctx.profile.id,
    action: "knowledge_document_uploaded",
    entity_type: "knowledge_document",
    metadata: { title, source_type: sourceType },
  });

  revalidatePath("/admin/knowledge-base");
  return { success: true };
}
