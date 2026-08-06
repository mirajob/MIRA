/*
 * Service worker minimo, scritto per NON mettersi in mezzo.
 *
 * Serve a tre cose sole:
 * 1. rendere MIRA installabile: Chrome su Android mostra "Installa app" solo se il sito ha
 *    un service worker registrato con un gestore fetch;
 * 2. dare una pagina decente quando il telefono e' senza rete, invece del dinosauro;
 * 3. ricevere le notifiche push e aprire la pagina giusta quando le si tocca. Questo
 *    codice gira anche a MIRA chiusa: e' l'unico pezzo di noi che resta acceso.
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

/*
 * Notifica in arrivo. Il contenuto e' cifrato in viaggio e arriva qui gia' in chiaro.
 * `userVisibleOnly` e' un patto con il browser: ogni push ricevuta DEVE mostrare qualcosa,
 * altrimenti dopo un po' il permesso viene revocato. Per questo anche il caso storto
 * (messaggio illeggibile) mostra comunque una notifica generica.
 */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = data.title || "MIRA";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    // Con lo stesso tag una notifica sostituisce la precedente dello stesso tipo, invece di
    // impilarne dieci uguali quando arrivano piu' candidature di fila.
    tag: data.tag || "mira",
    data: { link: data.link || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/*
 * Tocco sulla notifica: se MIRA e' gia' aperta da qualche parte si porta in primo piano
 * quella finestra e la si manda sulla pagina giusta, invece di aprirne una seconda.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(link);
          return client.focus();
        }
      }
      return self.clients.openWindow(link);
    })
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
