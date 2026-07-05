"use client";

import { useState } from "react";
import { updateCardBlockProseContent, updateHeaderVisibility } from "@/lib/actions/card-blocks";
import { CardBlockHeader } from "./card-block-header";
import type { CardBlockStatus, HeaderProseContent, HeaderVisibility } from "@mira/types";

const LEVEL_LABELS: Record<string, string> = {
  triennale: "Triennale (Bachelor)",
  magistrale: "Magistrale (Master)",
  ciclo_unico: "Ciclo unico",
  phd: "PhD",
};

export function HeaderBlock({
  proseContent,
  visibility,
  status,
}: {
  proseContent: HeaderProseContent;
  visibility: HeaderVisibility;
  status: CardBlockStatus;
}) {
  const [form, setForm] = useState(proseContent);
  const [vis, setVis] = useState<HeaderVisibility>(
    visibility?.media_voti ? visibility : { media_voti: { associazioni: false, aziende: false } }
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof HeaderProseContent>(key: K, value: HeaderProseContent[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    await updateCardBlockProseContent("header", form);
    setSaving(false);
    setDirty(false);
  }

  async function toggleVisibility(key: keyof HeaderVisibility["media_voti"]) {
    const next = { media_voti: { ...vis.media_voti, [key]: !vis.media_voti[key] } };
    setVis(next);
    await updateHeaderVisibility(next);
  }

  return (
    <div className="rounded-lg border border-border bg-white overflow-hidden">
      <CardBlockHeader title="Header" status={status} blockType="header" />
      <div className="p-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-ink-tertiary text-body-sm">Corso di laurea</label>
            <input
              type="text"
              value={form.corso ?? ""}
              onChange={(e) => update("corso", e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-md border border-border text-body-sm text-ink focus:outline-none focus:ring-1 focus:ring-petrol/30"
            />
          </div>
          <div>
            <label className="text-ink-tertiary text-body-sm">Livello</label>
            <select
              value={form.livello ?? ""}
              onChange={(e) => update("livello", e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-md border border-border text-body-sm text-ink focus:outline-none focus:ring-1 focus:ring-petrol/30"
            >
              <option value="">—</option>
              {Object.entries(LEVEL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-ink-tertiary text-body-sm">Anno</label>
            <input
              type="number"
              value={form.anno ?? ""}
              onChange={(e) => update("anno", e.target.value ? Number(e.target.value) : null)}
              className="mt-1 w-full px-3 py-2 rounded-md border border-border text-body-sm text-ink focus:outline-none focus:ring-1 focus:ring-petrol/30"
            />
          </div>
          <div>
            <label className="text-ink-tertiary text-body-sm">Media ponderata</label>
            <p className="mt-1 px-3 py-2 text-body-sm text-ink-secondary" title="Cambia solo ricaricando il libretto">
              {form.media_voti ? `${Number(form.media_voti).toFixed(1)}/30` : "—"}
            </p>
          </div>
        </div>

        {dirty && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-body-sm font-medium text-white bg-petrol rounded-md px-4 py-2 hover:bg-petrol-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Salvataggio..." : "Salva"}
          </button>
        )}

        <div className="border-t border-border pt-4 space-y-3">
          <p className="text-body-sm font-medium text-ink">Visibilità media voti</p>
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <span className="text-body-sm text-ink-secondary">Associazioni universitarie</span>
            <button
              type="button"
              role="switch"
              aria-checked={vis.media_voti.associazioni}
              onClick={() => toggleVisibility("associazioni")}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                vis.media_voti.associazioni ? "bg-petrol" : "bg-border"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  vis.media_voti.associazioni ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </label>
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <span className="text-body-sm text-ink-secondary">Aziende</span>
            <button
              type="button"
              role="switch"
              aria-checked={vis.media_voti.aziende}
              onClick={() => toggleVisibility("aziende")}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                vis.media_voti.aziende ? "bg-petrol" : "bg-border"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  vis.media_voti.aziende ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </label>
        </div>
      </div>
    </div>
  );
}
