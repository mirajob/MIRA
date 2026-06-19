import { createServerClient } from "@mira/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CycleStatusButton } from "./cycle-status-button";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function CyclesPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createServerClient();

  const { data: association } = await supabase
    .from("association_profiles")
    .select("id, name")
    .eq("slug", slug)
    .maybeSingle();

  if (!association) notFound();

  const { data: cycles } = await supabase
    .from("application_cycles")
    .select("*, application_questions(id), applications(id)")
    .eq("association_id", association.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-h2 text-navy">Cicli di candidatura</h2>
          <p className="mt-1 text-body text-ink-secondary">Gestisci i cicli di selezione</p>
        </div>
        <Link
          href={`/association/${slug}/cycles/new`}
          className="bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100"
        >
          + Nuovo ciclo
        </Link>
      </div>

      {!cycles?.length ? (
        <div className="rounded-lg border border-border bg-white p-8 text-center">
          <p className="text-body text-ink-secondary">Nessun ciclo ancora creato</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cycles.map((cycle) => {
            const questionCount = (cycle.application_questions as unknown[])?.length ?? 0;
            const applicationCount = (cycle.applications as unknown[])?.length ?? 0;

            return (
              <div key={cycle.id} className="rounded-lg border border-border bg-white p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-sans text-h3 text-navy">{cycle.title}</h3>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-eyebrow font-medium uppercase ${
                        cycle.status === "open" ? "bg-success-bg text-success"
                        : cycle.status === "draft" ? "bg-warning-bg text-warning"
                        : cycle.status === "closed" ? "bg-navy-50 text-ink-tertiary"
                        : "bg-navy-50 text-ink-tertiary"
                      }`}>
                        {cycle.status}
                      </span>
                    </div>
                    {cycle.description && (
                      <p className="mt-1 text-body text-ink-secondary">{cycle.description}</p>
                    )}
                    <div className="mt-2 flex gap-4 text-body-sm text-ink-tertiary">
                      <span>{questionCount} domande</span>
                      <span>{applicationCount} candidature</span>
                      {cycle.closes_at && (
                        <span>Scade: {new Date(cycle.closes_at).toLocaleDateString("it-IT")}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/association/${slug}/cycles/${cycle.id}`}
                      className="bg-transparent text-navy px-4 py-2 rounded-md text-label border border-border hover:border-border-strong hover:bg-navy-50 transition-colors duration-100"
                    >
                      Modifica
                    </Link>
                    <CycleStatusButton
                      associationId={association.id}
                      cycleId={cycle.id}
                      currentStatus={cycle.status}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
