"use client";

import { useState, useEffect } from "react";
import { updateCardBlockProseContent, updateHeaderVisibility } from "@/lib/actions/card-blocks";
import { CardBlockHeader } from "./card-block-header";
import type { CardBlockStatus, FormazioneItem, HeaderProseContent, HeaderVisibility } from "@mira/types";

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
  formazioneItems,
  onApproved,
}: {
  proseContent: HeaderProseContent;
  visibility: HeaderVisibility;
  status: CardBlockStatus;
  /** Esami dal libretto, mostrati come sezione espandibile qui — non un blocco a sé (spec: un solo Conferma per Header+Formazione). */
  formazioneItems: FormazioneItem[];
  onApproved?: () => void;
}) {
  const [form, setForm] = useState(proseContent);
  const [vis, setVis] = useState<HeaderVisibility>(
    visibility?.media_voti ? visibility : { media_voti: { associazioni: false, aziende: false } }
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [esamiExpanded, setEsamiExpanded] = useState(false);

  // In onboarding proseContent arriva in modo asincrono (es. dopo il parsing del libretto):
  // se non c'è un edit locale in corso, riflette sempre l'ultimo dato dal server.
  useEffect(() => {
    if (!dirty) setForm(proseContent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proseContent]);
  useEffect(() => {
    if (visibility?.media_voti) setVis(visibility);
  }, [visibility]);

  function update<K extends keyof HeaderProseContent>(key: K, value: HeaderProseContent[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  }

  function updateFP(key: "universita" | "corso" | "voto_laurea" | "tema_tesi", value: string) {
    setForm((f) => ({
      ...f,
      formazione_precedente: {
        universita: null,
        corso: null,
        voto_laurea: null,
        tema_tesi: null,
        ...f.formazione_precedente,
        [key]: value || null,
      },
    }));
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
      <CardBlockHeader
        title="Header"
        status={status}
        blockType="header"
        alsoApprove={["formazione"]}
        onApproved={onApproved}
      />
      <div className="p-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-ink-tertiary text-body-sm">Università</label>
            <input
              type="text"
              value={form.universita ?? ""}
              onChange={(e) => update("universita", e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-md border border-border text-body-sm text-ink focus:outline-none focus:ring-1 focus:ring-petrol/30"
            />
          </div>
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

        {formazioneItems.length > 0 && (
          <div className="border-t border-border pt-4">
            <button
              type="button"
              onClick={() => setEsamiExpanded((e) => !e)}
              className="flex items-center gap-2 text-body-sm font-medium text-ink hover:text-petrol transition-colors"
            >
              <span>{esamiExpanded ? "▾" : "▸"}</span>
              <span>Esami ({formazioneItems.length})</span>
            </button>
            {esamiExpanded && (
              <div className="mt-3 space-y-1">
                {formazioneItems.map((it) => (
                  <div key={it.id} className="flex items-center justify-between gap-2 text-body-sm">
                    <span className="text-ink truncate">{it.esame}</span>
                    <span className="text-ink-secondary whitespace-nowrap">
                      {it.voto ?? "—"}
                      {it.cfu != null && <span className="text-xs text-ink-tertiary"> · {it.cfu} CFU</span>}
                      <span className="ml-2 text-xs text-success font-medium">verificata</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {(form.livello === "magistrale" || form.formazione_precedente) && (
          <div className="border-t border-border pt-4 space-y-3">
            <p className="text-body-sm font-medium text-ink">Formazione precedente (triennale)</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                placeholder="Università"
                value={form.formazione_precedente?.universita ?? ""}
                onChange={(e) => updateFP("universita", e.target.value)}
                className="px-3 py-2 rounded-md border border-border text-body-sm text-ink focus:outline-none focus:ring-1 focus:ring-petrol/30"
              />
              <input
                type="text"
                placeholder="Corso"
                value={form.formazione_precedente?.corso ?? ""}
                onChange={(e) => updateFP("corso", e.target.value)}
                className="px-3 py-2 rounded-md border border-border text-body-sm text-ink focus:outline-none focus:ring-1 focus:ring-petrol/30"
              />
              <input
                type="text"
                placeholder="Voto di laurea"
                value={form.formazione_precedente?.voto_laurea ?? ""}
                onChange={(e) => updateFP("voto_laurea", e.target.value)}
                className="px-3 py-2 rounded-md border border-border text-body-sm text-ink focus:outline-none focus:ring-1 focus:ring-petrol/30"
              />
              <input
                type="text"
                placeholder="Tema tesi (opzionale)"
                value={form.formazione_precedente?.tema_tesi ?? ""}
                onChange={(e) => updateFP("tema_tesi", e.target.value)}
                className="px-3 py-2 rounded-md border border-border text-body-sm text-ink focus:outline-none focus:ring-1 focus:ring-petrol/30"
              />
            </div>
          </div>
        )}

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
