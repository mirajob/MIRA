import { createServerClient } from "@mira/supabase/server";
import Link from "next/link";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function AssociationDashboardPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createServerClient();

  const { data: association } = await supabase
    .from("association_profiles")
    .select("*")
    .eq("slug", slug)
    .single();

  const { data: cycles } = await supabase
    .from("application_cycles")
    .select("id, title, status")
    .eq("association_id", association.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: recentApplications } = await supabase
    .from("applications")
    .select("id, status, submitted_at, profiles(full_name)")
    .eq("association_id", association.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: members } = await supabase
    .from("association_memberships")
    .select("id, role")
    .eq("association_id", association.id)
    .eq("status", "active");

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-white p-6">
          <p className="text-eyebrow text-navy/60 uppercase">Cicli attivi</p>
          <p className="mt-2 font-display text-display-md text-navy">
            {cycles?.filter((c) => c.status === "open").length ?? 0}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-white p-6">
          <p className="text-eyebrow text-navy/60 uppercase">Candidature totali</p>
          <p className="mt-2 font-display text-display-md text-navy">
            {recentApplications?.length ?? 0}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-white p-6">
          <p className="text-eyebrow text-navy/60 uppercase">Membri totali</p>
          <p className="mt-2 font-display text-display-md text-navy">
            {members?.length ?? 0}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-sans text-h3 text-navy">Cicli candidatura</h2>
            <Link
              href={`/association/${slug}/cycles/new`}
              className="text-body-sm text-petrol hover:text-petrol-700 transition-colors duration-100"
            >
              + Nuovo ciclo
            </Link>
          </div>
          {!cycles?.length ? (
            <p className="text-body text-ink-secondary">Nessun ciclo ancora creato</p>
          ) : (
            <div className="space-y-2">
              {cycles.map((cycle) => (
                <Link
                  key={cycle.id}
                  href={`/association/${slug}/cycles/${cycle.id}`}
                  className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-navy-50/50 transition-colors duration-100"
                >
                  <span className="text-body text-ink">{cycle.title}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-eyebrow font-medium uppercase ${
                    cycle.status === "open" ? "bg-success-bg text-success"
                    : cycle.status === "draft" ? "bg-navy-50 text-navy-200"
                    : "bg-navy-50 text-ink-tertiary"
                  }`}>
                    {cycle.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-sans text-h3 text-navy">Pagina pubblica</h2>
            <Link
              href={`/association/${slug}/public-page`}
              className="text-body-sm text-petrol hover:text-petrol-700 transition-colors duration-100"
            >
              Modifica
            </Link>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-body-sm text-ink-secondary">Stato</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-eyebrow font-medium uppercase ${
                association.public_page_status === "published" ? "bg-success-bg text-success" : "bg-warning-bg text-warning"
              }`}>
                {association.public_page_status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-body-sm text-ink-secondary">Descrizione</span>
              <span className="text-body-sm text-ink">
                {association.short_description ? "Presente" : "Da completare"}
              </span>
            </div>
            {association.public_page_status === "published" && (
              <Link
                href={`/associations/${slug}`}
                target="_blank"
                className="mt-2 inline-block text-body-sm text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700"
              >
                Vedi pagina pubblica →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
