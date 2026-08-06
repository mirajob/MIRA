"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { currentlySubscribed, disablePush, enablePush, permissionState, pushSupported } from "@/lib/push-client";
import { pushReady } from "@/lib/actions/push";

/**
 * Notifiche sul telefono, accese e spente da qui.
 *
 * L'interruttore vale per QUESTO dispositivo: le notifiche si danno a un telefono, non a
 * una persona. Chi usa MIRA sul telefono e sul portatile decide separatamente, ed è giusto
 * così: nessuno vuole il portatile che squilla in biblioteca.
 *
 * I casi in cui l'interruttore non basta e bisogna spiegare, invece di lasciare un comando
 * che non fa niente:
 * - permesso già negato: il browser non ci fa più riaprire la finestra, si cambia solo
 *   dalle impostazioni del telefono. Diciamo dove.
 * - iPhone non installato: Apple non dà le notifiche web a Safari, prima va aggiunta alla
 *   schermata Home.
 * - browser che non le supporta proprio.
 */

type Stato =
  | "caricamento"
  | "attive"
  | "spente"
  | "negato"
  | "serve-installazione"
  | "non-supportato"
  | "non-pronto";

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function NotificationSettings() {
  const t = useTranslations("Profile");
  const [stato, setStato] = useState<Stato>("caricamento");
  const [busy, setBusy] = useState(false);

  async function rileva() {
    if (!pushSupported()) return setStato("non-supportato");
    if (isIOS() && !isStandalone()) return setStato("serve-installazione");
    const permesso = permissionState();
    if (permesso === "denied") return setStato("negato");
    // Il permesso si spende una volta sola: se il server non è pronto a registrare
    // l'iscrizione, meglio un interruttore assente che un sì buttato via.
    if (!(await pushReady())) return setStato("non-pronto");
    setStato((await currentlySubscribed()) ? "attive" : "spente");
  }

  useEffect(() => {
    rileva();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggle() {
    setBusy(true);
    if (stato === "attive") {
      await disablePush();
    } else {
      const esito = await enablePush();
      if (esito === "denied") {
        setBusy(false);
        return setStato("negato");
      }
    }
    await rileva();
    setBusy(false);
  }

  const attive = stato === "attive";
  const spiegazione =
    stato === "negato"
      ? t("pushDenied")
      : stato === "serve-installazione"
        ? t("pushNeedsInstall")
        : stato === "non-supportato"
          ? t("pushUnsupported")
          : stato === "non-pronto"
            ? t("pushNotReady")
            : t("pushHint");

  return (
    <section className="space-y-4 rounded-lg border border-border bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-body font-medium text-navy">{t("pushHeading")}</h2>
        {busy && <span className="text-body-sm text-ink-tertiary">{t("saving")}</span>}
      </div>

      <label className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-body-sm font-medium text-ink">{t("pushToggle")}</p>
          <p className="text-body-sm text-ink-tertiary">{spiegazione}</p>
        </div>
        {(stato === "attive" || stato === "spente") && (
          <button
            type="button"
            role="switch"
            aria-checked={attive}
            disabled={busy}
            onClick={toggle}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:opacity-40 ${
              attive ? "bg-petrol" : "bg-border"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                attive ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        )}
      </label>
    </section>
  );
}
