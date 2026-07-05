import { getUserContext } from "@/lib/auth";
import { createServerClient } from "@mira/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { GeneratePathwayButton } from "./generate-button";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface PathwayAnalysis {
  generated_at: string;
  obiettivo: { stato: string; testo: string };
  cosa_hai_gia: Array<{ fatto: string; evidenza: string }>;
  cosa_manca: string[];
  azioni: Array<{ testo: string; tipo: "candidatura" | "blocco" | "esperienza"; href?: string }>;
}

const STATO_LABELS: Record<string, string> = {
  direzione_chiara: "Direzione chiara",
  ipotesi: "Alcune ipotesi",
  esplorazione: "In esplorazione",
};

export default async function ProssimiPassiPage() {
  const ctx = await getUserContext();
  if (!ctx.isStudent) redirect("/api/auth/redirect");

  const supabase = await createServerClient();
  const { data: student } = await (supabase.from("student_profiles") as any)
    .select("pathway_analysis, onboarding_completed")
    .eq("user_id", (ctx.profile as any).id)
    .single();

  const pathway = student?.pathway_analysis as PathwayAnalysis | null;
  const onboardingDone = student?.onboarding_completed === true;

  if (!onboardingDone) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-6 space-y-5">
        <h1 className="font-display text-h2 text-navy">Prossimi passi</h1>
        <div className="rounded-lg border border-border bg-white p-6 text-center space-y-3">
          <p className="text-body text-ink">Completa l'onboarding per scoprire i tuoi prossimi passi.</p>
        </div>
      </div>
    );
  }

  if (!pathway) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-6 space-y-5">
        <h1 className="font-display text-h2 text-navy">Prossimi passi</h1>
        <div className="rounded-lg border border-border bg-white p-6 text-center space-y-4">
          <p className="text-body text-ink">MIRA è pronta ad analizzare la tua card.</p>
          <GeneratePathwayButton userId={(ctx.profile as any).id} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-h2 text-navy">Prossimi passi</h1>
        <GeneratePathwayButton userId={(ctx.profile as any).id} isRegenerate />
      </div>

      {/* 1. Obiettivo */}
      <div className="rounded-lg border border-border bg-white p-5">
        <p className="text-eyebrow text-navy/60 uppercase text-[10px] mb-2">Il tuo obiettivo</p>
        <span className="text-xs px-2 py-0.5 rounded-full border border-border text-ink-secondary">
          {STATO_LABELS[pathway.obiettivo?.stato] ?? pathway.obiettivo?.stato}
        </span>
        <p className="text-body text-ink mt-2">{pathway.obiettivo?.testo}</p>
      </div>

      {/* 2. Cosa hai già */}
      {pathway.cosa_hai_gia?.length > 0 && (
        <div className="rounded-lg border border-border bg-white p-5">
          <h2 className="font-sans text-h3 text-navy mb-3">Cosa hai già</h2>
          <div className="space-y-2">
            {pathway.cosa_hai_gia.map((c, i) => (
              <div key={i}>
                <p className="text-body-sm text-ink">{c.fatto}</p>
                <p className="text-xs text-ink-tertiary">— {c.evidenza}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Cosa ti manca */}
      {pathway.cosa_manca?.length > 0 && (
        <div className="rounded-lg border border-border bg-white p-5">
          <h2 className="font-sans text-h3 text-navy mb-3">Cosa ti manca</h2>
          <ul className="space-y-1">
            {pathway.cosa_manca.map((g, i) => (
              <li key={i} className="text-body-sm text-ink">• {g}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 4. Azioni */}
      {pathway.azioni?.length > 0 && (
        <div className="rounded-lg border border-border bg-white p-5">
          <h2 className="font-sans text-h3 text-navy mb-3">Azioni</h2>
          <div className="space-y-2">
            {pathway.azioni.map((a, i) =>
              a.href ? (
                <Link
                  key={i}
                  href={a.href}
                  className="block text-body-sm text-petrol hover:text-petrol-700 underline underline-offset-2 decoration-1"
                >
                  {a.testo} →
                </Link>
              ) : (
                <p key={i} className="text-body-sm text-ink">• {a.testo}</p>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
