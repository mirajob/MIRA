"use server";

import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function sendInterviewInvite(applicationId: string, formData: FormData) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();
  const service = await createServiceClient();

  const { data: application } = await supabase
    .from("applications")
    .select("id, association_id, student_user_id, association_profiles(slug)")
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

  const canInvite =
    ctx.isMiraAdmin ||
    membership?.role === "association_president" ||
    (membership?.permissions as Record<string, boolean>)?.send_interview_invites;

  if (!canInvite) return { error: "Non hai i permessi" };

  const proposedDate = formData.get("proposedDate") as string;
  const proposedTime = formData.get("proposedTime") as string;
  const location = formData.get("location") as string;
  const message = formData.get("message") as string;

  const proposedDateTime = proposedDate && proposedTime
    ? new Date(`${proposedDate}T${proposedTime}`).toISOString()
    : null;

  const { error } = await service.from("interview_invites").insert({
    application_id: applicationId,
    association_id: application.association_id,
    sent_by_user_id: ctx.profile.id,
    candidate_user_id: application.student_user_id,
    proposed_times: proposedDateTime ? [{ datetime: proposedDateTime }] : [],
    selected_time: proposedDateTime,
    location_or_link: location || null,
    message: message || null,
    status: "sent",
  });

  if (error) return { error: error.message };

  await service.from("applications")
    .update({ status: "interview", last_status_change_at: new Date().toISOString() })
    .eq("id", applicationId);

  await service.from("application_status_events").insert({
    application_id: applicationId,
    previous_status: "in_review",
    new_status: "interview",
    changed_by_user_id: ctx.profile.id,
    note: "Invito a colloquio inviato",
    visible_to_candidate: true,
  });

  await service.from("notifications").insert({
    user_id: application.student_user_id,
    type: "interview_invite",
    title: "Invito a colloquio",
    body: message || "Sei stato invitato a un colloquio. Controlla i dettagli.",
    data: { application_id: applicationId },
  });

  await service.from("audit_logs").insert({
    actor_user_id: ctx.profile.id,
    action: "interview_invite_sent",
    entity_type: "interview_invite",
    metadata: { application_id: applicationId },
  });

  const slug = (application.association_profiles as { slug: string })?.slug;
  revalidatePath(`/association/${slug}/candidates/${applicationId}`);
  return { success: true };
}
