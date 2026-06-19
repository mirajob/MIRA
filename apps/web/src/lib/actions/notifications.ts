"use server";

import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function markNotificationRead(notificationId: string) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", ctx.profile.id);

  revalidatePath("/");
}

export async function markAllNotificationsRead() {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", ctx.profile.id)
    .is("read_at", null);

  revalidatePath("/");
}

export async function getUnreadCount() {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", ctx.profile.id)
    .is("read_at", null);

  return count ?? 0;
}
