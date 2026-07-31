/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SeededTable, type SeededRow } from "./seeded-table";

interface Props {
  searchParams: Promise<{ uni?: string; stato?: string }>;
}

/**
 * Coda di revisione delle pagine associazione seminate da MIRA: si filtra per ateneo
 * e per stato, si apre la vetrina vera per rileggerla e si pubblica. Finché una
 * pagina è in bozza non esiste per nessun altro utente.
 */
export default async function AdminSeededAssociationsPage({ searchParams }: Props) {
  const ctx = await getUserContext();
  if (!ctx.isMiraAdmin) redirect("/student");

  const { uni, stato } = await searchParams;
  const t = await getTranslations("AdminSeededAssociations");
  const supabase = await createServiceClient();

  const { data: associations, error } = await (supabase.from("association_profiles") as any)
    .select("id, name, slug, university, public_page_status")
    .eq("claim_status", "seeded")
    .order("name");

  if (error) console.error("admin seeded associations query error:", error);

  const all = (associations ?? []) as any[];

  // Il contatore degli interessati si aggrega qui: è il numero che rende concreta la
  // richiesta di rivendicazione al presidente ("ci sono N studenti in attesa").
  const { data: interests } = await (supabase.from("association_interest") as any)
    .select("association_id");

  const interestByAssociation = new Map<string, number>();
  for (const row of (interests ?? []) as any[]) {
    interestByAssociation.set(
      row.association_id,
      (interestByAssociation.get(row.association_id) ?? 0) + 1
    );
  }

  const universities = [...new Set(all.map((a) => a.university).filter(Boolean))].sort(
    (a: string, b: string) => a.localeCompare(b)
  );

  const filtered = all.filter((a) => {
    if (uni && a.university !== uni) return false;
    if (stato === "draft" && a.public_page_status === "published") return false;
    if (stato === "published" && a.public_page_status !== "published") return false;
    return true;
  });

  const rows: SeededRow[] = filtered.map((a) => ({
    id: a.id,
    name: a.name,
    slug: a.slug,
    university: a.university ?? null,
    published: a.public_page_status === "published",
    interestCount: interestByAssociation.get(a.id) ?? 0,
  }));

  const draftCount = all.filter((a) => a.public_page_status !== "published").length;
  const publishedCount = all.length - draftCount;

  function filterHref(next: { uni?: string; stato?: string }) {
    const params = new URLSearchParams();
    const nextUni = "uni" in next ? next.uni : uni;
    const nextStato = "stato" in next ? next.stato : stato;
    if (nextUni) params.set("uni", nextUni);
    if (nextStato) params.set("stato", nextStato);
    const qs = params.toString();
    return qs ? `/admin/associations/seminate?${qs}` : "/admin/associations/seminate";
  }

  function FilterChip({ href, active, label }: { href: string; active: boolean; label: string }) {
    return (
      <Link
        href={href}
        className={`rounded-full px-3 py-1 text-body-sm transition-colors duration-100 ${
          active ? "bg-navy text-white" : "bg-navy-50 text-navy hover:bg-navy-100"
        }`}
      >
        {label}
      </Link>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-eyebrow uppercase text-navy/60">{t("eyebrow")}</p>
        <h1 className="font-display text-h2 text-navy">{t("heading")}</h1>
        <p className="mt-0.5 text-body-sm text-ink-secondary">{t("subhead")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-eyebrow uppercase text-navy/60 mr-1">{t("filterUniversity")}</span>
          <FilterChip href={filterHref({ uni: undefined })} active={!uni} label={t("filterAll")} />
          {universities.map((u: string) => (
            <FilterChip key={u} href={filterHref({ uni: u })} active={uni === u} label={u} />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-eyebrow uppercase text-navy/60 mr-1">{t("filterStatus")}</span>
          <FilterChip href={filterHref({ stato: undefined })} active={!stato} label={t("filterAll")} />
          <FilterChip
            href={filterHref({ stato: "draft" })}
            active={stato === "draft"}
            label={t("filterDraft", { count: draftCount })}
          />
          <FilterChip
            href={filterHref({ stato: "published" })}
            active={stato === "published"}
            label={t("filterPublished", { count: publishedCount })}
          />
        </div>

        {/* La revisione vera si fa sull'elenco come lo vede uno studente, non su
            questa tabella: qui si controlla lo stato, lì si giudica l'insieme. */}
        <Link
          href={
            uni
              ? `/student/associazioni?ateneo=${encodeURIComponent(uni)}`
              : "/student/associazioni"
          }
          className="ml-auto rounded-md bg-navy px-4 py-1.5 text-body-sm text-white transition-colors duration-100 hover:bg-navy-700"
        >
          {t("studentPreviewCta")}
        </Link>

        <Link
          href="/admin/associations"
          className="text-body-sm text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700"
        >
          {t("backToAssociations")}
        </Link>
      </div>

      <SeededTable rows={rows} />
    </div>
  );
}
