import { getTranslations } from "next-intl/server";

export default async function AdminTeamPage() {
  const t = await getTranslations("AdminTeam");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-h1 text-navy">{t("heading")}</h1>
        <p className="mt-1 text-body text-ink-secondary">
          {t("subhead")}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-white p-8 text-center">
        <p className="text-body text-ink-secondary">
          {t("comingSoon")}
        </p>
      </div>
    </div>
  );
}
