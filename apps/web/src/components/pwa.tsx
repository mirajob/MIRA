"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { enablePush, permissionState, pushSupported } from "@/lib/push-client";
import { pushReady, recordAppOpen } from "@/lib/actions/push";

/**
 * MIRA sul telefono: installazione e notifiche.
 *
 * `PwaServiceWorker` sta nel layout radice, per tutti: senza un service worker registrato
 * Chrome su Android non offre nemmeno "Installa app", non arrivano le push e non c'è la
 * pagina di cortesia quando manca la rete.
 *
 * `AppPrompt` è la riga in fondo allo schermo, e sta nella dashboard: la mostriamo a chi ha
 * già un account, perché un'icona che apre la pagina di presentazione a chi non si è ancora
 * registrato non serve a niente.
 *
 * Una riga sola alla volta, mai due impilate. Ha la precedenza la richiesta di notifiche
 * dove è possibile darla, perché è quella che riporta lo studente su MIRA; l'invito a
 * installare compare quando le notifiche non sono ancora possibili, che su iPhone è sempre
 * il caso finché non installa (Apple non le concede a Safari normale).
 *
 * Nota sui permessi, che vale più di qualsiasi scelta grafica: la finestra del browser si
 * può aprire una volta sola. Un "no" lì è definitivo e irreversibile da codice. Per questo
 * chiediamo prima noi, con parole nostre: un "no" a MIRA lo si può cambiare idea domani.
 */

const DISMISS_INSTALL = "mira.pwa.dismissed";
const DISMISS_PUSH = "mira.push.dismissed";
const OPEN_LOGGED = "mira.app.open.logged";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari su iPhone non supporta display-mode: standalone, ha un flag suo.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

/**
 * iPhone dove "Condividi, poi Aggiungi alla schermata Home" è davvero l'istruzione giusta:
 * quindi Safari, non Chrome o Firefox su iOS (hanno un menu diverso) e non i browser dentro
 * Instagram o Facebook, dove l'opzione proprio non c'è. Dare istruzioni che non
 * corrispondono a quello che l'utente vede è peggio che non dire niente.
 */
function isIosSafari(): boolean {
  if (!isIOS()) return false;
  const ua = window.navigator.userAgent;
  if (/CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser/i.test(ua)) return false;
  if (/Instagram|FBAN|FBAV|FB_IAB|Line\/|Twitter|LinkedInApp/i.test(ua)) return false;
  return /Safari/i.test(ua);
}

function flagged(key: string): boolean {
  try {
    return localStorage.getItem(key) !== null;
  } catch {
    return false; // navigazione privata: meglio riproporlo che sparire per sempre
  }
}

function flag(key: string) {
  try {
    localStorage.setItem(key, "1");
  } catch {
    // niente da fare, pazienza
  }
}

function platformName(): string {
  if (isIOS()) return "ios";
  if (/android/i.test(navigator.userAgent)) return "android";
  return "desktop";
}

/** Solo registrazione, nessuna interfaccia. Il service worker vive solo in produzione: in
 * sviluppo si metterebbe tra il browser e il ricaricamento a caldo di Next, con pagine che
 * restano indietro senza motivo apparente. */
export function PwaServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    const register = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}

type Mode = "push" | "install" | "ios-install" | null;

