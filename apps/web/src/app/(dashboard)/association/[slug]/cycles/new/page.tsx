"use client";

import { useState } from "react";
import { createApplicationCycle } from "@/lib/actions/cycles";
import { useParams, useRouter } from "next/navigation";

interface Position {
  name: string;
  description: string;
}

export default function NewCyclePage() {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [associationId, setAssociationId] = useState<string | null>(null);
  const [positions, setPositions] = useState<Position[]>([{ name: "", description: "" }]);
  const router = useRouter();

  async function loadAssociationId() {
    if (associationId) return associationId;
    const res = await fetch(`/api/association/${slug}/id`);
    const data = await res.json();
    setAssociationId(data.id);
    return data.id;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const validPositions = positions.filter((p) => p.name.trim());
    formData.set("positions", JSON.stringify(validPositions));

    const id = await loadAssociationId();
    const res = await createApplicationCycle(id, formData);
    if (res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    router.push(`/association/${slug}/cycles/${res.cycleId}`);
  }

  function addPosition() {
    setPositions([...positions, { name: "", description: "" }]);
  }

  function updatePosition(index: number, field: keyof Position, value: string) {
    const updated = [...positions];
    updated[index] = { ...updated[index], [field]: value };
    setPositions(updated);
  }

  function removePosition(index: number) {
    if (positions.length <= 1) return;
    setPositions(positions.filter((_, i) => i !== index));
  }

  const inputClass = "w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200";

  return (
    <div className="mx-auto max-w-reading">
      <h2 className="font-display text-h2 text-navy mb-6">Nuovo ciclo di candidatura</h2>

      {error && (
        <div className="mb-4 rounded-md bg-error-bg p-3 text-body-sm text-error">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-white p-6 space-y-5">
        <label className="block">
          <span className="text-label text-navy mb-2 block">Titolo *</span>
          <input name="title" type="text" required placeholder="es. Recruiting Fall 2026" className={inputClass} />
        </label>

        <label className="block">
          <span className="text-label text-navy mb-2 block">Descrizione generale</span>
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

        <div>
          <span className="text-label text-navy mb-3 block">Posizioni aperte</span>
          <div className="space-y-3">
            {positions.map((pos, i) => (
              <div key={i} className="rounded-md border border-border p-4 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pos.name}
                    onChange={(e) => updatePosition(i, "name", e.target.value)}
                    placeholder="Nome posizione (es. M&A Analyst)"
                    className={`${inputClass} flex-1`}
                  />
                  {positions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePosition(i)}
                      className="text-ink-tertiary hover:text-error px-2 transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <textarea
                  value={pos.description}
                  onChange={(e) => updatePosition(i, "description", e.target.value)}
                  placeholder="Descrizione: cosa cerchi per questa posizione? (es. Interesse per valuation e financial modeling)"
                  rows={2}
                  className={`${inputClass} resize-y`}
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addPosition}
            className="mt-2 text-body-sm text-petrol hover:text-petrol-700 transition-colors"
          >
            + Aggiungi posizione
          </button>
        </div>

        <button type="submit" disabled={loading} className="bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100 disabled:opacity-40">
          {loading ? "Creazione..." : "Crea ciclo"}
        </button>
      </form>
    </div>
  );
}
