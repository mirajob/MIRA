"use client";

import { useState } from "react";
import { updateAssociationProfile, publishAssociationPage } from "@/lib/actions/associations";
import { ASSOCIATION_CATEGORIES } from "@mira/domain";

interface AssociationData {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  long_description: string | null;
  category: string | null;
  website_url: string | null;
  contact_email: string | null;
  sectors: string[] | null;
  public_page_status: string;
}

export function PageEditorForm({ association }: { association: AssociationData }) {
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSave(formData: FormData) {
    setSaving(true);
    setMessage(null);
    const res = await updateAssociationProfile(association.id, formData);
    if (res.error) {
      setMessage({ type: "error", text: res.error });
    } else {
      setMessage({ type: "success", text: "Salvato" });
    }
    setSaving(false);
  }

  async function handlePublish() {
    setPublishing(true);
    setMessage(null);
    const res = await publishAssociationPage(association.id);
    if (res.error) {
      setMessage({ type: "error", text: res.error });
    } else {
      setMessage({ type: "success", text: "Pagina pubblicata!" });
    }
    setPublishing(false);
  }

  const inputClass = "w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200";

  return (
    <div className="space-y-6">
      {message && (
        <div className={`rounded-md p-3 text-body-sm ${message.type === "error" ? "bg-error-bg text-error" : "bg-success-bg text-success"}`}>
          {message.text}
        </div>
      )}

      <form action={handleSave} className="rounded-lg border border-border bg-white p-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-label text-navy mb-2 block">Nome associazione</span>
            <input name="name" type="text" defaultValue={association.name} className={inputClass} />
          </label>

          <label className="block">
            <span className="text-label text-navy mb-2 block">Categoria</span>
            <select name="category" defaultValue={association.category ?? ""} className={inputClass}>
              <option value="">Seleziona</option>
              {ASSOCIATION_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1).replace("_", " ")}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-label text-navy mb-2 block">Sito web</span>
            <input name="websiteUrl" type="url" defaultValue={association.website_url ?? ""} placeholder="https://..." className={inputClass} />
          </label>

          <label className="block">
            <span className="text-label text-navy mb-2 block">Email di contatto</span>
            <input name="contactEmail" type="email" defaultValue={association.contact_email ?? ""} className={inputClass} />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-label text-navy mb-2 block">Settori (separati da virgola)</span>
            <input name="sectors" type="text" defaultValue={association.sectors?.join(", ") ?? ""} placeholder="es. Finance, Consulting, Tech" className={inputClass} />
          </label>
        </div>

        <label className="block">
          <span className="text-label text-navy mb-2 block">Descrizione breve</span>
          <textarea name="shortDescription" rows={2} defaultValue={association.short_description ?? ""} placeholder="Una frase che descrive l'associazione..." className={`${inputClass} resize-none`} />
        </label>

        <label className="block">
          <span className="text-label text-navy mb-2 block">Descrizione completa</span>
          <textarea name="longDescription" rows={8} defaultValue={association.long_description ?? ""} placeholder="Descrizione dettagliata, mission, attività, team..." className={`${inputClass} resize-y`} />
        </label>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100 disabled:opacity-40"
          >
            {saving ? "Salvataggio..." : "Salva modifiche"}
          </button>

          {association.public_page_status !== "published" && (
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing}
              className="bg-cream text-navy px-6 py-3 rounded-md text-label border border-border hover:border-border-strong transition-colors duration-100 disabled:opacity-40"
            >
              {publishing ? "Pubblicazione..." : "Pubblica pagina"}
            </button>
          )}

          {association.public_page_status === "published" && (
            <a
              href={`/associations/${association.slug}`}
              target="_blank"
              className="text-body-sm text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700"
            >
              Vedi pagina pubblica →
            </a>
          )}
        </div>
      </form>
    </div>
  );
}
