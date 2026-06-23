/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServiceClient } from "@mira/supabase/server";
import { notFound } from "next/navigation";
import { CycleEditor } from "./cycle-editor";
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

  const { data: association } = await (supabase.from("association_profiles") as any)
    .select("id")
    .eq("slug", slug)
    .single();

  const { data: questions } = await (supabase.from("application_questions") as any)
    .select("*")
    .eq("application_cycle_id", cycleId)
    .order("order_index");

  const positions = (cycle.available_roles ?? []) as Array<{ name: string; description?: string; requirements?: string }>;
  const isClosed = cycle.status === "closed";

  if (isClosed) {
    return (
      <div className="space-y-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-display text-h2 text-navy">{cycle.title}</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium uppercase bg-navy-50 text-ink-tertiary">CHIUSO</span>
          </div>
          {cycle.description && <p className="text-body text-ink-secondary">{cycle.description}</p>}
          <div className="mt-2 flex gap-4 text-body-sm text-ink-tertiary">
            {cycle.opens_at && <span>Aperto: {new Date(cycle.opens_at).toLocaleDateString("it-IT")}</span>}
            {cycle.closes_at && <span>Chiuso: {new Date(cycle.closes_at).toLocaleDateString("it-IT")}</span>}
          </div>
        </div>

        {positions.length > 0 && (
          <div>
            <h3 className="font-sans text-h3 text-navy mb-3">Posizioni</h3>
            <div className="space-y-2">
              {positions.map((pos, i) => (
                <div key={i} className="rounded-md border border-border bg-white p-4">
                  <p className="text-body font-medium text-navy">{pos.name}</p>
                  {pos.description && <p className="text-body-sm text-ink-secondary mt-1">{pos.description}</p>}
                  {pos.requirements && <p className="text-body-sm text-ink-tertiary mt-1">Requisiti: {pos.requirements}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {(questions ?? []).length > 0 && (
          <div>
            <h3 className="font-sans text-h3 text-navy mb-3">Domande</h3>
            <div className="space-y-2">
              {(questions ?? []).map((q: any, i: number) => (
                <div key={i} className="rounded-md border border-border bg-white px-4 py-3">
                  <p className="text-body-sm text-ink">{q.question_text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <CycleEditor
        cycleId={cycleId}
        associationId={association.id}
        slug={slug}
        initialData={{
          title: cycle.title,
          description: cycle.description || "",
          opensAt: cycle.opens_at ? cycle.opens_at.slice(0, 16) : "",
          closesAt: cycle.closes_at ? cycle.closes_at.slice(0, 16) : "",
          positions,
        }}
        isOpen={cycle.status === "open"}
      />

      <div>
        <h3 className="font-sans text-h3 text-navy mb-4">Domande personalizzate</h3>
        <p className="text-body-sm text-ink-secondary mb-4">
          Queste domande verranno mostrate ai candidati durante la candidatura.
        </p>
        <QuestionBuilder
          cycleId={cycleId}
          questions={(questions ?? []).map((q: any) => ({
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