export function AppPrompt() {
  const t = useTranslations("Pwa");
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<Mode>(null);
  const [busy, setBusy] = useState(false);
  // Finché non sappiamo che il server è pronto a registrare le iscrizioni, le notifiche
  // non si propongono nemmeno: vedi pushReady().
  const [serverPronto, setServerPronto] = useState(false);

  useEffect(() => {
    pushReady()
      .then(setServerPronto)
      .catch(() => setServerPronto(false));
  }, []);

  /** Chi apre MIRA dall'icona lo registriamo una volta per sessione: è il dato che dice
   * quante persone la usano davvero come app. Non serve a mostrare niente. */
  useEffect(() => {
    if (!isStandalone()) return;
    if (sessionStorage.getItem(OPEN_LOGGED)) return;
    sessionStorage.setItem(OPEN_LOGGED, "1");
    recordAppOpen({ platform: platformName() }).catch(() => {});
  }, []);

  const decide = useCallback((install: BeforeInstallPromptEvent | null, pronto: boolean) => {
    const standalone = isStandalone();
    // Le notifiche si possono chiedere solo se il permesso non è ancora stato deciso: se ha
    // già detto sì è fatta, se ha detto no la finestra non si riapre più e insistere con una
    // riga che non porta a niente è solo fastidio.
    const canAskPush = pronto && pushSupported() && permissionState() === "default" && (!isIOS() || standalone);

    if (canAskPush && !flagged(DISMISS_PUSH)) return setMode("push");
    if (standalone) return setMode(null); // già installata: niente da proporre
    if (flagged(DISMISS_INSTALL)) return setMode(null);
    if (install) return setMode("install");
    if (isIosSafari()) return setMode("ios-install");
    return setMode(null);
  }, []);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      // Senza preventDefault Chrome mostra la sua barra e non ci ridà l'evento.
      e.preventDefault();
      const ev = e as BeforeInstallPromptEvent;
      setInstallEvent(ev);
      decide(ev, serverPronto);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // Appena installata: registriamo l'installazione e ripassiamo dalla decisione, perché su
    // iPhone da questo momento le notifiche diventano possibili e prima non lo erano.
    const onInstalled = () => {
      recordAppOpen({ platform: platformName(), installed: true }).catch(() => {});
      decide(null, serverPronto);
    };
    window.addEventListener("appinstalled", onInstalled);

    // Un attimo di attesa prima di comparire: la riga non deve saltare addosso a una pagina
    // che si sta ancora aprendo. Vale anche per Chrome, che manda l'evento quasi subito.
    const timer = setTimeout(() => decide(installEvent, serverPronto), 2500);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      clearTimeout(timer);
    };
  }, [decide, serverPronto, installEvent]);

  function dismiss() {
    flag(mode === "push" ? DISMISS_PUSH : DISMISS_INSTALL);
    // Chiudendo la richiesta di notifiche resta comunque l'invito a installare, se ha senso.
    if (mode === "push") decide(installEvent, serverPronto);
    else setMode(null);
  }

  async function handlePush() {
    setBusy(true);
    const result = await enablePush();
    setBusy(false);
    // Sì o no che sia, la finestra del browser è già passata: la riga ha finito il suo
    // lavoro e non deve tornare. Le notifiche restano governabili dal Profilo.
    flag(DISMISS_PUSH);
    if (result === "ok") setMode(null);
    else decide(installEvent, serverPronto);
  }

  async function handleInstall() {
    if (!installEvent) return;
    setBusy(true);
    await installEvent.prompt();
    await installEvent.userChoice;
    setBusy(false);
    flag(DISMISS_INSTALL);
    setMode(null);
  }

  if (!mode) return null;

  const isPush = mode === "push";
  const title = isPush ? t("pushTitle") : t("title");
  const detail = isPush ? t("pushSubtitle") : mode === "ios-install" ? t("iosHint") : t("subtitle");
  const action = isPush ? handlePush : handleInstall;
  const actionLabel = isPush ? t("pushCta") : t("cta");

  return (
    // Solo su schermo piccolo: sul computer "aggiungi alla schermata Home" non vuol dire niente.
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden"
      role="region"
      aria-label={title}
    >
      <div className="mx-auto flex max-w-app items-center gap-3">
        <img src="/icon-192.png" alt="" className="h-9 w-9 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1">
          <p className="text-body-sm font-medium text-navy">{title}</p>
          <p className="text-xs text-ink-secondary">{detail}</p>
        </div>
        {mode !== "ios-install" && (
          <button
            type="button"
            onClick={action}
            disabled={busy}
            className="shrink-0 rounded-md bg-navy px-3 py-1.5 text-xs font-medium text-white transition-colors duration-100 hover:bg-navy-700 disabled:opacity-40"
          >
            {actionLabel}
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("dismiss")}
          className="shrink-0 p-1 text-ink-tertiary transition-colors duration-100 hover:text-navy"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
