"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * MIRA sulla schermata Home del telefono.
 *
 * Due componenti separati perché vanno in due posti diversi:
 *
 * `PwaServiceWorker` sta nel layout radice, per tutti: senza un service worker registrato
 * Chrome su Android non offre nemmeno "Installa app", e in più dà la pagina di cortesia
 * quando il telefono resta senza rete.
 *
 * `PwaInstallPrompt` è la riga che propone l'installazione, e sta nella dashboard: la
 * mostriamo a chi ha già un account, perché un'icona che apre la pagina di presentazione
 * a chi non si è ancora registrato non serve a niente. Serve perché quasi nessuno sa che
 * un sito si può installare e nessuno va a cercarlo nel menu del browser.
 *
 * I due sistemi si comportano in modo diverso e non c'è modo di uniformarli:
 * Android manda l'evento `beforeinstallprompt` e l'installazione la fa il browser quando
 * gliela chiediamo noi; iPhone non ha nessuna API, l'unica strada è Condividi e poi
 * "Aggiungi alla schermata Home", quindi lì possiamo solo spiegare dove toccare.
 */

const DISMISS_KEY = "mira.pwa.dismissed";

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

/**
 * iPhone dove "Condividi, poi Aggiungi alla schermata Home" è davvero l'istruzione giusta:
 * quindi Safari, non Chrome o Firefox su iOS (hanno un menu diverso) e non i browser dentro
 * Instagram o Facebook, dove l'opzione proprio non c'è. Dare istruzioni che non
 * corrispondono a quello che l'utente vede è peggio che non dire niente.
 */
function isIosSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  if (!/iphone|ipad|ipod/i.test(ua)) return false;
  if (/CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser/i.test(ua)) return false;
  if (/Instagram|FBAN|FBAV|FB_IAB|Line\/|Twitter|LinkedInApp/i.test(ua)) return false;
  return /Safari/i.test(ua);
}

function dismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) !== null;
  } catch {
    return false; // navigazione privata: meglio riproporlo che sparire per sempre
  }
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

export function PwaInstallPrompt() {
  const t = useTranslations("Pwa");
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (isStandalone()) return; // già installata: non c'è niente da proporre
    if (dismissed()) return;

    const onPrompt = (e: Event) => {
      // Senza preventDefault Chrome mostra la sua barra e non ci ridà l'evento.
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      setHidden(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iPhone: nessun evento, decidiamo noi. Con un attimo di ritardo, così la riga non
    // compare addosso alla pagina che si sta ancora aprendo.
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (isIosSafari()) {
      timer = setTimeout(() => {
        setShowIosHint(true);
        setHidden(false);
      }, 4000);
    }

    const onInstalled = () => dismiss();
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      if (timer) clearTimeout(timer);
    };
  }, []);

  function dismiss() {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // navigazione privata: pazienza, ricomparirà alla visita dopo
    }
  }

  async function handleInstall() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    // L'evento si consuma: che abbia accettato o no, la riga ha finito il suo lavoro.
    dismiss();
  }

  if (hidden) return null;

  return (
    // Solo su schermo piccolo: sul computer "aggiungi alla schermata Home" non vuol dire niente.
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden"
      role="region"
      aria-label={t("title")}
    >
      <div className="mx-auto flex max-w-app items-center gap-3">
        <img src="/icon-192.png" alt="" className="h-9 w-9 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1">
          <p className="text-body-sm font-medium text-navy">{t("title")}</p>
          <p className="text-xs text-ink-secondary">{showIosHint ? t("iosHint") : t("subtitle")}</p>
        </div>
        {!showIosHint && (
          <button
            type="button"
            onClick={handleInstall}
            className="shrink-0 rounded-md bg-navy px-3 py-1.5 text-xs font-medium text-white transition-colors duration-100 hover:bg-navy-700"
          >
            {t("cta")}
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
