"use client";

import { useState } from "react";
import { createCompanyInvitation } from "@/lib/actions/company-register";

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

export function InvitationForm() {
  const [result, setResult] = useState<{ error?: string; success?: boolean; token?: string; emailError?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setResult(null);
    const res = await createCompanyInvitation(formData);
    setResult(res);
    setLoading(false);
  }

  return (
    <div className="rounded-lg border border-border bg-white p-6">
      <h2 className="font-sans text-h3 text-navy mb-4">Invita direttamente un'azienda</h2>
      <p className="text-body-sm text-ink-secondary mb-4">
        Usa questo se hai già un contatto in azienda e vuoi dargli accesso subito, senza passare dalla registrazione pubblica. L&apos;account verrà attivato appena accetta l&apos;invito.
      </p>

      {result?.error && (
        <div className="mb-4 rounded-md bg-error-bg p-3 text-body-sm text-error">
          {result.error}
        </div>
      )}

      {result?.success && (
        <div className="mb-4 rounded-md bg-success-bg p-3 text-body-sm text-success">
          {result.emailError
            ? "Invito creato, ma l'invio dell'email non è riuscito. Copia il link e inviaglielo manualmente: "
            : "Invito creato e inviato via email. Link di invito: "}
          <code className="font-mono text-xs break-all">
            {typeof window !== "undefined" ? window.location.origin : ""}/invite/{result.token}
          </code>
        </div>
      )}

      <form action={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-label text-navy mb-2 block">Email contatto *</span>
          <input
            name="email"
            type="email"
            required
            placeholder="nome@azienda.com"
            className="w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200"
          />
        </label>

        <label className="block">
          <span className="text-label text-navy mb-2 block">Nome azienda *</span>
          <input
            name="companyName"
            type="text"
            required
            placeholder="es. McKinsey & Company"
            className="w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200"
          />
        </label>

        <label className="block">
          <span className="text-label text-navy mb-2 block">Settore</span>
          <select
            name="sector"
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
            name="website"
            type="url"
            placeholder="https://..."
            className="w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-label text-navy mb-2 block">Nota (opzionale)</span>
          <textarea
            name="note"
            rows={2}
            placeholder="Note interne per questo invito..."
            className="w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200 resize-none"
          />
        </label>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Invio in corso..." : "Invia invito"}
          </button>
        </div>
      </form>
    </div>
  );
}
