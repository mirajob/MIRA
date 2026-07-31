import { getTranslations } from "next-intl/server";

/**
 * Etichetta su una pagina creata da MIRA da fonti pubbliche e non ancora gestita
 * dall'associazione. Non è decorativa: è la garanzia che nessuno scambi la pagina
 * per una presenza ufficiale, e la via con cui il board la rivendica o ne chiede la
 * rimozione. Va mostrata su ogni resa della vetrina di un'associazione `seeded`.
 */
export async function AssociationSeededNotice({ contactEmail }: { contactEmail: string }) {
  const t = await getTranslations("AssociationSeeded");

  return (
    <div className="mb-6 rounded-lg border border-border bg-navy-50/60 px-4 py-3">
      <p className="text-body-sm text-ink">{t("notice")}</p>
      <p className="mt-1 text-body-sm text-ink-secondary">
        {t.rich("claimPrompt", {
          link: (chunks) => (
            <a
              href={`mailto:${contactEmail}?subject=${encodeURIComponent(t("claimEmailSubject"))}`}
              className="text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700"
            >
              {chunks}
            </a>
          ),
        })}
      </p>
    </div>
  );
}
