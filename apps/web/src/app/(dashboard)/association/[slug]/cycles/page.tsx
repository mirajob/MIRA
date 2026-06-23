/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServiceClient } from "@mira/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CycleStatusButton } from "./cycle-status-button";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function CyclesPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createServiceClient();

  const { data: association } = await (supabase.from("association_profiles") as any)
    .select("id, name")
    .eq("slug", slug)
    .maybeSingle();

  if (!association) notFound();

  const now = new Date().toISOString();
  // Auto-close expired cycles
  await (supabase.from("application_cycles") as any)
    .update({ status: "closed" })
    .eq("association_id", association.id)
    .eq("status", "open")
    .lt("closes_at", now);

  const { data: cycles } = await (supabase.from("application_cycles") as any)
    .select("*, application_questions(id), applications(id)")
    .eq("association_id", association.id)
    .order("created_at", { ascending: false });

  const openCycles = (cycles ?? []).filter((c: any) => c.status === "open" || c.status === "draft");
  const closedCycles = (cycles ?? []).filter((c: any) => c.status === "closed");

  function renderCycle(cycle: any) {
    const questionCount = (cycle.application_questions as unknown[])?.length ?? 0;
    const applicationCount = (cycle.applications as unknown[])?.length ?? 0;
    const isOpen = cycle.status === "open";

    return (
      <div key={cycle.id} className={`rounded-lg border bg-white p-5 ${isOpen ? "border-petrol/30" : "border-border"}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-sans text-h3 text-navy">{cycle.title}</h3>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${
                isOpen ? "bg-success-bg text-success" : "bg-navy-50 text-ink-tertiary"
              }`}>
                {cycle.status}
              </span>
            </div>
            <div className="mt-1 flex gap-3 text-body-sm text-ink-tertiary">
              <span>{questionCount} domande</span>
              <span>{applicationCount} candidature</span>
              {cycle.closes_at && <span>Scade: {new Date(cycle.closes_at).toLocaleDateString("it-IT")}</span>}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link
              href={`/association/${slug}/cycles/${cycle.id}`}
              className="px-3 py-1.5 rounded-md text-body-sm text-navy border border-border hover:bg-navy-50 transition-colors"
            >
              {isOpen ? "Modifica" : "Dettagli"}
            </Link>
            {isOpen && (
              <CycleStatusButton associationId={association.id} cycleId={cycle.id} currentStatus={cycle.status} />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-h2 text-navy">Cicli di candidatura</h2>
          <p className="mt-1 text-body text-ink-secondary">Gestisci i cicli di selezione</p>
        </div>
        <Link
          href={`/association/${slug}/cycles/new`}
          className="bg-navy text-white px-5 py-2.5 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100"
        >
          + Nuovo ciclo
        </Link>
      </div>

      {openCycles.length === 0 && closedCycles.length === 0 ? (
        <div className="rounded-lg border border-border bg-white p-8 text-center">
          <p className="text-body text-ink-secondary">Nessun ciclo ancora creato</p>
        </div>
      ) : (
        <>
          {openCycles.length > 0 && (
            <div className="space-y-3">
              {openCycles.map(renderCycle)}
            </div>
          )}

          {closedCycles.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-body-sm text-ink-tertiary hover:text-ink-secondary transition-colors select-none">
                Storico ({closedCycles.length} cicli chiusi)
              </summary>
              <div className="mt-3 space-y-3">
                {closedCycles.map(renderCycle)}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}
