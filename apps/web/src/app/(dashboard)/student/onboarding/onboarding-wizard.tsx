"use client";

import { useState } from "react";
import { saveOnboardingStep, completeOnboarding, uploadTranscript } from "@/lib/actions/onboarding";
import { useRouter } from "next/navigation";

interface StudentData {
  degreeProgram: string;
  degreeLevel: string;
  currentYear: number | null;
  graduationYear: number | null;
  interests: string[];
  goals: string[];
  transcriptUploaded: boolean;
  onboardingAnswers: Record<string, string>;
}

const STEPS = ["Dati accademici", "Libretto", "Profilo", "Conferma"];

const inputClass = "w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200";

export function OnboardingWizard({ student }: { student: StudentData }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcriptDone, setTranscriptDone] = useState(student.transcriptUploaded);
  const router = useRouter();

  async function handleBasics(formData: FormData) {
    setLoading(true);
    setError(null);
    formData.set("step", "basics");
    const res = await saveOnboardingStep(formData);
    if (res.error) { setError(res.error); setLoading(false); return; }
    setStep(1);
    setLoading(false);
  }

  async function handleTranscript(formData: FormData) {
    setLoading(true);
    setError(null);
    const res = await uploadTranscript(formData);
    if (res.error) { setError(res.error); setLoading(false); return; }
    setTranscriptDone(true);
    setStep(2);
    setLoading(false);
  }

  async function handleProfile(formData: FormData) {
    setLoading(true);
    setError(null);
    formData.set("step", "profile");
    const res = await saveOnboardingStep(formData);
    if (res.error) { setError(res.error); setLoading(false); return; }
    setStep(3);
    setLoading(false);
  }

  async function handleComplete() {
    setLoading(true);
    setError(null);
    const res = await completeOnboarding();
    if (res.error) { setError(res.error); setLoading(false); return; }
    router.push("/student");
    router.refresh();
  }

  return (
    <div>
      {/* Step indicator */}
      <div className="flex gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex-1">
            <div className={`h-1 rounded-full mb-2 ${i <= step ? "bg-petrol" : "bg-navy-100"}`} />
            <p className={`text-eyebrow uppercase ${i <= step ? "text-navy" : "text-ink-tertiary"}`}>
              {label}
            </p>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-error-bg p-3 text-body-sm text-error">{error}</div>
      )}

      {/* Step 0: Basics */}
      {step === 0 && (
        <form action={handleBasics} className="rounded-lg border border-border bg-white p-6 space-y-4">
          <h2 className="font-sans text-h3 text-navy">Dati accademici</h2>

          <label className="block">
            <span className="text-label text-navy mb-2 block">Corso di laurea *</span>
            <input name="degreeProgram" type="text" required defaultValue={student.degreeProgram} placeholder="es. Economics and Management" className={inputClass} />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-label text-navy mb-2 block">Livello *</span>
              <select name="degreeLevel" required defaultValue={student.degreeLevel} className={inputClass}>
                <option value="">Seleziona</option>
                <option value="triennale">Triennale</option>
                <option value="magistrale">Magistrale</option>
                <option value="ciclo_unico">Ciclo unico</option>
                <option value="phd">PhD</option>
              </select>
            </label>
            <label className="block">
              <span className="text-label text-navy mb-2 block">Anno corrente *</span>
              <select name="currentYear" required defaultValue={student.currentYear?.toString() ?? ""} className={inputClass}>
                <option value="">Seleziona</option>
                <option value="1">1° anno</option>
                <option value="2">2° anno</option>
                <option value="3">3° anno</option>
                <option value="4">4° anno</option>
                <option value="5">5° anno</option>
                <option value="6">Fuori corso</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-label text-navy mb-2 block">Anno di laurea previsto</span>
            <input name="graduationYear" type="number" min="2024" max="2035" defaultValue={student.graduationYear ?? ""} className={inputClass} />
          </label>

          <button type="submit" disabled={loading} className="bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100 disabled:opacity-40">
            {loading ? "Salvataggio..." : "Continua"}
          </button>
        </form>
      )}

      {/* Step 1: Transcript */}
      {step === 1 && (
        <div className="rounded-lg border border-border bg-white p-6 space-y-4">
          <h2 className="font-sans text-h3 text-navy">Carica il libretto</h2>
          <p className="text-body text-ink-secondary">
            Carica il tuo libretto universitario (PDF o immagine, max 10MB).
            I dati estratti verranno usati per il tuo profilo accademico.
          </p>

          {transcriptDone ? (
            <div className="rounded-md bg-success-bg p-4 text-body-sm text-success">
              Libretto caricato con successo.
            </div>
          ) : (
            <form action={handleTranscript}>
              <label className="block">
                <span className="text-label text-navy mb-2 block">File libretto *</span>
                <input name="file" type="file" required accept=".pdf,.png,.jpg,.jpeg" className="w-full text-body text-ink file:mr-4 file:rounded-md file:border-0 file:bg-navy file:px-4 file:py-2 file:text-sm file:text-white hover:file:bg-navy-700" />
              </label>
              <button type="submit" disabled={loading} className="mt-4 bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100 disabled:opacity-40">
                {loading ? "Caricamento..." : "Carica"}
              </button>
            </form>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep(0)} className="text-body-sm text-ink-secondary hover:text-navy transition-colors duration-100">
              ← Indietro
            </button>
            <button onClick={() => setStep(2)} className="text-body-sm text-petrol hover:text-petrol-700 transition-colors duration-100">
              {transcriptDone ? "Continua →" : "Salta per ora →"}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Profile */}
      {step === 2 && (
        <form action={handleProfile} className="rounded-lg border border-border bg-white p-6 space-y-4">
          <h2 className="font-sans text-h3 text-navy">Parlaci di te</h2>

          <label className="block">
            <span className="text-label text-navy mb-2 block">Interessi (separati da virgola)</span>
            <input name="interests" type="text" defaultValue={student.interests.join(", ")} placeholder="es. Finance, Tech, Consulting" className={inputClass} />
          </label>

          <label className="block">
            <span className="text-label text-navy mb-2 block">Obiettivi professionali (separati da virgola)</span>
            <input name="goals" type="text" defaultValue={student.goals.join(", ")} placeholder="es. Investment Banking, Product Management" className={inputClass} />
          </label>

          <label className="block">
            <span className="text-label text-navy mb-2 block">Esperienze precedenti</span>
            <textarea name="previousExperiences" rows={3} defaultValue={student.onboardingAnswers.previous_experiences ?? ""} placeholder="Racconta le tue esperienze passate..." className={`${inputClass} resize-y`} />
          </label>

          <label className="block">
            <span className="text-label text-navy mb-2 block">Motivazione per le associazioni</span>
            <textarea name="associationMotivation" rows={3} defaultValue={student.onboardingAnswers.association_motivation ?? ""} placeholder="Perché vuoi entrare in un'associazione?" className={`${inputClass} resize-y`} />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-label text-navy mb-2 block">Stile di lavoro preferito</span>
              <input name="workingStyle" type="text" defaultValue={student.onboardingAnswers.working_style ?? ""} placeholder="es. Collaborativo, Analitico..." className={inputClass} />
            </label>
            <label className="block">
              <span className="text-label text-navy mb-2 block">Disponibilità settimanale</span>
              <input name="availability" type="text" defaultValue={student.onboardingAnswers.availability ?? ""} placeholder="es. 10-15 ore" className={inputClass} />
            </label>
            <label className="block">
              <span className="text-label text-navy mb-2 block">Lingue</span>
              <input name="languages" type="text" defaultValue={student.onboardingAnswers.languages ?? ""} placeholder="es. Italiano, Inglese, Francese" className={inputClass} />
            </label>
            <label className="block">
              <span className="text-label text-navy mb-2 block">Competenze</span>
              <input name="skills" type="text" defaultValue={student.onboardingAnswers.skills ?? ""} placeholder="es. Excel, Python, Financial Modeling" className={inputClass} />
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setStep(1)} className="text-body-sm text-ink-secondary hover:text-navy transition-colors duration-100">
              ← Indietro
            </button>
            <button type="submit" disabled={loading} className="bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100 disabled:opacity-40">
              {loading ? "Salvataggio..." : "Continua"}
            </button>
          </div>
        </form>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && (
        <div className="rounded-lg border border-border bg-white p-6 space-y-4">
          <h2 className="font-sans text-h3 text-navy">Tutto pronto!</h2>
          <p className="text-body text-ink-secondary">
            Il tuo profilo base è completo. Potrai sempre modificarlo in seguito.
          </p>
          <div className="space-y-2 text-body-sm">
            <div className="flex gap-2">
              <span className="text-success">✓</span>
              <span className="text-ink">Dati accademici compilati</span>
            </div>
            <div className="flex gap-2">
              <span className={transcriptDone ? "text-success" : "text-warning"}>
                {transcriptDone ? "✓" : "—"}
              </span>
              <span className="text-ink">
                {transcriptDone ? "Libretto caricato" : "Libretto non caricato (opzionale)"}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-success">✓</span>
              <span className="text-ink">Profilo personale compilato</span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep(2)} className="text-body-sm text-ink-secondary hover:text-navy transition-colors duration-100">
              ← Indietro
            </button>
            <button onClick={handleComplete} disabled={loading} className="bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100 disabled:opacity-40">
              {loading ? "Completamento..." : "Completa onboarding"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
