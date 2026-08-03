import Link from "next/link";
import { getTranslations } from "next-intl/server";

export interface CycleOption {
  id: string;
  title: string;
}

/**
 * L'attacco per creare un round. Il modulo vero sta su una pagina sua: aprirlo qui
 * dentro lasciava sopra e sotto l'elenco dei round esistenti, ancora cliccabili
 * mentre si stava compilando.
 */
export async function NewSessionPanel({
  slug,
  cycles,
}: {
  slug: string;
  cycles: CycleOption[];
}) {
  const t = await getTranslations("Interviews");

  if (!cycles.length) {
    return (
      <div className="rounded-lg border border-border bg-white px-4 py-3">
        <p className="text-body-sm text-ink-secondary">{t("noCycles")}</p>
      </div>
    );
  }

  return (
    <Link
      href={`/association/${slug}/colloqui/nuovo`}
      className="inline-block rounded-md bg-navy px-4 py-1.5 text-body-sm text-white transition-colors duration-100 hover:bg-navy-700"
    >
      {t("newSessionCta")}
    </Link>
  );
}
