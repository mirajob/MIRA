"use server";

import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function changeCandidateStatus(
  applicationId: string,
  newStatus: string,
  note?: string
) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  const { data: application } = await supabase
    .from("applications")
    .select("id, status, association_id, association_profiles(slug)")
    .eq("id", applicationId)
    .single();

  if (!application) return { error: "Candidatura non trovata" };

  const { data: membership } = await supabase
    .from("association_memberships")
    .select("role, permissions")
    .eq("association_id", application.association_id)
    .eq("user_id", ctx.profile.id)
    .eq("status", "active")
    .maybeSingle();

  const canChange =
    ctx.isMiraAdmin ||
    membership?.role === "association_president" ||
    (membership?.permissions as Record<string, boolean>)?.change_candidate_status;

  if (!canChange) return { error: "Non hai i permessi" };

  await supabase
    .from("applications")
    .update({
      status: newStatus,
      last_status_change_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  await supabase.from("application_status_events").insert({
    application_id: applicationId,
    previous_status: application.status,
    new_status: newStatus,
    changed_by_user_id: ctx.profile.id,
    note: note || null,
    visible_to_candidate: true,
  });

  await supabase.from("audit_logs").insert({
    actor_user_id: ctx.profile.id,
    action: "candidate_status_changed",
    entity_type: "application",
    entity_id: applicationId,
    metadata: {
      previous_status: application.status,
      new_status: newStatus,
    },
  });

  const slug = (application.association_profiles as { slug: string })?.slug;
  revalidatePath(`/association/${slug}/candidates`);
  revalidatePath(`/association/${slug}/candidates/${applicationId}`);
  return { success: true };
}

export async function addCandidateNote(applicationId: string, noteText: string) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  const { data: application } = await supabase
    .from("applications")
    .select("association_id, association_profiles(slug)")
    .eq("id", applicationId)
    .single();

  if (!application) return { error: "Candidatura non trovata" };

  const { data: membership } = await supabase
    .from("association_memberships")
    .select("role, permissions")
    .eq("association_id", application.association_id)
    .eq("user_id", ctx.profile.id)
    .eq("status", "active")
    .maybeSingle();

  const canNote =
    ctx.isMiraAdmin ||
    membership?.role === "association_president" ||
    (membership?.permissions as Record<string, boolean>)?.add_internal_candidate_notes;

  if (!canNote) return { error: "Non hai i permessi" };

  await supabase.from("candidate_internal_notes").insert({
    application_id: applicationId,
    author_user_id: ctx.profile.id,
    note_text: noteText,
  });

  const slug = (application.association_profiles as { slug: string })?.slug;
  revalidatePath(`/association/${slug}/candidates/${applicationId}`);
  return { success: true };
}
