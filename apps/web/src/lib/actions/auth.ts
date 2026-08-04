"use server";

import { redirect } from "next/navigation";
import { createServerClient, createServiceClient } from "@mira/supabase/server";

export async function signOut(formData?: FormData) {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  const redirectTo = formData?.get("redirect");
  redirect(typeof redirectTo === "string" && redirectTo.startsWith("/") ? redirectTo : "/login");
}

/**
 * Distinguishes company vs. student accounts so the login page can enforce
 * the "Sono un'azienda" / "Sono uno studente" toggle instead of silently
 * letting either account type in through the wrong mode.
 */
export async function checkAccountType(email: string): Promise<"company" | "student" | "other" | "unknown"> {
  const supabase = await createServiceClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();

  if (!profile) return "unknown";

  const { data: roles } = await supabase
    .from("global_role_assignments")
    .select("role")
    .eq("user_id", (profile as { id: string }).id);

  const roleNames = (roles ?? []).map((r) => (r as { role: string }).role);
  if (roleNames.includes("company_user")) return "company";
  if (roleNames.includes("student")) return "student";
  return "other";
}

/**
 * "Ho dimenticato la password": manda il link per rifarla.
 *
 * Diciamo apertamente se quell'indirizzo non ha un account. Nascondere il fatto
 * protegge da chi va a caccia di indirizzi registrati, ma qui lascerebbe la
 * persona ad aspettare una mail che non arriverà mai, che è il modo più comune
 * di perdere qualcuno all'accesso.
 */
export async function requestPasswordReset(email: string, origin: string) {
  const clean = email.trim().toLowerCase();
  if (!clean.includes("@")) return { error: "Scrivi il tuo indirizzo email." };

  const accountType = await checkAccountType(clean);
  if (accountType === "unknown") {
    return { error: "Non risulta nessun account con questa email." };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(clean, {
    redirectTo: `${origin}/auth/callback?next=/nuova-password`,
  });

  if (error) {
    console.error("resetPasswordForEmail error:", error.message);
    return { error: "Non è stato possibile mandare il link, riprova." };
  }
  return { success: true };
}

/** Imposta la nuova password. Vale sia dopo il link di recupero sia da dentro l'account. */
export async function setNewPassword(password: string) {
  if (password.length < 8) return { error: "La password deve avere almeno 8 caratteri." };

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sessione scaduta: riapri il link dall'email." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "Non è stato possibile cambiare la password." };
  return { success: true };
}

/**
 * Cambio password da dentro l'account. La vecchia si richiede davvero: senza,
 * chiunque trovasse un computer sbloccato potrebbe prendersi l'account.
 */
export async function changePassword(currentPassword: string, newPassword: string) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Sessione scaduta, rifai l'accesso." };

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (signInError) return { error: "La password attuale non è corretta." };

  return setNewPassword(newPassword);
}

/**
 * Cosa sappiamo già di chi ha appena aperto una sessione (tipicamente con Google).
 *
 * Serve al form "candida la tua associazione": dopo l'accesso con Google dobbiamo
 * sapere se all'account manca l'università, perché le pagine delle associazioni sono
 * scopate per ateneo e senza quel dato la pagina nascerebbe senza università. Se c'è
 * già, i campi non si chiedono di nuovo.
 */
export async function getCurrentStudentBasics(): Promise<{
  signedIn: boolean;
  fullName: string | null;
  university: string | null;
  degreeLevel: string | null;
}> {
  const empty = { signedIn: false, fullName: null, university: null, degreeLevel: null };

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return empty;

  const service = await createServiceClient();

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const { data: profile } = await (service.from("profiles") as any)
    .select("id, full_name")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!profile) return { ...empty, signedIn: true };

  const { data: student } = await (service.from("student_profiles") as any)
    .select("university, degree_level")
    .eq("user_id", profile.id)
    .maybeSingle();

  return {
    signedIn: true,
    fullName: (profile.full_name as string) ?? null,
    university: (student?.university as string) ?? null,
    degreeLevel: (student?.degree_level as string) ?? null,
  };
}
