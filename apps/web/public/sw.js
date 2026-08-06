/*
 * Service worker minimo, scritto per NON mettersi in mezzo.
 *
 * Serve a due cose sole:
 * 1. rendere MIRA installabile: Chrome su Android mostra "Installa app" solo se il sito ha
 *    un service worker registrato con un gestore fetch;
 * 2. dare una pagina decente quando il telefono e' senza rete, invece del dinosauro.
 *
 * Non mette in cache nessuna pagina di MIRA. Sembra uno spreco ma e' voluto: le pagine sono
 * personali e legate alla sessione Supabase, e una copia vecchia servita al volo mostrerebbe
 * a un utente i dati di prima (o di un altro account sullo stesso telefono). Tutto passa
 * dalla rete come senza service worker; l'unica cosa in cache e' offline.html, che e' fissa.
 */

const CACHE = "mira-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  // Solo il caricamento di una pagina. Chiamate API, Server Actions, upload e login
  // non passano di qui: le tocca la rete, come sempre.
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(OFFLINE_URL);
      return (
        cached ??
        new Response("Sei offline.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } })
      );
    })
  );
});
