/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServiceClient } from "@mira/supabase/server";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { CycleEditor } from "./cycle-editor";
import { QuestionBuilder } from "./question-builder";
import { CycleCardFlow } from "./cycle-card-flow";
import { loadCycleCard } from "@/lib/actions/cycle-card";

interface Props {
  params: Promise<{ slug: string; cycleId: string }>;
}

export default async function CycleDetailPage({ params }: Props) {
  const { slug, cycleId } = await params;
  const supabase = await createServiceClient();
  const t = await getTranslations("CycleDetail");
  const locale = await getLocale();
  const dateLocale = locale === "it" ? "it-IT" : "en-US";

  const { data: cycle } = await (supabase.from("application_cycles") as any)
    .select("*")
    .eq("id", cycleId)
    .maybeSingle();

  if (!cycle) notFound();

  // select("*") e non la sola colonna: finche' la migration del flag non e' applicata la
  // colonna non esiste, e chiederla per nome farebbe fallire la query invece di ricadere
  // sul vecchio percorso.
  const { data: association } = await (supabase.from("association_profiles") as any)
    .select("*")
    .eq("slug", slug)
    .single();

  // Associazioni in beta: il ciclo si vede e si modifica come card, in una schermata sola.
  if (association?.beta_dashboard) {
    const { state, error } = await loadCycleCard(cycleId);
    if (error) {
      return (
        <div className="rounded-md border border-error/30 bg-error-bg px-4 py-3">
          <p className="text-body-sm text-error">{error}</p>
        </div>
      );
    }
    if (!state) notFound();
    return <CycleCardFlow initialState={state} />;
  }

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
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium uppercase bg-navy-50 text-ink-tertiary">{t("closedBadge")}</span>
          </div>
          {cycle.description && <p className="text-body text-ink-secondary">{cycle.description}</p>}
          <div className="mt-2 flex gap-4 text-body-sm text-ink-tertiary">
            {cycle.opens_at && <span>{t("openedOn", { date: new Date(cycle.opens_at).toLocaleDateString(dateLocale) })}</span>}
            {cycle.closes_at && <span>{t("closedOn", { date: new Date(cycle.closes_at).toLocaleDateString(dateLocale) })}</span>}
          </div>
        </div>

        {positions.length > 0 && (
          <div>
            <h3 className="font-sans text-h3 text-navy mb-3">{t("positionsHeading")}</h3>
            <div className="space-y-2">
              {positions.map((pos, i) => (
                <div key={i} className="rounded-md border border-border bg-white p-4">
                  <p className="text-body font-medium text-navy">{pos.name}</p>
                  {pos.description && <p className="text-body-sm text-ink-secondary mt-1">{pos.description}</p>}
                  {pos.requirements && <p className="text-body-sm text-ink-tertiary mt-1">{t("requirementsPrefix", { requirements: pos.requirements })}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {(questions ?? []).length > 0 && (
          <div>
            <h3 className="font-sans text-h3 text-navy mb-3">{t("questionsHeading")}</h3>
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
          generalRequirements: (cycle.evaluation_criteria as any)?.general_requirements || "",
        }}
        isOpen={cycle.status === "open"}
      />

      <div>
        <h3 className="font-sans text-h3 text-navy mb-4">{t("customQuestionsHeading")}</h3>
        <p className="text-body-sm text-ink-secondary mb-4">
          {t("customQuestionsSubhead")}
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
