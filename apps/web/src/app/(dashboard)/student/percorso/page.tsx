import { getUserContext } from "@/lib/auth";
import { createServerClient } from "@mira/supabase/server";
import { redirect } from "next/navigation";
import { GeneratePathwayButton } from "./generate-button";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface PathwayAnalysis {
  generated_at: string;
  profile_overview: string;
  competencies: Array<{ area: string; source: string; description: string }>;
  coherent_directions: Array<{ direction: string; description: string; gaps: string }>;
  association_suggestions: Array<{ name: string; reason: string }>;
  areas_to_strengthen: Array<{ area: string; description: string }>;
  next_steps: string;
}

export default async function PercorsoPage() {
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
        <h1 className="font-display text-h2 text-navy">Il tuo percorso</h1>
        <div className="rounded-lg border border-border bg-white p-6 text-center space-y-3">
          <p className="text-body text-ink">Completa l'onboarding per scoprire il tuo percorso.</p>
          <p className="text-body-sm text-ink-secondary">MIRA analizzerà il tuo profilo, le tue esperienze e i tuoi obiettivi per mostrarti competenze, direzioni e consigli personalizzati.</p>
        </div>
      </div>
    );
  }

  if (!pathway) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-6 space-y-5">
        <h1 className="font-display text-h2 text-navy">Il tuo percorso</h1>
        <div className="rounded-lg border border-border bg-white p-6 text-center space-y-4">
          <p className="text-body text-ink">MIRA è pronta ad analizzare il tuo percorso.</p>
          <p className="text-body-sm text-ink-secondary">Basandosi su transcript, esperienze e conversazioni, MIRA genererà un'analisi personalizzata con competenze, direzioni e consigli.</p>
          <GeneratePathwayButton userId={(ctx.profile as any).id} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-6 space-y-5">
      <h1 className="font-display text-h2 text-navy">Il tuo percorso</h1>

      {/* 1. Profile overview */}
      <div className="rounded-lg border border-border bg-white p-5">
        <h2 className="font-sans text-h3 text-navy mb-3">Cosa emerge dal tuo percorso</h2>
        <p className="text-body text-ink whitespace-pre-wrap">{pathway.profile_overview}</p>
      </div>

      {/* 2. Competencies */}
      {pathway.competencies?.length > 0 && (
        <div className="rounded-lg border border-border bg-white p-5">
          <h2 className="font-sans text-h3 text-navy mb-4">Competenze</h2>
          <div className="space-y-4">
            {pathway.competencies.map((c, i) => (
              <div key={i}>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-label text-navy text-sm">{c.area}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    c.source === "academic" ? "bg-navy-50 text-navy" : "bg-petrol-50 text-petrol-700"
                  }`}>
                    {c.source === "academic" ? "accademica" : "pratica"}
                  </span>
                </div>
                <p className="text-body-sm text-ink-secondary">{c.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Coherent directions */}
      {pathway.coherent_directions?.length > 0 && (
        <div className="rounded-lg border border-border bg-white p-5">
          <h2 className="font-sans text-h3 text-navy mb-4">Direzioni coerenti</h2>
          <div className="space-y-4">
            {pathway.coherent_directions.map((d, i) => (
              <div key={i} className="rounded-md border border-border p-4">
                <h3 className="text-label text-navy text-sm mb-1">{d.direction}</h3>
                <p className="text-body-sm text-ink mb-2">{d.description}</p>
                {d.gaps && (
                  <p className="text-body-sm text-ink-tertiary italic">{d.gaps}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Association suggestions */}
      {pathway.association_suggestions?.length > 0 && (
        <div className="rounded-lg border border-border bg-white p-5">
          <h2 className="font-sans text-h3 text-navy mb-3">Associazioni coerenti</h2>
          <p className="text-body-sm text-ink-secondary mb-3">In base al tuo profilo, queste associazioni potrebbero essere particolarmente interessanti.</p>
          <div className="space-y-3">
            {pathway.association_suggestions.map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="shrink-0 w-7 h-7 rounded-full bg-navy-50 flex items-center justify-center text-xs font-medium text-navy">
                  {a.name.charAt(0)}
                </span>
                <div>
                  <p className="text-body-sm font-medium text-navy">{a.name}</p>
                  <p className="text-body-sm text-ink-secondary">{a.reason}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-body-sm text-ink-tertiary mt-3">Puoi candidarti dalla sezione Associazioni.</p>
        </div>
      )}

      {/* 5. Areas to strengthen */}
      {pathway.areas_to_strengthen?.length > 0 && (
        <div className="rounded-lg border border-border bg-white p-5">
          <h2 className="font-sans text-h3 text-navy mb-4">Cosa rafforzare</h2>
          <div className="space-y-3">
            {pathway.areas_to_strengthen.map((a, i) => (
              <div key={i}>
                <h3 className="text-label text-navy text-sm mb-1">{a.area}</h3>
                <p className="text-body-sm text-ink-secondary">{a.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Next steps */}
      {pathway.next_steps && (
        <div className="rounded-lg border border-border bg-white p-5">
          <h2 className="font-sans text-h3 text-navy mb-3">Prossimi passi consigliati</h2>
          <p className="text-body text-ink whitespace-pre-wrap">{pathway.next_steps}</p>
        </div>
      )}

      {/* Simulations placeholder */}
      <div className="rounded-lg border border-border bg-white p-5">
        <h2 className="font-sans text-h3 text-navy mb-2">Simulazioni</h2>
        <p className="text-body-sm text-ink-secondary">
          Le simulazioni di lavoro arriveranno presto — esercizi realistici che creano evidenze concrete nel tuo profilo.
        </p>
      </div>
    </div>
  );
}
