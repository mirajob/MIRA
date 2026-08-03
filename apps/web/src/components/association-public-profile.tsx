/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { BackLink } from "@/components/page-bar";
import { associationCategoryLabel } from "@mira/domain";
import { APP_TIME_ZONE } from "@/lib/format-date";

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
  backHref,
}: {
  association: any;
  openCycles: any[];
  /** true solo per chi ha davvero accesso alla dashboard dell'associazione (board/permessi). */
  showManage: boolean;
  /** Dove torna il link "tutte le associazioni": l'elenco cambia fra vista studente e pagina pubblica. */
  backHref?: string;
}) {
  const t = await getTranslations("AssociationPublicPage");
  const locale = await getLocale();
  const dateLocale = locale === "it" ? "it-IT" : "en-US";
  const slug = association.slug as string;

  return (
    <>
      {/* Con un elenco di oltre cento associazioni si entra e si esce di continuo:
          senza questo si torna indietro solo dal menu laterale. */}
      {backHref && (
        <div className="mb-3">
          <BackLink href={backHref} label={t("backToDirectory")} />
        </div>
      )}

      {/* Senza logo non mettiamo un segnaposto con l'iniziale: una lettera dentro
          un quadrato somiglia a un logo vero e non lo e'. Meglio il solo nome,
          finche' l'associazione non carica il suo. */}
      <div className="mb-4 rounded-lg border border-border bg-white p-6">
        <div className="flex items-start gap-4">
          {association.logo_url && (
            <img src={association.logo_url} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
          )}
          <div className="min-w-0">
            <h1 className="text-body-lg font-semibold text-navy">{association.name}</h1>
            {association.category && (
              <p className="text-body-sm text-ink-tertiary">
                {associationCategoryLabel(association.category)}
              </p>
            )}
          </div>
        </div>

        {association.sectors?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {association.sectors.map((sector: string) => (
              <span key={sector} className="inline-flex items-center rounded-full bg-navy-50 px-2.5 py-0.5 text-body-sm text-navy">
                {sector}
              </span>
            ))}
          </div>
        )}

        {association.short_description && (
          <p className="mt-4 text-body text-ink-secondary">{association.short_description}</p>
        )}
        {association.long_description && (
          <div className="mt-3 whitespace-pre-wrap text-body-sm text-ink">
            {association.long_description}
          </div>
        )}

        {(association.website_url || association.contact_email) && (
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-border pt-3 text-body-sm">
            {association.website_url && (
              <a
                href={association.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-petrol hover:underline"
              >
                {t("websiteLink")}
              </a>
            )}
            {association.contact_email && (
              <a href={`mailto:${association.contact_email}`} className="text-petrol hover:underline">
                {t("contactLink")}
              </a>
            )}
          </div>
        )}
      </div>

      {/* Open cycles */}
      {showManage ? (
        <div className="rounded-lg border border-petrol/30 bg-petrol-50 p-4">
          <p className="mb-3 text-body-sm text-ink">{t("boardMemberBanner")}</p>
          <Link
            href={`/association/${slug}`}
            className="inline-block rounded-md bg-petrol px-4 py-1.5 text-body-sm text-white transition-colors duration-100 hover:bg-petrol-700"
          >
            {t("manageCta")}
          </Link>
        </div>
      ) : openCycles && openCycles.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-body font-medium text-navy">{t("openCyclesHeading")}</h2>
          {openCycles.map((cycle: any) => {
            const notYetOpen = cycle.opens_at && new Date(cycle.opens_at) > new Date();
            return (
              <div key={cycle.id} className="rounded-lg border border-border bg-white p-5">
                <h3 className="text-body font-medium text-navy">{cycle.title}</h3>
                {cycle.description && (
                  <p className="mt-1 text-body-sm text-ink-secondary">{cycle.description}</p>
                )}
                {notYetOpen ? (
                  <p className="mt-2 text-body-sm text-ink-tertiary">
                    {t("opensOn", { date: new Date(cycle.opens_at).toLocaleDateString(dateLocale, { timeZone: APP_TIME_ZONE, day: "numeric", month: "long", year: "numeric" }) })}
                  </p>
                ) : (
                  <>
                    {cycle.closes_at && (
                      <p className="mt-2 text-body-sm text-ink-tertiary">
                        {t("closesOn", { date: new Date(cycle.closes_at).toLocaleDateString(dateLocale, { timeZone: APP_TIME_ZONE, day: "numeric", month: "long", year: "numeric" }) })}
                      </p>
                    )}
                    <Link
                      href={`/associations/${slug}/apply?cycle=${cycle.id}`}
                      className="mt-3 inline-block rounded-md bg-navy px-4 py-1.5 text-body-sm text-white transition-colors duration-100 hover:bg-navy-700"
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
        <div className="rounded-lg border border-border bg-white px-5 py-6 text-center">
          <p className="text-body-sm text-ink-secondary">{t("noCyclesOpen")}</p>
        </div>
      )}
    </>
  );
}
