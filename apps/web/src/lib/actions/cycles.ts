"use server";

import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function checkCyclePermission(associationId: string, permission: string) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  const { data: membership } = await supabase
    .from("association_memberships")
    .select("role, permissions")
    .eq("association_id", associationId)
    .eq("user_id", ctx.profile.id)
    .eq("status", "active")
    .maybeSingle();

  return (
    ctx.isMiraAdmin ||
    membership?.role === "association_president" ||
    (membership?.permissions as Record<string, boolean>)?.[permission]
  );
}

export async function createApplicationCycle(associationId: string, formData: FormData) {
  const ctx = await getUserContext();
  if (!(await checkCyclePermission(associationId, "manage_application_cycles"))) {
    return { error: "Non hai i permessi" };
  }

  const supabase = await createServiceClient();
  const { data: association } = await supabase
    .from("association_profiles")
    .select("slug")
    .eq("id", associationId)
    .single();

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const opensAt = formData.get("opensAt") as string;
  const closesAt = formData.get("closesAt") as string;
  const positionsRaw = formData.get("positions") as string;
  let positions: Array<{ name: string; description?: string }> = [];
  try {
    positions = positionsRaw ? JSON.parse(positionsRaw) : [];
  } catch {
    const rolesRaw = formData.get("availableRoles") as string;
    positions = rolesRaw ? rolesRaw.split(",").map(s => ({ name: s.trim() })).filter(p => p.name) : [];
  }

  if (!title) return { error: "Il titolo è obbligatorio" };

  const { data: cycle, error } = await supabase
    .from("application_cycles")
    .insert({
      association_id: associationId,
      title,
      description: description || null,
      status: "open",
      opens_at: opensAt || null,
      closes_at: closesAt || null,
      available_roles: positions,
      created_by_user_id: ctx.profile.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/association/${association?.slug}/cycles`);
  return { success: true, cycleId: cycle.id };
}

export async function updateCycleDetails(
  cycleId: string,
  associationId: string,
  slug: string,
  data: {
    title: string;
    description: string | null;
    opens_at: string | null;
    closes_at: string | null;
    available_roles: Array<{ name: string; description?: string; requirements?: string }>;
  }
) {
  if (!(await checkCyclePermission(associationId, "manage_application_cycles"))) {
    return { error: "Non hai i permessi" };
  }

  const supabase = await createServiceClient();

  await supabase
    .from("application_cycles")
    .update({
      title: data.title,
      description: data.description,
      opens_at: data.opens_at,
      closes_at: data.closes_at,
      available_roles: data.available_roles,
    })
    .eq("id", cycleId);

  revalidatePath(`/association/${slug}/cycles`);
  revalidatePath(`/association/${slug}/cycles/${cycleId}`);
  return { success: true };
}

export async function updateCycleStatus(associationId: string, cycleId: string, status: string) {
  const permission = status === "open" ? "publish_application_cycle" : "close_application_cycle";
  if (!(await checkCyclePermission(associationId, permission))) {
    return { error: "Non hai i permessi" };
  }

  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  await supabase
    .from("application_cycles")
    .update({ status })
    .eq("id", cycleId);

  const { data: association } = await supabase
    .from("association_profiles")
    .select("slug")
    .eq("id", associationId)
    .single();

  await supabase.from("audit_logs").insert({
    actor_user_id: ctx.profile.id,
    action: `cycle_${status}`,
    entity_type: "application_cycle",
    entity_id: cycleId,
  });

  revalidatePath(`/association/${association?.slug}/cycles`);
  return { success: true };
}

export async function addQuestion(cycleId: string, formData: FormData) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  const { data: cycle } = await supabase
    .from("application_cycles")
    .select("association_id, association_profiles(slug)")
    .eq("id", cycleId)
    .single();

  if (!cycle) return { error: "Ciclo non trovato" };
  if (!(await checkCyclePermission(cycle.association_id, "manage_application_questions"))) {
    return { error: "Non hai i permessi" };
  }

  const questionText = formData.get("questionText") as string;
  const questionType = formData.get("questionType") as string;
  const required = formData.get("required") === "true";
  const helperText = formData.get("helperText") as string;
  const optionsRaw = formData.get("options") as string;
  const options = optionsRaw ? optionsRaw.split("\n").map(s => s.trim()).filter(Boolean) : [];

  if (!questionText || !questionType) return { error: "Testo e tipo sono obbligatori" };

  const { data: maxOrder } = await supabase
    .from("application_questions")
    .select("order_index")
    .eq("application_cycle_id", cycleId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("application_questions").insert({
    application_cycle_id: cycleId,
    question_text: questionText,
    question_type: questionType,
    required,
    order_index: (maxOrder?.order_index ?? -1) + 1,
    helper_text: helperText || null,
    options: options.length > 0 ? options : [],
  });

  if (error) return { error: error.message };

  const slug = (cycle.association_profiles as { slug: string })?.slug;
  revalidatePath(`/association/${slug}/cycles/${cycleId}`);
  return { success: true };
}

export async function deleteQuestion(questionId: string, cycleId: string) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  const { data: cycle } = await supabase
    .from("application_cycles")
    .select("association_id, association_profiles(slug)")
    .eq("id", cycleId)
    .single();

  if (!cycle) return { error: "Ciclo non trovato" };
  if (!(await checkCyclePermission(cycle.association_id, "manage_application_questions"))) {
    return { error: "Non hai i permessi" };
  }

  await supabase.from("application_questions").delete().eq("id", questionId);

  const slug = (cycle.association_profiles as { slug: string })?.slug;
  revalidatePath(`/association/${slug}/cycles/${cycleId}`);
  return { success: true };
}
