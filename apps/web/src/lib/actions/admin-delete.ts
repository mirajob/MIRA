"use server";

import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function deleteUserAccount(profileId: string) {
  const ctx = await getUserContext();
  if (!ctx.isMiraAdmin) return { error: "Non autorizzato." };
  if (profileId === ctx.profile.id) return { error: "Non puoi eliminare il tuo stesso account." };

  const supabase = await createServiceClient();
  const { data: authUserId, error } = await supabase.rpc("admin_delete_profile", { target_profile_id: profileId });

  if (error) return { error: error.message };

  // Il vero utente auth va rimosso via Admin API, non con una DELETE SQL diretta
  // su auth.users: GoTrue tiene stato interno (identities, sessioni, token) che
  // solo questa chiamata pulisce correttamente — una DELETE grezza lasciava
  // residui che confondevano una successiva registrazione con la stessa email.
  if (authUserId) {
    const { error: authError } = await supabase.auth.admin.deleteUser(authUserId as string);
    if (authError) return { error: authError.message };
  }

  revalidatePath("/admin/users");
  return { success: true };
}

export async function deleteAssociationAccount(associationId: string) {
  const ctx = await getUserContext();
  if (!ctx.isMiraAdmin) return { error: "Non autorizzato." };

  const supabase = await createServiceClient();
  const { error } = await supabase.rpc("admin_delete_association", { target_association_id: associationId });

  if (error) return { error: error.message };

  revalidatePath("/admin/associations");
  return { success: true };
}
