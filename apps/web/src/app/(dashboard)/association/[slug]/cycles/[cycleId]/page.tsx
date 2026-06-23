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
