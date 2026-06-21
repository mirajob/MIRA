import { createServerClient } from "@mira/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function AssociationPublicPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createServerClient();

  const { data: association } = await supabase
    .from("association_profiles")
    .select("*")
    .eq("slug", slug)
    .eq("public_page_status", "published")
    .maybeSingle();

  if (!association) notFound();

  const { data: openCycles } = await supabase
    .from("application_cycles")
    .select("id, title, description, status, opens_at, closes_at, available_roles")
    .eq("association_id", association.id)
    .eq("status", "open")
    .order("closes_at", { ascending: true });

  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader />

      <main className="mx-auto max-w-reading px-6 py-12">
        {/* Header */}
        <div className="flex items-start gap-4 mb-8">
          {association.logo_url ? (
            <img src={association.logo_url} alt="" className="h-16 w-16 rounded-lg object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-navy text-white text-h2 font-semibold">
              {association.name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="font-display text-display-md text-navy">{association.name}</h1>
            {association.category && (
              <p className="text-body text-ink-secondary mt-1">
                {association.category.charAt(0).toUpperCase() + association.category.slice(1).replace("_", " ")}
              </p>
            )}
          </div>
        </div>

        {/* Sectors */}
        {association.sectors?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {association.sectors.map((sector: string) => (
              <span key={sector} className="inline-flex items-center px-3 py-1 rounded-full text-body-sm font-medium bg-navy-50 text-navy">
                {sector}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        {association.short_description && (
          <p className="text-body-lg text-ink-secondary mb-6">
            {association.short_description}
          </p>
        )}
        {association.long_description && (
          <div className="prose text-body text-ink mb-8 whitespace-pre-wrap">
            {association.long_description}
          </div>
        )}

        {/* Links */}
        <div className="flex gap-4 mb-10">
          {association.website_url && (
            <a
              href={association.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700 hover:decoration-2 text-body"
            >
              Sito web
            </a>
          )}
          {association.contact_email && (
            <a
              href={`mailto:${association.contact_email}`}
              className="text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700 hover:decoration-2 text-body"
            >
              Contatto
            </a>
          )}
        </div>

        {/* Open cycles */}
        {openCycles && openCycles.length > 0 ? (
          <div className="space-y-4">
            <h2 className="font-display text-h2 text-navy">Candidature aperte</h2>
            {openCycles.map((cycle) => (
              <div key={cycle.id} className="rounded-lg border border-border bg-white p-6">
                <h3 className="font-sans text-h3 text-navy">{cycle.title}</h3>
                {cycle.description && (
                  <p className="mt-2 text-body text-ink-secondary">{cycle.description}</p>
                )}
                {cycle.closes_at && (
                  <p className="mt-2 text-body-sm text-ink-tertiary">
                    Scadenza: {new Date(cycle.closes_at).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                )}
                <Link
                  href={`/associations/${slug}/apply?cycle=${cycle.id}`}
                  className="mt-4 inline-block bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100"
                >
                  Candidati
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-white p-8 text-center">
            <p className="text-body text-ink-secondary">
              Nessuna candidatura aperta al momento.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
