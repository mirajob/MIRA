"use client";

import { getPushPublicKey, savePushSubscription, removePushSubscription } from "@/lib/actions/push";

/**
 * Il lato browser delle notifiche: chiedere il permesso, iscriversi, disiscriversi.
 *
 * Una cosa da sapere prima di toccare questo file: il permesso si puo' chiedere UNA volta
 * sola. Se l'utente dice no al browser, quel no e' definitivo e da codice non si puo' piu'
 * riaprire la finestra, su quel dominio, per sempre. Per questo la richiesta vera parte
 * solo dopo che ha detto di si' a MIRA, dentro un pulsante nostro.
 */

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  // Le chiavi VAPID viaggiano in base64url, il browser le vuole come byte.
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function permissionState(): NotificationPermission | null {
  if (!pushSupported()) return null;
  return Notification.permission;
}

async function registration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;
  // In sviluppo il service worker non viene registrato all'avvio: se qualcuno prova le
  // notifiche da lì, lo registriamo al volo invece di restare in attesa per sempre.
  return navigator.serviceWorker.register("/sw.js");
}

function platform(): string {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

function standalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export type SubscribeResult = "ok" | "denied" | "unsupported" | "error";

export async function enablePush(): Promise<SubscribeResult> {
  if (!pushSupported()) return "unsupported";

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return "denied";

    const { publicKey } = await getPushPublicKey();
    if (!publicKey) return "error"; // chiavi VAPID non configurate sul server

    const reg = await registration();
    await navigator.serviceWorker.ready;

    // Se il dispositivo era gia' iscritto (permesso ridato, o iscrizione rimasta da prima)
    // si riusa quella: subscribe() con una chiave diversa fallirebbe.
    const existing = await reg.pushManager.getSubscription();
    const sub =
      existing ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      }));

    const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return "error";

    const { success } = await savePushSubscription(
      { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } },
      { platform: platform(), standalone: standalone(), userAgent: navigator.userAgent }
    );
    return success ? "ok" : "error";
  } catch (err) {
    console.error("[MIRA] attivazione notifiche fallita:", err);
    return "error";
  }
}

export async function disablePush(): Promise<boolean> {
  if (!pushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return true;
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    await removePushSubscription(endpoint);
    return true;
  } catch (err) {
    console.error("[MIRA] disattivazione notifiche fallita:", err);
    return false;
  }
}

/** Questo dispositivo ha un'iscrizione attiva adesso. */
export async function currentlySubscribed(): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== "granted") return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}
