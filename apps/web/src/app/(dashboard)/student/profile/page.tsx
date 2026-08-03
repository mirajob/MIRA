/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createServerClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { ProfilePhoto } from "./profile-photo";
import { PrivacySettings } from "./privacy-settings";

/**
 * L'account dello studente: foto, dati di accesso, cosa vede chi, i documenti.
 *
 * È la pagina che mancava: la MiraCard racconta chi sei a chi la riceve, ma le
 * decisioni sul proprio account (la foto, i voti da mostrare, la privacy) non
 * avevano un posto dove stare.
 */
export default async function StudentProfilePage() {
  const ctx = await getUserContext();
  if (!ctx.isStudent) redirect("/api/auth/redirect");

  const supabase = await createServerClient();
  const profileId = (ctx.profile as any).id as string;

  const { data: student } = await supabase
    .from("student_profiles")
    .select("university, privacy_settings")
    .eq("user_id", profileId)
    .maybeSingle();

  const t = await getTranslations("Profile");
  const profile = ctx.profile as any;
  const privacy = ((student as any)?.privacy_settings ?? {}) as Record<string, boolean>;

  const rows: Array<[string, string | null]> = [
    [t("fieldName"), profile.full_name],
    [t("fieldEmail"), profile.email],
    [t("fieldUniversity"), (student as any)?.university ?? null],
  ];

  return (
    <div className="space-y-4">
      <p className="text-body-sm text-ink-secondary">{t("intro")}</p>

      <ProfilePhoto
        initialUrl={profile.avatar_url ?? null}
        fallback={(profile.full_name ?? profile.email ?? "?").charAt(0).toUpperCase()}
      />

      <section className="rounded-lg border border-border bg-white p-5">
        <h2 className="text-body font-medium text-navy">{t("accountHeading")}</h2>
        <dl className="mt-3 divide-y divide-border">
          {rows.map(([label, value]) => (
            <div key={label} className="grid gap-1 py-2.5 sm:grid-cols-[160px_1fr] sm:gap-4">
              <dt className="text-body-sm text-ink-tertiary">{label}</dt>
              <dd className="text-body-sm text-ink">{value ?? "—"}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-body-sm text-ink-tertiary">{t("accountHint")}</p>
      </section>

      <PrivacySettings
        initialSettings={{
          show_grades_to_associations: privacy.show_grades_to_associations ?? false,
          show_grades_to_companies: privacy.show_grades_to_companies ?? false,
        }}
      />

      <section className="rounded-lg border border-border bg-white p-5">
        <h2 className="text-body font-medium text-navy">{t("dataHeading")}</h2>
        <dl className="mt-3 space-y-3">
          {(["dataWho", "dataAssociations", "dataCompanies", "dataRights"] as const).map((key) => (
            <div key={key} className="grid gap-1 sm:grid-cols-[200px_1fr] sm:gap-4">
              <dt className="text-body-sm font-medium text-navy">{t(`${key}.q`)}</dt>
              <dd className="text-body-sm text-ink-secondary">{t(`${key}.a`)}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-border pt-3 text-body-sm">
          <Link href="/privacy" className="text-petrol hover:underline">
            {t("linkPrivacy")}
          </Link>
          <Link href="/termini" className="text-petrol hover:underline">
            {t("linkTerms")}
          </Link>
          <a href="mailto:privacy@mirajob.cloud" className="text-petrol hover:underline">
            {t("linkContact")}
          </a>
        </div>
      </section>
    </div>
  );
}
