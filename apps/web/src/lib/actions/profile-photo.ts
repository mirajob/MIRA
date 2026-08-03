"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

/**
 * La foto profilo dello studente.
 *
 * Il percorso è fisso per profilo e si sovrascrive: una persona ha una foto, non
 * una collezione, e senza upsert il bucket accumulerebbe tutte le versioni
 * vecchie senza che nessuno le cancelli mai.
 */
export async function uploadProfilePhoto(formData: FormData) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();
  const profileId = (ctx.profile as any).id as string;

  const file = formData.get("photo") as File | null;
  if (!file || file.size === 0) return { error: "Nessun file selezionato." };
  if (file.size > MAX_BYTES) return { error: "La foto è troppo pesante (massimo 4 MB)." };
  if (!ALLOWED.includes(file.type)) return { error: "Formato non supportato: usa JPG, PNG o WebP." };

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${profileId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: true });

  if (uploadError) return { error: "Caricamento non riuscito, riprova." };

  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
  // L'url è sempre lo stesso dopo un upsert: senza il parametro di versione il
  // browser continuerebbe a mostrare la foto precedente dalla cache.
  const photoUrl = `${urlData.publicUrl}?v=${Date.now()}`;

  const { error } = await (supabase.from("profiles") as any)
    .update({ avatar_url: photoUrl })
    .eq("id", profileId);

  if (error) return { error: "Non è stato possibile salvare la foto." };

  revalidatePath("/student/profile");
  revalidatePath("/student");
  return { photoUrl };
}

/** Toglie la foto: resta l'iniziale del nome, che è il comportamento di partenza. */
export async function removeProfilePhoto() {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();
  const profileId = (ctx.profile as any).id as string;

  await supabase.storage
    .from("avatars")
    .remove([`${profileId}/avatar.jpg`, `${profileId}/avatar.png`, `${profileId}/avatar.webp`]);

  const { error } = await (supabase.from("profiles") as any)
    .update({ avatar_url: null })
    .eq("id", profileId);

  if (error) return { error: "Non è stato possibile togliere la foto." };

  revalidatePath("/student/profile");
  revalidatePath("/student");
  return { success: true };
}
