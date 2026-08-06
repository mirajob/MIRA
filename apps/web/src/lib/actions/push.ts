"use server";

import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Iscrizione alle notifiche e uso di MIRA come app installata.
 *
 * Tutto quello che c'e' qui parte dal browser, quindi ogni funzione riparte dall'utente
 * loggato e non si fida mai di un id che arriva da fuori.
 */

/** La chiave pubblica serve al browser per iscriversi. Sta in una variabile d'ambiente e la
 * passiamo a richiesta invece di cucirla nel pacchetto JavaScript: cosi' cambiarla non
 * richiede di ricompilare il sito, e il codice funziona anche dove non e' configurata. */
export async function getPushPublicKey(): Promise<{ publicKey: string | null }> {
  return { publicKey: process.env.VAPID_PUBLIC_KEY ?? null };
}

/**
 * Le notifiche sono davvero pronte lato server?
 *
 * Il permesso del browser si chiede UNA volta sola e un "no" e' definitivo. Chiederlo
 * mentre mancano le chiavi VAPID o la tabella delle iscrizioni sarebbe il modo peggiore
 * di sprecarlo: lo studente direbbe di si', non arriverebbe niente, e non ci sarebbe
 * modo di richiederglielo. Quindi prima si controlla, poi si chiede.
 */
export async function pushReady(): Promise<boolean> {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return false;
  try {
    const supabase = await createServiceClient();
    const { error } = await (supabase.from("push_subscriptions") as any).select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}

// I tipi stanno inline: da un file "use server" si possono esportare solo funzioni async,
// e una violazione non la vede la compilazione, la si scopre in produzione.
export async function savePushSubscription(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  meta?: { platform?: string; standalone?: boolean; userAgent?: string }
): Promise<{ success: boolean }> {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();
  const profileId = (ctx.profile as any).id as string;

  if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return { success: false };
  }

  // Lo stesso dispositivo che si iscrive di nuovo (permesso ridato, browser aggiornato)
  // deve aggiornare la sua riga: senza questo la stessa notifica arriverebbe due volte.
  const { error } = await (supabase.from("push_subscriptions") as any).upsert(
    {
      user_id: profileId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      user_agent: meta?.userAgent ?? null,
      platform: meta?.platform ?? null,
      standalone: meta?.standalone ?? false,
      last_used_at: new Date().toISOString(),
      failure_count: 0,
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    console.error("[MIRA] iscrizione push non salvata:", error.message);
    return { success: false };
  }
  return { success: true };
}

export async function removePushSubscription(endpoint: string): Promise<{ success: boolean }> {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();
  const profileId = (ctx.profile as any).id as string;

  const { error } = await (supabase.from("push_subscriptions") as any)
    .delete()
    .eq("user_id", profileId)
    .eq("endpoint", endpoint);

  if (error) {
    console.error("[MIRA] disiscrizione push non riuscita:", error.message);
    return { success: false };
  }
  return { success: true };
}

/**
 * MIRA aperta dall'icona sulla schermata Home.
 *
 * Su Android il browser ci avvisa nell'istante dell'installazione (`installed: true`), su
 * iPhone quell'evento non esiste e l'unica cosa che vediamo e' l'apertura dall'icona. Per
 * questo la prima apertura vale anche come data di installazione: sul telefono di Apple e'
 * il massimo che si puo' sapere.
 */
export async function recordAppOpen(input: { platform?: string; installed?: boolean }): Promise<{ success: boolean }> {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();
  const profileId = (ctx.profile as any).id as string;

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    app_last_open_at: now,
    app_platform: input.platform ?? null,
  };

  const { data: current } = await (supabase.from("profiles") as any)
    .select("app_installed_at")
    .eq("id", profileId)
    .maybeSingle();

  if (input.installed || !current?.app_installed_at) patch.app_installed_at = now;

  const { error } = await (supabase.from("profiles") as any).update(patch).eq("id", profileId);
  if (error) {
    console.error("[MIRA] apertura da app non registrata:", error.message);
    return { success: false };
  }
  return { success: true };
}
