/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { associationCategoryLabel } from "@mira/domain";

/**
 * Corpo della pagina vetrina di un'associazione, senza chrome attorno: usato sia
 * dalla pagina pubblica /associations/[slug] (visitatori anonimi, con PublicHeader)
 * sia da /student/associazioni/[slug] (utenti loggati, dentro la dashboard con
 * sidebar) — un'unica resa, due cornici.
 */
export async function AssociationPublicProfile({
  association,
  openCycles,
  showManage,
}: {
  association: any;
  openCycles: any[];
  /** true solo per chi ha davvero accesso alla dashboard dell'associazione (board/permessi). */
  showManage: boolean;
}) {
  const t = await getTranslations("AssociationPublicPage");
  const locale = await getLocale();
  const dateLocale = locale === "it" ? "it-IT" : "en-US";
  const slug = association.slug as string;

  return (
    <>
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
              {associationCategoryLabel(association.category)}
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
            {t("websiteLink")}
          </a>
        )}
        {association.contact_email && (
          <a
            href={`mailto:${association.contact_email}`}
            className="text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700 hover:decoration-2 text-body"
          >
            {t("contactLink")}
          </a>
        )}
      </div>

      {/* Open cycles */}
      {showManage ? (
        <div className="rounded-lg border-2 border-petrol/30 bg-petrol-50 p-6 text-center">
          <p className="text-body text-ink mb-3">{t("boardMemberBanner")}</p>
          <Link
            href={`/association/${slug}`}
            className="inline-block bg-petrol text-white px-6 py-3 rounded-md text-label hover:bg-petrol-700 transition-colors duration-100"
          >
            {t("manageCta")}
          </Link>
        </div>
      ) : openCycles && openCycles.length > 0 ? (
        <div className="space-y-4">
          <h2 className="font-display text-h2 text-navy">{t("openCyclesHeading")}</h2>
          {openCycles.map((cycle: any) => {
            const notYetOpen = cycle.opens_at && new Date(cycle.opens_at) > new Date();
            return (
              <div key={cycle.id} className="rounded-lg border border-border bg-white p-6">
                <h3 className="font-sans text-h3 text-navy">{cycle.title}</h3>
                {cycle.description && (
                  <p className="mt-2 text-body text-ink-secondary">{cycle.description}</p>
                )}
                {notYetOpen ? (
                  <p className="mt-2 text-body-sm text-ink-tertiary">
                    {t("opensOn", { date: new Date(cycle.opens_at).toLocaleDateString(dateLocale, { day: "numeric", month: "long", year: "numeric" }) })}
                  </p>
                ) : (
                  <>
                    {cycle.closes_at && (
                      <p className="mt-2 text-body-sm text-ink-tertiary">
                        {t("closesOn", { date: new Date(cycle.closes_at).toLocaleDateString(dateLocale, { day: "numeric", month: "long", year: "numeric" }) })}
                      </p>
                    )}
                    <Link
                      href={`/associations/${slug}/apply?cycle=${cycle.id}`}
                      className="mt-4 inline-block bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 active:scale-[0.98] transition-colors duration-100"
                    >
                      {t("applyCta")}
                    </Link>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-white p-8 text-center">
          <p className="text-body text-ink-secondary">
            {t("noCyclesOpen")}
          </p>
        </div>
      )}
    </>
  );
}
