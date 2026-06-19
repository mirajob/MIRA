import { createServerClient } from "@mira/supabase/server";
import Link from "next/link";

export default async function AssociationsPage() {
  const supabase = await createServerClient();

  const { data: associations } = await supabase
    .from("association_profiles")
    .select("id, name, slug, logo_url, category, short_description, sectors, public_page_status")
    .eq("public_page_status", "published")
    .order("name");

  return (
    <div className="min-h-screen bg-paper">
      <header className="h-20 px-6 lg:px-12 flex items-center justify-between border-b border-border bg-white">
        <Link href="/">
          <img src="/brand/mira-lockup.svg" alt="MIRA" className="h-7" />
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-body text-navy hover:text-petrol transition-colors duration-100">
            Accedi
          </Link>
          <Link href="/signup" className="bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 transition-colors duration-100">
            Registrati
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-app px-6 lg:px-12 py-12">
        <div className="mb-10">
          <p className="text-eyebrow text-navy/60 uppercase mb-3">Associazioni</p>
          <h1 className="font-display text-display-lg text-navy">
            Le associazioni su MIRA
          </h1>
          <p className="mt-3 text-body-lg text-ink-secondary max-w-2xl">
            Scopri le associazioni universitarie e candidati direttamente dalla piattaforma.
          </p>
        </div>

        {!associations?.length ? (
          <div className="rounded-lg border border-border bg-white p-12 text-center">
            <p className="text-body text-ink-secondary">
              Nessuna associazione ancora pubblicata. Torna presto!
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {associations.map((assoc) => (
              <Link
                key={assoc.id}
                href={`/associations/${assoc.slug}`}
                className="rounded-lg border border-border bg-white p-6 hover:border-border-strong transition-colors duration-100"
              >
                <div className="flex items-center gap-3 mb-4">
                  {assoc.logo_url ? (
                    <img src={assoc.logo_url} alt="" className="h-10 w-10 rounded-md object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-navy text-white text-label font-semibold">
                      {assoc.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h2 className="font-sans text-h3 text-navy">{assoc.name}</h2>
                    {assoc.category && (
                      <p className="text-body-sm text-ink-tertiary">
                        {assoc.category.charAt(0).toUpperCase() + assoc.category.slice(1).replace("_", " ")}
                      </p>
                    )}
                  </div>
                </div>
                {assoc.short_description && (
                  <p className="text-body text-ink-secondary line-clamp-3">
                    {assoc.short_description}
                  </p>
                )}
                {assoc.sectors?.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1">
                    {assoc.sectors.slice(0, 3).map((sector: string) => (
                      <span key={sector} className="inline-flex items-center px-2 py-0.5 rounded-full text-eyebrow font-medium bg-navy-50 text-navy uppercase">
                        {sector}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
