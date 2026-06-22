import { createServiceClient } from "@mira/supabase/server";
import { notFound } from "next/navigation";
import { QuestionBuilder } from "./question-builder";

interface Props {
  params: Promise<{ slug: string; cycleId: string }>;
}

export default async function CycleDetailPage({ params }: Props) {
  const { slug, cycleId } = await params;
  const supabase = await createServiceClient();

  const { data: cycle } = await (supabase.from("application_cycles") as any)
    .select("*")
    .eq("id", cycleId)
    .maybeSingle();

  if (!cycle) notFound();

  const { data: questions } = await (supabase.from("application_questions") as any)
    .select("*")
    .eq("application_cycle_id", cycleId)
    .order("order_index");

  const positions = (cycle.available_roles ?? []) as Array<{ name: string; description?: string; requirements?: string }>;

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h2 className="font-display text-h2 text-navy">{cycle.title}</h2>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-eyebrow font-medium uppercase ${
            cycle.status === "open" ? "bg-success-bg text-success"
            : cycle.status === "draft" ? "bg-warning-bg text-warning"
            : "bg-navy-50 text-ink-tertiary"
          }`}>
            {cycle.status}
          </span>
        </div>
        {cycle.description && (
          <p className="text-body text-ink-secondary">{cycle.description}</p>
        )}
        <div className="mt-2 flex gap-4 text-body-sm text-ink-tertiary">
          {cycle.opens_at && <span>Apre: {new Date(cycle.opens_at).toLocaleDateString("it-IT")}</span>}
          {cycle.closes_at && <span>Chiude: {new Date(cycle.closes_at).toLocaleDateString("it-IT")}</span>}
        </div>
      </div>

      {positions.length > 0 && (
        <div>
          <h3 className="font-sans text-h3 text-navy mb-4">Posizioni aperte</h3>
          <div className="space-y-3">
            {positions.map((pos, i) => (
              <div key={i} className="rounded-lg border border-border bg-white p-5">
                <p className="text-body font-medium text-navy">{pos.name}</p>
                {pos.description && (
                  <p className="mt-1 text-body-sm text-ink-secondary">{pos.description}</p>
                )}
                {pos.requirements && (
                  <div className="mt-2">
                    <p className="text-eyebrow text-navy/60 uppercase text-[10px] mb-1">Requisiti (privati)</p>
                    <p className="text-body-sm text-ink-tertiary">{pos.requirements}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="font-sans text-h3 text-navy mb-4">Domande personalizzate</h3>
        <p className="text-body text-ink-secondary mb-4">
          Queste domande verranno mostrate ai candidati durante la candidatura.
        </p>
        <QuestionBuilder
          cycleId={cycleId}
          questions={(questions ?? []).map(q => ({
            id: q.id,
            questionText: q.question_text,
            questionType: q.question_type,
            required: q.required,
            orderIndex: q.order_index,
            helperText: q.helper_text,
            options: q.options as string[],
          }))}
        />
      </div>
    </div>
  );
}
