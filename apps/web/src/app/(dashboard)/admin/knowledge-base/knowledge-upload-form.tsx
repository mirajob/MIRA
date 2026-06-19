"use client";

import { useState } from "react";
import { uploadKnowledgeDocument } from "@/lib/actions/knowledge-base";

const SOURCE_TYPES = [
  { value: "pdf", label: "PDF" },
  { value: "docx", label: "Word (DOCX)" },
  { value: "txt", label: "Testo" },
  { value: "csv", label: "CSV" },
  { value: "markdown", label: "Markdown" },
  { value: "url", label: "URL sito web" },
  { value: "pasted_text", label: "Testo incollato" },
];

const SCOPES = [
  { value: "global_mira", label: "Globale MIRA" },
  { value: "association_application", label: "Associazioni" },
  { value: "admin_only", label: "Solo admin" },
  { value: "ai_internal_only", label: "Solo AI interno" },
];

const inputClass = "w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200";

export function KnowledgeUploadForm() {
  const [sourceType, setSourceType] = useState("pdf");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ error?: string; success?: boolean } | null>(null);

  const showFileUpload = !["url", "pasted_text"].includes(sourceType);
  const showPastedText = sourceType === "pasted_text";

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setResult(null);
    const res = await uploadKnowledgeDocument(formData);
    setResult(res);
    setLoading(false);
  }

  return (
    <div className="rounded-lg border border-border bg-white p-6">
      <h2 className="font-sans text-h3 text-navy mb-4">Carica documento</h2>

      {result?.error && (
        <div className="mb-4 rounded-md bg-error-bg p-3 text-body-sm text-error">{result.error}</div>
      )}
      {result?.success && (
        <div className="mb-4 rounded-md bg-success-bg p-3 text-body-sm text-success">Documento caricato</div>
      )}

      <form action={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-label text-navy mb-2 block">Titolo *</span>
            <input name="title" type="text" required placeholder="es. Guida associazioni Bocconi" className={inputClass} />
          </label>

          <label className="block">
            <span className="text-label text-navy mb-2 block">Tipo sorgente</span>
            <select name="sourceType" value={sourceType} onChange={(e) => setSourceType(e.target.value)} className={inputClass}>
              {SOURCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="text-label text-navy mb-2 block">Categoria</span>
            <input name="category" type="text" placeholder="es. università, orientamento" className={inputClass} />
          </label>

          <label className="block">
            <span className="text-label text-navy mb-2 block">Visibilità</span>
            <select name="visibilityScope" className={inputClass}>
              {SCOPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
        </div>

        {showFileUpload && (
          <label className="block">
            <span className="text-label text-navy mb-2 block">File</span>
            <input name="file" type="file" accept=".pdf,.docx,.doc,.txt,.csv,.md" className="w-full text-body text-ink file:mr-4 file:rounded-md file:border-0 file:bg-navy file:px-4 file:py-2 file:text-sm file:text-white hover:file:bg-navy-700" />
          </label>
        )}

        {showPastedText && (
          <label className="block">
            <span className="text-label text-navy mb-2 block">Testo</span>
            <textarea name="pastedText" rows={8} placeholder="Incolla il testo qui..." className={`${inputClass} resize-y`} />
          </label>
        )}

        <button type="submit" disabled={loading} className="bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100 disabled:opacity-40">
          {loading ? "Caricamento..." : "Carica documento"}
        </button>
      </form>
    </div>
  );
}
