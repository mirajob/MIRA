"use client";

import { useState } from "react";
import { addQuestion, deleteQuestion } from "@/lib/actions/cycles";

interface Question {
  id: string;
  questionText: string;
  questionType: string;
  required: boolean;
  orderIndex: number;
  helperText: string | null;
  options: string[];
}

const QUESTION_TYPES = [
  { value: "short_text", label: "Testo breve" },
  { value: "long_text", label: "Testo lungo" },
  { value: "multiple_choice", label: "Scelta multipla" },
  { value: "checkboxes", label: "Checkbox" },
  { value: "dropdown", label: "Dropdown" },
  { value: "rating_scale", label: "Scala di valutazione" },
  { value: "role_preference", label: "Preferenza ruolo" },
  { value: "availability", label: "Disponibilità" },
  { value: "file_upload", label: "Upload file" },
];

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  QUESTION_TYPES.map(t => [t.value, t.label])
);

const inputClass = "w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200";

export function QuestionBuilder({ cycleId, questions }: { cycleId: string; questions: Question[] }) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState("short_text");

  const needsOptions = ["multiple_choice", "checkboxes", "dropdown"].includes(selectedType);

  async function handleAdd(formData: FormData) {
    setLoading(true);
    setError(null);
    const res = await addQuestion(cycleId, formData);
    if (res.error) { setError(res.error); setLoading(false); return; }
    setShowForm(false);
    setLoading(false);
  }

  async function handleDelete(questionId: string) {
    await deleteQuestion(questionId, cycleId);
  }

  return (
    <div className="space-y-4">
      {questions.length === 0 ? (
        <div className="rounded-lg border border-border bg-white p-8 text-center">
          <p className="text-body text-ink-secondary">Nessuna domanda ancora creata</p>
        </div>
      ) : (
        <div className="space-y-2">
          {questions.map((q, i) => (
            <div key={q.id} className="rounded-lg border border-border bg-white p-4 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-body-sm text-ink-tertiary">{i + 1}.</span>
                  <span className="text-body font-medium text-navy">{q.questionText}</span>
                  {q.required && <span className="text-body-sm text-error">*</span>}
                </div>
                <div className="mt-1 flex gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-eyebrow font-medium bg-navy-50 text-navy uppercase">
                    {TYPE_LABELS[q.questionType] ?? q.questionType}
                  </span>
                  {q.helperText && (
                    <span className="text-body-sm text-ink-tertiary">{q.helperText}</span>
                  )}
                </div>
                {q.options.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {q.options.map((opt, j) => (
                      <span key={j} className="inline-flex items-center px-2 py-0.5 rounded-full text-body-sm bg-petrol-50 text-petrol-700">
                        {opt}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <form action={() => handleDelete(q.id)}>
                <button type="submit" className="text-body-sm text-error hover:text-error/80 transition-colors duration-100">
                  Elimina
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <form action={handleAdd} className="rounded-lg border border-petrol bg-white p-6 space-y-4">
          <h4 className="font-sans text-h3 text-navy">Nuova domanda</h4>

          {error && (
            <div className="rounded-md bg-error-bg p-3 text-body-sm text-error">{error}</div>
          )}

          <label className="block">
            <span className="text-label text-navy mb-2 block">Testo della domanda *</span>
            <input name="questionText" type="text" required placeholder="es. Perché vuoi unirti alla nostra associazione?" className={inputClass} />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-label text-navy mb-2 block">Tipo *</span>
              <select
                name="questionType"
                required
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className={inputClass}
              >
                {QUESTION_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-3 self-end pb-3">
              <input name="required" type="checkbox" value="true" defaultChecked className="h-4 w-4 rounded border-border text-petrol focus:ring-petrol" />
              <span className="text-label text-navy">Obbligatoria</span>
            </label>
          </div>

          {needsOptions && (
            <label className="block">
              <span className="text-label text-navy mb-2 block">Opzioni (una per riga)</span>
              <textarea name="options" rows={4} placeholder="Opzione 1&#10;Opzione 2&#10;Opzione 3" className={`${inputClass} resize-y`} />
            </label>
          )}

          <label className="block">
            <span className="text-label text-navy mb-2 block">Testo di aiuto (opzionale)</span>
            <input name="helperText" type="text" placeholder="Suggerimento per il candidato..." className={inputClass} />
          </label>

          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100 disabled:opacity-40">
              {loading ? "Aggiunta..." : "Aggiungi domanda"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-body-sm text-ink-secondary hover:text-navy transition-colors duration-100 px-4 py-3">
              Annulla
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="bg-transparent text-navy px-4 py-2 rounded-md text-label border border-border hover:border-border-strong hover:bg-navy-50 transition-colors duration-100"
        >
          + Aggiungi domanda
        </button>
      )}
    </div>
  );
}
