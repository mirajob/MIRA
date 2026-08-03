"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * I dati anagrafici dello studente, modificabili da lui.
 *
 * Prima si potevano solo segnalare per email: una lettera di troppo nel nome
 * restava lì per sempre, ed è esattamente il tipo di errore che uno vuole
 * correggere da solo in dieci secondi.
 *
 * L'email resta fuori: è la credenziale di accesso, cambiarla richiede di
 * confermare il nuovo indirizzo e non è una modifica come le altre.
 */
export async function updateProfileDetails(input: {
  fullName: string;
  university: string;
  phone: string;
}) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();
  const profileId = (ctx.profile as any).id as string;

  const fullName = input.fullName.trim();
  const university = input.university.trim();
  const phone = input.phone.trim();

  if (fullName.length < 2) return { error: "Scrivi il tuo nome e cognome." };
  if (!university) return { error: "Scegli la tua università dall'elenco." };
  // Non validiamo il formato del numero oltre a questo: i prefissi
  // internazionali sono troppi perché una regola stretta faccia più bene che male.
  if (phone && phone.replace(/[^\d]/g, "").length < 6) {
    return { error: "Il numero di telefono non sembra completo." };
  }

  const { error: profileError } = await (supabase.from("profiles") as any)
    .update({ full_name: fullName, phone: phone || null })
    .eq("id", profileId);

  if (profileError) return { error: "Non è stato possibile salvare i dati." };

  const { error: studentError } = await (supabase.from("student_profiles") as any)
    .update({ university })
    .eq("user_id", profileId);

  if (studentError) return { error: "Non è stato possibile salvare l'università." };

  revalidatePath("/student/profile");
  revalidatePath("/student");
  return { success: true };
}
