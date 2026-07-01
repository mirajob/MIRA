"use client";

import { useState } from "react";
import { createBrowserClient } from "@mira/supabase/client";
import { setupCompanyProfile } from "@/lib/actions/company-register";
import { useRouter } from "next/navigation";
import Link from "next/link";

const SECTORS = [
  "Consulting",
  "Finance & Banking",
  "Tech & Software",
  "Fintech",
  "Luxury & Fashion",
  "Marketing & Comunicazione",
  "Legal",
  "Private Equity & VC",
  "Real Estate",
  "Healthcare",
  "Energy & Sustainability",
  "Media & Entertainment",
  "Startup",
  "Altro",
];

export default function AziendePage() {
  const [step, setStep] = useState<"landing" | "form">("landing");
  const [legalName, setLegalName] = useState("");
  const [sector, setSector] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createBrowserClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: contactName } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    const authUserId = data.user?.id;
    if (!authUserId) {
      setError("Errore durante la registrazione. Riprova.");
      setLoading(false);
      return;
    }

    const normalizedUrl = websiteUrl
      ? websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`
      : "";
    const result = await setupCompanyProfile({ authUserId, legalName, sector, websiteUrl: normalizedUrl, contactName });

    if (result.error) {
      // Sign out so the orphaned auth user doesn't block a retry
      await supabase.auth.signOut();
      setError(result.error + " Riprova con la stessa email.");
      setLoading(false);
      return;
    }

    router.push("/aziende/pending");
  }

  if (step === "form") {
    return (
      <div className="min-h-screen bg-paper flex flex-col">
        <header className="px-6 py-4 border-b border-border bg-white">
          <img src="/brand/mira-lockup.svg" alt="MIRA" className="h-5" />
        </header>

        <div className="flex-1 flex items-start justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <button
              onClick={() => setStep("landing")}
              className="text-body-sm text-ink-tertiary hover:text-ink mb-6 flex items-center gap-1"
            >
              ← Torna indietro
            </button>

            <h1 className="font-display text-h1 text-navy mb-2">Registra la tua azienda</h1>
            <p className="text-body text-ink-secondary mb-8">
              Compila i dati per richiedere l&apos;accesso a MIRA. Il tuo account verrà attivato entro 24 ore.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-md bg-error-bg p-3 text-body-sm text-error">{error}</div>
              )}

              <label className="block">
                <span className="text-label text-navy mb-2 block">Nome azienda *</span>
                <input
                  type="text"
                  required
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="Es. McKinsey & Company"
                  className="w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200"
                />
              </label>

              <label className="block">
                <span className="text-label text-navy mb-2 block">Settore *</span>
                <select
                  required
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200"
                >
                  <option value="">Seleziona settore</option>
                  {SECTORS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-label text-navy mb-2 block">Sito web</span>
                <input
                  type="text"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="bain.com"
                  className="w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200"
                />
              </label>

              <div className="border-t border-border pt-5">
                <p className="text-label text-ink-secondary mb-4">I tuoi dati di accesso</p>

                <div className="space-y-4">
                  <label className="block">
                    <span className="text-label text-navy mb-2 block">Nome e cognome *</span>
                    <input
                      type="text"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200"
                    />
                  </label>

                  <label className="block">
                    <span className="text-label text-navy mb-2 block">Email aziendale *</span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200"
                    />
                  </label>

                  <label className="block">
                    <span className="text-label text-navy mb-2 block">Password *</span>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200"
                    />
                    <p className="mt-1 text-body-sm text-ink-tertiary">Minimo 8 caratteri</p>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? "Registrazione in corso..." : "Richiedi accesso"}
              </button>

              <p className="text-center text-body-sm text-ink-secondary">
                Hai già un account?{" "}
                <Link href="/login" className="text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700">
                  Accedi
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="px-6 py-4 border-b border-border bg-white flex items-center justify-between">
        <img src="/brand/mira-lockup.svg" alt="MIRA" className="h-5" />
        <Link href="/login" className="text-body-sm text-ink-secondary hover:text-navy transition-colors">
          Accedi
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="mb-16">
          <p className="text-eyebrow text-petrol uppercase tracking-wider mb-4">Per le aziende</p>
          <h1 className="font-display text-display-lg text-navy mb-6 max-w-2xl">
            Trova i talenti Bocconi prima che aggiornino il CV
          </h1>
          <p className="text-body-lg text-ink-secondary max-w-xl mb-8">
            MIRA costruisce profili profondi degli studenti attraverso conversazioni AI — esperienze, interessi, attitudini, obiettivi. Tu descrivi cosa cerchi, MIRA ti mostra chi si adatta davvero al ruolo.
          </p>
          <button
            onClick={() => setStep("form")}
            className="bg-navy text-white px-8 py-4 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100"
          >
            Richiedi accesso al pilot →
          </button>
          <p className="mt-3 text-body-sm text-ink-tertiary">Gratuito fino a settembre 2026. Attivazione entro 24h.</p>
        </div>

        {/* How it works */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {[
            {
              n: "01",
              title: "Descrivi cosa cerchi",
              body: "Scrivi in linguaggio naturale il profilo che ti serve: ruolo, competenze, settore, attitudine, disponibilità. Non serve una scheda rigida.",
            },
            {
              n: "02",
              title: "MIRA trova i match",
              body: "L'AI confronta la tua ricerca con i profili degli studenti onboardati e ti mostra i candidati più coerenti, con una spiegazione per ognuno.",
            },
            {
              n: "03",
              title: "Contatti e colloqui",
              body: "Invia una richiesta di contatto allo studente. Se accetta, si apre una chat diretta in cui puoi proporre un colloquio.",
            },
          ].map((item) => (
            <div key={item.n} className="rounded-lg border border-border bg-white p-6">
              <p className="text-eyebrow text-petrol uppercase tracking-wider mb-3">{item.n}</p>
              <h3 className="font-display text-h3 text-navy mb-2">{item.title}</h3>
              <p className="text-body text-ink-secondary">{item.body}</p>
            </div>
          ))}
        </div>

        {/* Why MIRA */}
        <div className="rounded-lg border border-border bg-white p-8 mb-16">
          <h2 className="font-display text-h2 text-navy mb-6">Perché è diverso da JobGate</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-label text-ink-secondary mb-3">JobGate e LinkedIn</p>
              <ul className="space-y-2">
                {[
                  "Ricevi CV auto-dichiarati da scremare",
                  "Stessa logica del 2005",
                  "Non sai cosa c'è davvero dentro un candidato",
                  "Lo studente aggiorna il profilo solo quando cerca lavoro",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2 text-body text-ink-secondary">
                    <span className="text-ink-tertiary mt-0.5">—</span>{t}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-label text-navy mb-3">MIRA</p>
              <ul className="space-y-2">
                {[
                  "Cerchi tu tra profili già costruiti e strutturati",
                  "Dati raccolti via AI: esperienze, interessi, attitudini",
                  "Spiegazione del perché ogni candidato è adatto",
                  "Gli studenti si profilano anche quando non cercano lavoro",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2 text-body text-ink">
                    <span className="text-petrol mt-0.5">✓</span>{t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* CTA bottom */}
        <div className="text-center">
          <button
            onClick={() => setStep("form")}
            className="bg-navy text-white px-8 py-4 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100"
          >
            Registra la tua azienda
          </button>
          <p className="mt-3 text-body-sm text-ink-tertiary">
            Pilot gratuito · ~1.000 studenti Bocconi onboardati a settembre
          </p>
        </div>
      </main>
    </div>
  );
}
