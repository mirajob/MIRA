"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@mira/supabase/client";
import { useTranslations } from "next-intl";

/**
 * Accesso con Google.
 *
 * Usa Google Identity Services: il browser parla direttamente con Google, riceve un ID
 * token e lo passa a Supabase con `signInWithIdToken`. L'utente non lascia mai
 * mirajob.cloud, quindi Google mostra il NOSTRO dominio nella schermata di scelta
 * account invece di `<project-ref>.supabase.co` — che è quello che vedeva prima e che,
 * come dice la doc di Supabase, "non ispira fiducia".
 *
 * Il vecchio flusso a redirect (`signInWithOAuth`) resta come riserva: se lo script di
 * Google non si carica, se il client id manca o se il token viene rifiutato, mostriamo
 * il bottone classico. Meglio una schermata meno bella che un utente che non entra.
 */

const GSI_SRC = "https://accounts.google.com/gsi/client";
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
/** Oltre questo, si assume che lo script sia bloccato (adblock, rete, privacy). */
const SCRIPT_TIMEOUT_MS = 6000;

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleIdentityApi {
  accounts: {
    id: {
      initialize(config: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        nonce?: string;
        auto_select?: boolean;
      }): void;
      renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityApi;
  }
}

/** Google riceve l'hash del nonce, Supabase quello in chiaro: è così che verifica che il
 * token sia stato emesso per QUESTA richiesta e non riciclato da un'altra. */
async function createNoncePair(): Promise<{ raw: string; hashed: string }> {
  const random = crypto.getRandomValues(new Uint8Array(32));
  const raw = btoa(String.fromCharCode(...random));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return { raw, hashed };
}

function loadGsiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
    if (existing) {
      if (window.google) resolve();
      else existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("gsi_script_error")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("gsi_script_error"));
    document.head.appendChild(script);
  });
}

export function GoogleSignInButton({ redirect }: { redirect: string }) {
  const t = useTranslations("Common");
  const router = useRouter();

  const [fallback, setFallback] = useState(!GOOGLE_CLIENT_ID);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buttonRef = useRef<HTMLDivElement>(null);
  const rawNonceRef = useRef<string | null>(null);
  const safeRedirect = redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/api/auth/redirect";

  /** Arriva l'ID token da Google: lo scambiamo con una sessione Supabase. */
  const handleCredential = useCallback(
    async (response: GoogleCredentialResponse) => {
      if (!response.credential) return;
      setError(null);
      setLoading(true);

      const supabase = createBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: response.credential,
        ...(rawNonceRef.current ? { nonce: rawNonceRef.current } : {}),
      });

      if (signInError) {
        console.error("[MIRA] signInWithIdToken failed:", signInError);
        setError(t("googleSignInError"));
        setLoading(false);
        // Il token non è stato accettato: il redirect classico funziona comunque.
        setFallback(true);
        return;
      }

      router.push(safeRedirect);
      router.refresh();
    },
    [router, safeRedirect, t]
  );

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;

    const timeout = setTimeout(() => {
      if (!cancelled) setFallback(true);
    }, SCRIPT_TIMEOUT_MS);

    (async () => {
      try {
        await loadGsiScript();
        if (cancelled || !window.google || !buttonRef.current) return;

        const { raw, hashed } = await createNoncePair();
        if (cancelled) return;
        rawNonceRef.current = raw;

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredential,
          nonce: hashed,
          auto_select: false,
        });

        // Google accetta una larghezza in px tra 200 e 400: la prendiamo dal contenitore
        // così il bottone non stona con il resto del form.
        const width = Math.min(Math.max(buttonRef.current.clientWidth || 320, 200), 400);
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "center",
          width,
        });

        clearTimeout(timeout);
      } catch (err) {
        console.error("[MIRA] Google Identity Services unavailable:", err);
        if (!cancelled) setFallback(true);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [handleCredential]);

  /** Riserva: il giro classico con redirect su Supabase. */
  async function handleFallbackClick() {
    setError(null);
    setLoading(true);
    const supabase = createBrowserClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeRedirect)}`,
      },
    });
    if (oauthError) {
      setError(t("googleSignInError"));
      setLoading(false);
    }
    // In caso di successo il browser sta già navigando su Google: nessun reset di stato.
  }

  return (
    <div className="space-y-3">
      {!fallback && (
        <div className="flex justify-center">
          <div ref={buttonRef} className="w-full [&>div]:!w-full" />
        </div>
      )}

      {fallback && (
        <button
          type="button"
          onClick={handleFallbackClick}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-md border border-border bg-white px-6 py-3 text-label text-ink transition-colors duration-100 hover:border-border-strong active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <GoogleLogo />
          {loading ? t("googleSignInLoading") : t("googleSignIn")}
        </button>
      )}

      {loading && !fallback && <p className="text-center text-body-sm text-ink-tertiary">{t("googleSignInLoading")}</p>}
      {error && <p className="text-body-sm text-error">{error}</p>}

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-body-sm text-ink-tertiary">{t("orSeparator")}</span>
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
