import { sendPushToUsers, type PushPayload } from "@/lib/push";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Un solo punto dove nasce una notifica.
 *
 * Prima ogni pezzo di codice scriveva per conto suo nella tabella `notifications`, e la
 * notifica esisteva solo dentro MIRA: la vedevi se tornavi sul sito e aprivi la campanella.
 * Da qui in poi la stessa riga fa anche squillare il telefono a chi ha MIRA installata e ha
 * dato il permesso. Chi non ce l'ha non perde niente, la campanella resta.
 *
 * `link` e' dove porta il tocco sulla notifica, ed e' la stessa convenzione che usava gia'
 * la campanella (data.link), quindi le due strade non possono divergere.
 */

export interface NotificationInput {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  data?: Record<string, unknown>;
}

function toRow(n: NotificationInput) {
  return {
    user_id: n.userId,
    type: n.type,
    title: n.title,
    body: n.body ?? null,
    data: { ...(n.data ?? {}), ...(n.link ? { link: n.link } : {}) },
  };
}

/** Scrive le notifiche e prova a spedirle sui telefoni. La push e' un di piu': se fallisce
 * la notifica resta comunque nella campanella, quindi qui non si lancia mai. */
export async function createNotifications(supabase: any, items: NotificationInput[]): Promise<void> {
  if (items.length === 0) return;

  const { error } = await supabase.from("notifications").insert(items.map(toRow));
  if (error) {
    console.error("[MIRA] notifiche non salvate:", error.message);
    return; // senza la riga in tabella non ha senso far squillare niente
  }

  // Una push per destinatario. Se la stessa notifica va a piu' persone (i membri di
  // un'associazione) il testo e' lo stesso, quindi si raggruppa per contenuto.
  const perPayload = new Map<string, { payload: PushPayload; userIds: string[] }>();
  for (const n of items) {
    const payload: PushPayload = { title: n.title, body: n.body, link: n.link, tag: n.type };
    const key = JSON.stringify(payload);
    const entry = perPayload.get(key);
    if (entry) entry.userIds.push(n.userId);
    else perPayload.set(key, { payload, userIds: [n.userId] });
  }

  await Promise.all([...perPayload.values()].map(({ payload, userIds }) => sendPushToUsers(userIds, payload)));
}

export async function createNotification(supabase: any, item: NotificationInput): Promise<void> {
  await createNotifications(supabase, [item]);
}
