"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { completeStudentProfile } from "@/lib/actions/complete-profile";
import { UniversityCombobox } from "@/components/university-combobox";

const DEGREE_LEVEL_VALUES = ["triennale", "magistrale", "ciclo_unico"] as const;

/**
 * Lo step subito dopo l'accesso con Google: due campi, niente di più. Il dispatcher
 * /api/auth/redirect manda qui chi non ha ancora un'università, e da qui si prosegue
 * dritti sulla card.
 */
export default function CompleteProfilePage() {
  const t = useTranslations("CompleteProfilePage");
  const router = useRouter();

  const [university, setUniversity] = useState("");
  const [degreeLevel, setDegreeLevel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!university || !degreeLevel) {
      setError(t("selectBoth"));
      return;
    }

    setLoading(true);
    const result = await completeStudentProfile({ university, degreeLevel });
    if (result.error) {
      setError(t("saveFailed"));
      setLoading(false);
      return;
    }

    router.push("/student/onboarding");
    router.refresh();
  }

  const inputClass =
    "w-full px-4 py-3 rounded-md bg-white border border-border text-body text-ink placeholder:text-ink-tertiary hover:border-border-strong focus:outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/20 transition-colors duration-200";

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      <div className="space-y-4 rounded-lg border border-border bg-white p-6">
        <div className="space-y-1">
          {/* Solo il titolo: i due campi si spiegano da soli, e la riga di sotto
              raccontava il funzionamento interno a chi vuole solo entrare. */}
          <h2 className="font-display text-h2 text-navy">{t("heading")}</h2>
        </div>

        {error && <div className="rounded-md bg-error-bg p-3 text-body-sm text-error">{error}</div>}

        <label className="block">
          <span className="text-label text-navy mb-2 block">{t("universityLabel")}</span>
          <UniversityCombobox value={university} onChange={setUniversity} inputClassName={inputClass} />
        </label>

        <label className="block">
          <span className="text-label text-navy mb-2 block">{t("degreeLevelLabel")}</span>
          <select
            required
            value={degreeLevel}
            onChange={(e) => setDegreeLevel(e.target.value)}
            className={inputClass}
          >
            <option value="">{t("degreeLevelPlaceholder")}</option>
            {DEGREE_LEVEL_VALUES.map((value) => (
              <option key={value} value={value}>
                {t(`degreeLevels.${value}`)}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-navy px-6 py-3 text-label text-white transition-colors duration-100 hover:bg-navy-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? t("submitLoading") : t("submit")}
        </button>
      </div>
    </form>
  );
}
