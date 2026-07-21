"use client";

import { useState } from "react";
import { inviteBoardMember } from "@/lib/actions/board";

// Modello "gruppo WhatsApp": esistono solo membro e amministratore (il presidente e'
// il creatore, non si assegna). Reviewer e Interviewer sono ritirati: restano nell'enum
// del database per non rompere le righe storiche, ma non sono piu' assegnabili.
const ROLE_OPTIONS = [
  { value: "association_member", label: "Membro" },
  { value: "association_admin", label: "Amministratore" },
];

export function InviteMemberForm({ associationId, slug }: { associationId: string; slug: string }) {
  const [result, setResult] = useState<{ error?: string; success?: boolean; token?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setResult(null);
    const res = await inviteBoardMember(associationId, formData);
    setResult(res);
    setLoading(false);
  }

  return (
    <div className="rounded-lg border border-border bg-white p-6">
      <h3 className="font-sans text-h3 text-navy mb-4">Invita membro</h3>

      {result?.error && (
        <div className="mb-4 rounded-md bg-error-bg p-3 text-body-sm text-error">{result.error}</div>
      )}
      {result?.success && (
        <div className="mb-4 rounded-md bg-success-bg p-3 text-body-sm text-success">
          Invito creato. Link:{" "}
          <code className="font-mono text-xs break-all">
            {typeof window !== "undefined" ? window.location.origin : ""}/invite/{result.token}
          </code>
        </div>
      )}

      <form action={handleSubmit} className="flex gap-3 items-end flex-wrap">
        <label className="block flex-1 min-w-48">
          <span className="text-label text-navy mb-2 block">Email (@studbocconi.it)</span>
          <input
            name="email"
            type="email"
            required
            placeholder="membro@studbocconi.it"
            className="w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200"
          />
        </label>

        <label className="block w-48">
          <span className="text-label text-navy mb-2 block">Ruolo</span>
          <select
            name="role"
            required
            className="w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200"
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100 disabled:opacity-40"
        >
          {loading ? "Invio..." : "Invita"}
        </button>
      </form>
    </div>
  );
}
