"use client";

import { useState } from "react";
import { testTranscriptGemini, testCvGemini, type TranscriptTestResult, type CvTestResult } from "@/lib/actions/ai-test";

// Prezzi per milione di token (ingresso/uscita), tariffa standard, da
// ai.google.dev/gemini-api/docs/pricing letta il 2026-08-01. L'alias -latest oggi risolve
// su Flash 3.6, la più cara: le versioni pinnate servono a vedere se questo account può
// chiamarle e se leggono il libretto altrettanto bene, a un quinto del costo.
const MODELS = [
  { value: "gemini-flash-latest", label: "Gemini Flash (in uso oggi) · 1.50/7.50" },
  { value: "gemini-pro-latest", label: "Gemini Pro (accurato)" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash · 0.30/2.50" },
  { value: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite · 0.30/2.50" },
  { value: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite · 0.25/1.50" },
];

const DEFAULT_MODEL = "gemini-flash-latest";

const fileInputClass =
  "w-full text-body-sm text-ink file:mr-4 file:rounded-md file:border-0 file:bg-navy file:px-4 file:py-2 file:text-sm file:text-white hover:file:bg-navy-700";
const selectClass =
  "px-3 py-2 rounded-md bg-white border border-border text-body-sm text-ink focus:outline-none focus:border-petrol";

function Timing({
  ms,
  model,
  cost,
  tokens,
  viaText,
}: {
  ms: number;
  model: string;
  cost?: number | null;
  tokens?: string;
  viaText?: boolean;
}) {
  const s = (ms / 1000).toFixed(1);
  const slow = ms > 15000;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
          slow ? "bg-warning-bg text-warning" : "bg-success-bg text-success"
        }`}
      >
        ⏱ {s}s · {model.replace("gemini-", "").replace("-latest", "")}
      </span>
      {tokens && (
        <span className="rounded-full bg-navy-50 px-3 py-1 text-xs text-navy">
          {tokens}
          {cost != null && ` · $${cost.toFixed(5)}`}
        </span>
      )}
      {viaText && (
        <span className="rounded-full bg-petrol-50 px-3 py-1 text-xs text-petrol-700">letto dal testo estratto</span>
      )}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-white p-6">
      <h2 className="font-sans text-h3 text-navy mb-4">{title}</h2>
      {children}
    </div>
  );
}

export function AiTestClient() {
  return (
    <div className="mx-auto max-w-3xl px-2 py-2 space-y-6">
      <div>
        <p className="text-label uppercase tracking-wide text-ink-tertiary">Dev · AI Test</p>
        <h1 className="font-display text-h2 text-navy">Test parsing con Gemini</h1>
        <p className="mt-1 text-body-sm text-ink-secondary">
          Banco di prova isolato: carica un libretto o un CV, guarda l&apos;output e il tempo impiegato.
          Non scrive nulla su nessun profilo — serve solo per confrontare Gemini con il parser attuale.
        </p>
      </div>

      <TranscriptSection />
      <CvSection />
    </div>
  );
}

function TranscriptSection() {
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TranscriptTestResult | null>(null);

  async function run(formData: FormData) {
    formData.set("model", model);
    setLoading(true);
    setResult(null);
    setResult(await testTranscriptGemini(formData));
    setLoading(false);
  }

  return (
    <Section title="1 · Libretto (transcript)">
      <form action={run} className="space-y-3">
        <input name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" required className={fileInputClass} />
        <div className="flex items-center gap-3">
          <select value={model} onChange={(e) => setModel(e.target.value)} className={selectClass}>
            {MODELS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={loading}
            className="bg-navy text-white px-5 py-2 rounded-md text-body-sm font-medium hover:bg-navy-700 active:scale-[0.98] transition disabled:opacity-40"
          >
            {loading ? "Analizzo…" : "Analizza libretto"}
          </button>
        </div>
      </form>

      {result && !result.ok && (
        <div className="mt-4 rounded-md bg-error-bg p-3 text-body-sm text-error">{result.error}</div>
      )}
      {result && result.ok && <TranscriptOutput result={result} />}
    </Section>
  );
}

function TranscriptOutput({ result }: { result: Extract<TranscriptTestResult, { ok: true }> }) {
  const p = result.parsed;
  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-sans text-body font-semibold text-navy">{p.degree_program || "—"}</p>
          <p className="text-body-sm text-ink-secondary">
            {[p.university_name, p.degree_level].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        <Timing
          ms={result.elapsedMs}
          model={result.model}
          cost={result.cost}
          tokens={result.tokens}
          viaText={result.viaText}
        />
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <Stat label="Media ponderata" value={p.weighted_average != null ? `${p.weighted_average.toFixed(2)}/30` : "—"} />
        <Stat label="Esami" value={String(p.courses.length)} />
        <Stat label="CFU totali" value={String(p.total_credits)} />
        <Stat label="CFU con voto" value={String(p.graded_credits)} />
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-body-sm">
          <thead>
            <tr className="bg-navy-50 text-left text-xs text-ink-secondary">
              <th className="px-3 py-2 font-medium">Esame</th>
              <th className="px-3 py-2 font-medium">Voto</th>
              <th className="px-3 py-2 font-medium">CFU</th>
              <th className="px-3 py-2 font-medium">Anno</th>
            </tr>
          </thead>
          <tbody>
            {p.courses.map((c, i) => (
              <tr key={i} className="border-t border-border">
                <td className="px-3 py-2 text-ink">{c.course_name}</td>
                <td className="px-3 py-2 text-navy font-medium">{c.grade}</td>
                <td className="px-3 py-2 text-ink-secondary">{c.credits}</td>
                <td className="px-3 py-2 text-ink-tertiary">{c.academic_year || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <RawJson data={p} />
    </div>
  );
}

function CvSection() {
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CvTestResult | null>(null);

  async function run(formData: FormData) {
    formData.set("model", model);
    setLoading(true);
    setResult(null);
    setResult(await testCvGemini(formData));
    setLoading(false);
  }

  return (
    <Section title="2 · CV">
      <form action={run} className="space-y-3">
        <input name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" required className={fileInputClass} />
        <div className="flex items-center gap-3">
          <select value={model} onChange={(e) => setModel(e.target.value)} className={selectClass}>
            {MODELS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={loading}
            className="bg-navy text-white px-5 py-2 rounded-md text-body-sm font-medium hover:bg-navy-700 active:scale-[0.98] transition disabled:opacity-40"
          >
            {loading ? "Analizzo…" : "Analizza CV"}
          </button>
        </div>
      </form>

      {result && !result.ok && (
        <div className="mt-4 rounded-md bg-error-bg p-3 text-body-sm text-error">{result.error}</div>
      )}
      {result && result.ok && <CvOutput result={result} />}
    </Section>
  );
}

function CvOutput({ result }: { result: Extract<CvTestResult, { ok: true }> }) {
  const p = result.parsed;
  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-end">
        <Timing
          ms={result.elapsedMs}
          model={result.model}
          cost={result.cost}
          tokens={result.tokens}
          viaText={result.viaText}
        />
      </div>

      {p.raw_text_summary && (
        <p className="rounded-md bg-navy-50 p-3 text-body-sm text-ink-secondary italic">{p.raw_text_summary}</p>
      )}

      <div>
        <p className="text-label uppercase tracking-wide text-ink-tertiary mb-2">Esperienze ({p.experiences.length})</p>
        <div className="space-y-2">
          {p.experiences.map((e, i) => (
            <div key={i} className="rounded-md border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-sans text-body-sm font-semibold text-navy">
                  {e.title} <span className="font-normal text-ink-secondary">@ {e.organization}</span>
                </p>
                <span className="shrink-0 rounded-full bg-petrol-50 px-2 py-0.5 text-xs text-petrol-700">{e.type}</span>
              </div>
              {(e.start_date || e.end_date) && (
                <p className="text-xs text-ink-tertiary mt-0.5">{[e.start_date, e.end_date].filter(Boolean).join(" – ")}</p>
              )}
              {e.description && <p className="text-body-sm text-ink-secondary mt-1">{e.description}</p>}
            </div>
          ))}
        </div>
      </div>

      {p.skills.length > 0 && (
        <div>
          <p className="text-label uppercase tracking-wide text-ink-tertiary mb-2">Competenze</p>
          <div className="flex flex-wrap gap-1.5">
            {p.skills.map((s, i) => (
              <span key={i} className="rounded-full bg-navy-50 px-2 py-0.5 text-xs text-navy">{s}</span>
            ))}
          </div>
        </div>
      )}

      {p.languages.length > 0 && (
        <div>
          <p className="text-label uppercase tracking-wide text-ink-tertiary mb-2">Lingue</p>
          <div className="flex flex-wrap gap-1.5">
            {p.languages.map((l, i) => (
              <span key={i} className="rounded-full bg-navy-50 px-2 py-0.5 text-xs text-navy">
                {l.language} · {l.level}
              </span>
            ))}
          </div>
        </div>
      )}

      <RawJson data={p} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-md bg-navy-50 px-3 py-1.5">
      <span className="text-ink-tertiary">{label}: </span>
      <span className="font-medium text-navy">{value}</span>
    </span>
  );
}

function RawJson({ data }: { data: unknown }) {
  const [open, setOpen] = useState(false);
  return (
    <details open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary className="cursor-pointer text-body-sm text-petrol underline underline-offset-2">
        {open ? "Nascondi" : "Mostra"} JSON grezzo
      </summary>
      <pre className="mt-2 max-h-96 overflow-auto rounded-md bg-navy-900 p-3 text-xs text-navy-50">
        {JSON.stringify(data, null, 2)}
      </pre>
    </details>
  );
}
