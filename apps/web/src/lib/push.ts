import webpush from "web-push";
import { createServiceClient } from "@mira/supabase/server";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Spedizione delle notifiche push.
 *
 * Non è un file "use server": non lo chiama mai il browser, lo chiama il codice che crea
 * le notifiche (vedi lib/notify.ts). Il browser non deve poter dire "manda una push a
 * quest'altro".
 *
 * Come funziona, in breve: il telefono si iscrive e ci lascia un indirizzo (endpoint) del
 * servizio del suo sistema, Google per Android e Chrome, Apple per iPhone. Noi spediamo lì,
 * firmando con le chiavi VAPID, e il servizio consegna al telefono anche a MIRA chiusa. Il
 * contenuto viaggia cifrato con le chiavi del dispositivo: Google e Apple non lo leggono.
 * Non costa niente e non c'è nessun account da aprire.
 */

export interface PushPayload {
  title: string;
  body?: string;
  /** Dove portare chi tocca la notifica. Stessa convenzione della campanella: data.link. */
  link?: string;
  tag?: string;
}

let configured: boolean | null = null;

/** Le chiavi vivono solo nelle variabili d'ambiente. Se mancano, MIRA funziona lo stesso e
 * le push semplicemente non partono: è così che si comporta un ambiente non ancora
 * configurato, non deve diventare un errore in faccia allo studente. */
function ensureConfigured(): boolean {
  if (configured !== null) return configured;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    configured = false;
    return false;
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:dev@mirajob.cloud", publicKey, privateKey);
  configured = true;
  return true;
}

export function pushIsConfigured(): boolean {
  return ensureConfigured();
}

/**
 * Manda la stessa notifica a tutti i dispositivi di queste persone.
 *
 * Non lancia mai: una notifica che non parte non deve far fallire la candidatura o
 * l'invito a colloquio che l'ha generata. Al massimo resta scritta nei log.
 */
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  if (userIds.length === 0) return;
  if (!ensureConfigured()) return;

  try {
    const supabase = await createServiceClient();
    const { data: subs, error } = await (supabase.from("push_subscriptions") as any)
      .select("id, endpoint, p256dh, auth")
      .in("user_id", userIds);

    // Finché la tabella non esiste (migrazione non ancora applicata) si esce in silenzio.
    if (error || !subs || subs.length === 0) return;

    const body = JSON.stringify({
      title: payload.title,
      body: payload.body ?? "",
      link: payload.link ?? "/",
      tag: payload.tag,
    });

    const morti: string[] = [];

    await Promise.all(
      subs.map(async (s: any) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            body,
            { TTL: 60 * 60 * 24 }
          );
        } catch (err: any) {
          // 404 e 410 vogliono dire che quel dispositivo non esiste più: app disinstallata,
          // notifiche revocate, browser ripulito. Si cancella, altrimenti la tabella si
          // riempie di indirizzi morti a cui proviamo a scrivere per sempre.
          if (err?.statusCode === 404 || err?.statusCode === 410) morti.push(s.id);
          else console.error("[MIRA] push fallita:", err?.statusCode, err?.body ?? err?.message);
        }
      })
    );

    if (morti.length > 0) {
      await (supabase.from("push_subscriptions") as any).delete().in("id", morti);
    }
  } catch (err) {
    console.error("[MIRA] sendPushToUsers:", err);
  }
}
