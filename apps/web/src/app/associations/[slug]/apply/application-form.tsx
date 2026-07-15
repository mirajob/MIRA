"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { submitApplication } from "@/lib/actions/applications";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Question {
  id: string;
  questionText: string;
  questionType: string;
  required: boolean;
  helperText: string | null;
  options: string[];
}

const inputClass = "w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200";

export function ApplicationForm({ cycleId, positions, questions, slug }: { cycleId: string; positions?: string[]; questions: Question[]; slug: string }) {
  const t = useTranslations("ApplicationForm");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const res = await submitApplication(cycleId, formData);
    if (res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    router.push("/student");
  }

  function renderInput(q: Question) {
    const name = `answer_${q.id}`;

    switch (q.questionType) {
      case "short_text":
        return <input name={name} type="text" required={q.required} className={inputClass} />;

      case "long_text":
      case "case_prompt":
        return <textarea name={name} rows={4} required={q.required} className={`${inputClass} resize-y`} />;

      case "multiple_choice":
      case "dropdown":
        return (
          <select name={name} required={q.required} className={inputClass}>
            <option value="">{t("selectPlaceholder")}</option>
            {q.options.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );

      case "checkboxes":
        return (
          <div className="space-y-2">
            {q.options.map((opt) => (
              <label key={opt} className="flex items-center gap-3">
                <input name={name} type="checkbox" value={opt} className="h-4 w-4 rounded border-border text-petrol focus:ring-petrol" />
                <span className="text-body text-ink">{opt}</span>
              </label>
            ))}
          </div>
        );

      case "rating_scale":
        return (
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className="flex flex-col items-center gap-1">
                <input name={name} type="radio" value={n} required={q.required} className="h-4 w-4 border-border text-petrol focus:ring-petrol" />
                <span className="text-body-sm text-ink-secondary">{n}</span>
              </label>
            ))}
          </div>
        );

      case "availability":
        return <input name={name} type="text" required={q.required} placeholder={t("availabilityPlaceholder")} className={inputClass} />;

      case "role_preference":
        return <input name={name} type="text" required={q.required} placeholder={t("rolePreferencePlaceholder")} className={inputClass} />;

      default:
        return <input name={name} type="text" required={q.required} className={inputClass} />;
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-error-bg p-3 text-body-sm text-error">{error}</div>
      )}

      {positions && positions.length > 0 && (
        <div className="rounded-lg border border-border bg-white p-6">
          <label className="block">
            <span className="text-label text-navy mb-2 block">
              {t("positionQuestionLabel")} <span className="text-error">*</span>
            </span>
            <select name="selected_position" required className={inputClass}>
              <option value="">{t("selectPosition")}</option>
              {positions.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
              <option value="generica">{t("genericApplication")}</option>
            </select>
          </label>
        </div>
      )}

      {questions.length === 0 ? (
        <div className="rounded-lg border border-border bg-white p-6">
          <p className="text-body text-ink-secondary">
            {t("noQuestions")}
          </p>
        </div>
      ) : (
        questions.map((q) => (
          <div key={q.id} className="rounded-lg border border-border bg-white p-6">
            <label className="block">
              <span className="text-label text-navy mb-2 block">
                {q.questionText} {q.required && <span className="text-error">*</span>}
              </span>
              {q.helperText && (
                <p className="text-body-sm text-ink-tertiary mb-3">{q.helperText}</p>
              )}
              {renderInput(q)}
            </label>
          </div>
        ))
      )}

      <div className="rounded-lg border border-border bg-white p-6">
        <label className="flex items-start gap-3">
          <input type="checkbox" required className="mt-1 h-4 w-4 rounded border-border text-petrol focus:ring-petrol" />
          <span className="text-body-sm text-ink-secondary">
            {t.rich("consentText", {
              privacyLink: (chunks) => (
                <Link href="/privacy" target="_blank" className="text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700">
                  {chunks}
                </Link>
              ),
              termsLink: (chunks) => (
                <Link href="/termini" target="_blank" className="text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700">
                  {chunks}
                </Link>
              ),
            })}
          </span>
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100 disabled:opacity-40"
      >
        {loading ? t("submitLoading") : t("submit")}
      </button>
    </form>
  );
}
