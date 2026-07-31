"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ASSOCIATION_CATEGORY_ORDER, associationCategoryLabel } from "@mira/domain";

export interface DirectoryAssociation {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  shortDescription: string | null;
  /** Ha almeno un ciclo di candidatura aperto adesso. */
  hasOpenCycle: boolean;
  /** Pagina ancora in bozza: visibile solo all'admin in anteprima. */
  isDraft: boolean;
  /** Etichetta del ruolo se l'utente fa parte del board. */
  roleLabel: string | null;
  /** Etichetta dello stato se l'utente si è già candidato a un ciclo aperto. */
  applicationLabel: string | null;
}

/**
 * Indice delle associazioni di un ateneo: sezioni per ambito, righe compatte.
 *
 * Con oltre cento associazioni una griglia di schede diventa illeggibile, quindi
 * la forma è quella di un indice: si scorre, si filtra per ambito, si cerca per
 * nome. Le associazioni con selezioni aperte sono le uniche a spiccare, perché
 * sono l'unica cosa su cui uno studente può agire subito.
 */
export function AssociationDirectory({ associations }: { associations: DirectoryAssociation[] }) {
  const t = useTranslations("AssociationDirectory");
  const c = useTranslations("AssociationCategories");
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const label = (slug: string) => (c.has(slug) ? c(slug) : associationCategoryLabel(slug));

  const { sections, categoryCounts, openCount } = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const matching = associations.filter((a) => {
      if (!normalized) return true;
      return (
        a.name.toLowerCase().includes(normalized) ||
        (a.shortDescription ?? "").toLowerCase().includes(normalized)
      );
    });

    const counts = new Map<string, number>();
    for (const a of matching) {
      const key = a.category || "other";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const ordered = [...counts.keys()].sort((a, b) => {
      const ia = ASSOCIATION_CATEGORY_ORDER.indexOf(a);
      const ib = ASSOCIATION_CATEGORY_ORDER.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });

    const grouped = ordered
      .filter((key) => !activeCategory || key === activeCategory)
      .map((key) => ({
        key,
        rows: matching
          .filter((a) => (a.category || "other") === key)
          .sort((a, b) => a.name.localeCompare(b.name)),
      }));

    return {
      sections: grouped,
      categoryCounts: counts,
      openCount: matching.filter((a) => a.hasOpenCycle).length,
    };
  }, [associations, query, activeCategory]);

  const chipCategories = [...categoryCounts.keys()].sort((a, b) => {
    const ia = ASSOCIATION_CATEGORY_ORDER.indexOf(a);
    const ib = ASSOCIATION_CATEGORY_ORDER.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  const total = [...categoryCounts.values()].reduce((sum, n) => sum + n, 0);

  return (
    <div>
      {/* Barra di ricerca e filtri: resta agganciata in alto perché la pagina è lunga */}
      <div className="sticky top-0 z-20 -mx-2 bg-paper/95 px-2 pb-3 pt-1 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex items-baseline gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="flex-1 rounded-md border border-border bg-white px-3 py-1.5 text-body-sm text-ink placeholder:text-ink-tertiary focus:border-petrol focus:outline-none"
          />
          <p className="hidden text-eyebrow uppercase text-navy/50 sm:block">
            {t("countSummary", { total, open: openCount })}
          </p>
        </div>

        <div className="mt-2 flex flex-wrap gap-1">
          <FilterChip
            active={activeCategory === null}
            onClick={() => setActiveCategory(null)}
            label={t("allCategories")}
          />
          {chipCategories.map((key) => (
            <FilterChip
              key={key}
              active={activeCategory === key}
              onClick={() => setActiveCategory(activeCategory === key ? null : key)}
              label={label(key)}
              count={categoryCounts.get(key)}
            />
          ))}
        </div>
      </div>

      {sections.length === 0 ? (
        <p className="py-10 text-center text-body-sm text-ink-tertiary">{t("noResults")}</p>
      ) : (
        <div className="space-y-7">
          {sections.map(({ key, rows }) => (
            <section key={key}>
              <div className="mb-1.5 flex items-baseline gap-3">
                <h3 className="text-eyebrow uppercase tracking-wide text-navy">{label(key)}</h3>
                <span className="h-px flex-1 bg-border" />
                <span className="text-eyebrow text-ink-tertiary">{rows.length}</span>
              </div>

              <div className="grid gap-x-6 lg:grid-cols-2">
                {rows.map((a) => (
                  <DirectoryRow key={a.id} association={a} t={t} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-2.5 py-0.5 text-body-sm transition-colors duration-100 ${
        active ? "bg-navy text-white" : "bg-navy-50 text-navy hover:bg-navy-100"
      }`}
    >
      {label}
      {count !== undefined && (
        <span className={active ? "ml-1 text-white/60" : "ml-1 text-navy/45"}>{count}</span>
      )}
    </button>
  );
}

function DirectoryRow({
  association,
  t,
}: {
  association: DirectoryAssociation;
  t: ReturnType<typeof useTranslations<"AssociationDirectory">>;
}) {
  return (
    <Link
      href={`/student/associazioni/${association.slug}`}
      className="group flex items-baseline gap-2 rounded-md border-b border-border/60 px-2 py-2 transition-colors duration-100 hover:bg-white"
    >
      {/* Il pallino segnala l'unica cosa azionabile subito: selezioni aperte */}
      <span
        aria-hidden
        className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
          association.hasOpenCycle ? "bg-petrol" : "bg-transparent"
        }`}
      />

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-body-sm font-medium text-navy group-hover:underline">
            {association.name}
          </span>
          {association.roleLabel && (
            <span className="rounded-full bg-petrol-50 px-1.5 py-0.5 text-xs font-medium text-petrol-700">
              {association.roleLabel}
            </span>
          )}
          {association.isDraft && (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
              {t("draftTag")}
            </span>
          )}
        </span>
        {association.shortDescription && (
          <span className="mt-0.5 block truncate text-body-sm text-ink-tertiary">
            {association.shortDescription}
          </span>
        )}
      </span>

      <span className="shrink-0 text-body-sm">
        {association.applicationLabel ? (
          <span className="text-ink-tertiary">{association.applicationLabel}</span>
        ) : association.hasOpenCycle ? (
          <span className="font-medium text-petrol">{t("openNow")}</span>
        ) : (
          <span className="text-ink-tertiary opacity-0 transition-opacity group-hover:opacity-100">
            →
          </span>
        )}
      </span>
    </Link>
  );
}
