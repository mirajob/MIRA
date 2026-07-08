"use client";

import { useState } from "react";
import { sendContactRequest } from "@/lib/actions/company-contacts";

interface Props {
  slug: string;
  code: string;
  onClose: () => void;
}

export function ContactRequestModal({ slug, code, onClose }: Props) {
  const [roleTitle, setRoleTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await sendContactRequest(slug, code, roleTitle, message);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setSent(true);
    setLoading(false);
    setTimeout(onClose, 2000);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg border border-border w-full max-w-md p-6 shadow-xl">
        {sent ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-success-bg flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-body font-medium text-ink">Richiesta inviata!</p>
            <p className="text-body-sm text-ink-secondary mt-1">Lo studente riceverà una notifica.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-h2 text-navy">Contatta candidato</h2>
              <button onClick={onClose} className="text-ink-tertiary hover:text-ink">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <p className="text-body-sm text-ink-secondary mb-5">
              Lo studente vedrà il nome della tua azienda e il messaggio. Potrà accettare o rifiutare.
            </p>

            {error && (
              <div className="rounded-md bg-error-bg p-3 text-body-sm text-error mb-4">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="text-label text-navy mb-2 block">Ruolo proposto *</span>
                <input
                  type="text"
                  required
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  placeholder="Es. Stage Analyst, Junior Consultant…"
                  className="w-full px-4 py-3 rounded-md border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200"
                />
              </label>

              <label className="block">
                <span className="text-label text-navy mb-2 block">Messaggio *</span>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Presentati brevemente e spiega perché stai contattando questo candidato…"
                  className="w-full px-4 py-3 rounded-md border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200 resize-none"
                />
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-md border border-border text-body text-ink hover:border-border-strong transition-colors duration-100"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-navy text-white px-4 py-3 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100 disabled:opacity-40"
                >
                  {loading ? "Invio..." : "Invia richiesta"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
