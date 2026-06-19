"use client";

import { useState } from "react";
import { createApplicationCycle } from "@/lib/actions/cycles";
import { useParams, useRouter } from "next/navigation";

export default function NewCyclePage() {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [associationId, setAssociationId] = useState<string | null>(null);
  const router = useRouter();

  async function loadAssociationId() {
    if (associationId) return associationId;
    const res = await fetch(`/api/association/${slug}/id`);
    const data = await res.json();
    setAssociationId(data.id);
    return data.id;
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const id = await loadAssociationId();
    const res = await createApplicationCycle(id, formData);
    if (res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    router.push(`/association/${slug}/cycles/${res.cycleId}`);
  }

  const inputClass = "w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200";

  return (
    <div className="mx-auto max-w-reading">
      <h2 className="font-display text-h2 text-navy mb-6">Nuovo ciclo di candidatura</h2>

      {error && (
        <div className="mb-4 rounded-md bg-error-bg p-3 text-body-sm text-error">{error}</div>
      )}

      <form action={handleSubmit} className="rounded-lg border border-border bg-white p-6 space-y-4">
        <label className="block">
          <span className="text-label text-navy mb-2 block">Titolo *</span>
          <input name="title" type="text" required placeholder="es. Recruiting Fall 2026" className={inputClass} />
        </label>

        <label className="block">
          <span className="text-label text-navy mb-2 block">Descrizione</span>
          <textarea name="description" rows={3} placeholder="Descrivi il ciclo di selezione..." className={`${inputClass} resize-y`} />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-label text-navy mb-2 block">Data apertura</span>
            <input name="opensAt" type="datetime-local" className={inputClass} />
          </label>
          <label className="block">
            <span className="text-label text-navy mb-2 block">Data chiusura</span>
            <input name="closesAt" type="datetime-local" className={inputClass} />
          </label>
        </div>

        <label className="block">
          <span className="text-label text-navy mb-2 block">Ruoli/team disponibili (separati da virgola)</span>
          <input name="availableRoles" type="text" placeholder="es. Analyst, Associate, Marketing" className={inputClass} />
        </label>

        <button type="submit" disabled={loading} className="bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100 disabled:opacity-40">
          {loading ? "Creazione..." : "Crea ciclo"}
        </button>
      </form>
    </div>
  );
}
