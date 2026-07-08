"use client";

import { useState } from "react";
import { createBrowserClient } from "@mira/supabase/client";
import { setupAssociationProfile } from "@/lib/actions/association-register";
import { ASSOCIATION_CATEGORIES } from "@mira/domain";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CandidatiAssociazionePage() {
  const [associationName, setAssociationName] = useState("");
  const [category, setCategory] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [description, setDescription] = useState("");
  const [presidentName, setPresidentName] = useState("");
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
      options: { data: { full_name: presidentName } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (!data.user?.id) {
      setError("Errore durante la registrazione. Riprova.");
      setLoading(false);
      return;
    }

    const normalizedUrl = websiteUrl
      ? websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`
      : "";

    const result = await setupAssociationProfile({
      associationName,
      category,
      websiteUrl: normalizedUrl,
      description,
      presidentName,
    });

    if (result.error) {
      // Sign out so the orphaned auth user doesn't block a retry
      await supabase.auth.signOut();
      setError(result.error + " Riprova con la stessa email.");
      setLoading(false);
      return;
    }

    router.push("/associations/in-attesa");
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="px-6 py-4 border-b border-border bg-white">
        <Link href="/">
          <img src="/brand/mira-lockup.svg" alt="MIRA" className="h-5" />
        </Link>
      </header>

      <div className="flex-1 flex items-start justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <p className="text-eyebrow text-petrol uppercase tracking-wider mb-3">Per le associazioni</p>
          <h1 className="font-display text-h1 text-navy mb-2">Candida la tua associazione</h1>
          <p className="text-body text-ink-secondary mb-8">
            Compila i dati della tua associazione e crea il tuo account da presidente. Il MIRA admin verificherà la richiesta entro 24-48 ore — riceverai una email con l&apos;esito. Nel frattempo potrai già iniziare a costruire il tuo profilo studente.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-md bg-error-bg p-3 text-body-sm text-error">{error}</div>
            )}

            <label className="block">
              <span className="text-label text-navy mb-2 block">Nome associazione *</span>
              <input
                type="text"
                required
                value={associationName}
                onChange={(e) => setAssociationName(e.target.value)}
                placeholder="Es. BSIC, Bocconi Finance Club..."
                className="w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200"
              />
            </label>

            <label className="block">
              <span className="text-label text-navy mb-2 block">Categoria *</span>
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200"
              >
                <option value="">Seleziona categoria</option>
                {ASSOCIATION_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1).replace("_", " ")}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-label text-navy mb-2 block">Sito web</span>
              <input
                type="text"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="bsic.it"
                className="w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200"
              />
            </label>

            <label className="block">
              <span className="text-label text-navy mb-2 block">Breve descrizione</span>
              <textarea
                rows={3}
                maxLength={280}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Cosa fa l'associazione, in due righe..."
                className="w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200 resize-none"
              />
            </label>

            <div className="border-t border-border pt-5">
              <p className="text-label text-ink-secondary mb-4">I tuoi dati di accesso (presidente)</p>

              <div className="space-y-4">
                <label className="block">
                  <span className="text-label text-navy mb-2 block">Nome e cognome *</span>
                  <input
                    type="text"
                    required
                    value={presidentName}
                    onChange={(e) => setPresidentName(e.target.value)}
                    className="w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200"
                  />
                </label>

                <label className="block">
                  <span className="text-label text-navy mb-2 block">Email *</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nome@studbocconi.it"
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
              {loading ? "Invio in corso..." : "Invia candidatura"}
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
