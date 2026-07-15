import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CopyLink } from "./copy-link";
import { DeleteUserButton } from "./delete-user-button";
import { getLocale, getTranslations } from "next-intl/server";

interface StudentRow {
  id: string;
  fullName: string | null;
  email: string;
  createdAt: string;
  university: string;
  degreeLevel: string | null;
  onboardingCompleted: boolean;
}

export default async function AdminUsersPage() {
  const ctx = await getUserContext();
  if (!ctx.isMiraAdmin) redirect("/student");

  const t = await getTranslations("AdminUsers");
  const tDegree = await getTranslations("SignupPage");
  const locale = await getLocale();
  const dateLocale = locale === "it" ? "it-IT" : "en-US";
  const supabase = await createServiceClient();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*, student_profiles(university, degree_level, onboarding_completed)")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) console.error("admin users query error:", error);

  // Questa pagina è il roster studenti: gli altri ruoli (admin, aziende, associazioni)
  // non hanno uno student_profile e si gestiscono altrove.
  // `user_id` su student_profiles è UNIQUE, quindi Postgrest restituisce l'embed come
  // oggetto singolo (relazione 1:1), non come array — niente `?.[0]`.
  const students: StudentRow[] = (profiles ?? [])
    .filter((p) => Boolean(p.student_profiles))
    .map((p) => {
      const sp = p.student_profiles as Record<string, unknown>;
      return {
        id: p.id as string,
        fullName: p.full_name as string | null,
        email: p.email as string,
        createdAt: p.created_at as string,
        university: (sp.university as string) || t("noUniversity"),
        degreeLevel: (sp.degree_level as string) ?? null,
        onboardingCompleted: Boolean(sp.onboarding_completed),
      };
    });

  const byUniversity = new Map<string, StudentRow[]>();
  for (const s of students) {
    const list = byUniversity.get(s.university) ?? [];
    list.push(s);
    byUniversity.set(s.university, list);
  }
  const universities = [...byUniversity.keys()].sort((a, b) => a.localeCompare(b));

  function degreeLevelLabel(level: string | null) {
    if (!level) return "—";
    return tDegree.has(`degreeLevels.${level}`) ? tDegree(`degreeLevels.${level}`) : level;
  }

  function StudentsTable({ rows }: { rows: StudentRow[] }) {
    if (!rows.length) {
      return <p className="px-4 py-4 text-body-sm text-ink-tertiary">{t("noStudentsInSection")}</p>;
    }
    return (
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">{t("tableName")}</th>
            <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">{t("tableEmail")}</th>
            <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">{t("tableLevel")}</th>
            <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">{t("tableRegistered")}</th>
            <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">{t("tableActions")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id} className="border-b border-border last:border-0 hover:bg-navy-50/50">
              <td className="py-4 px-4">
                {s.onboardingCompleted ? (
                  <Link href={`/admin/users/${s.id}/card`} className="flex items-center gap-3 group">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-white text-eyebrow font-semibold">
                      {(s.fullName ?? s.email).charAt(0).toUpperCase()}
                    </div>
                    <span className="text-body font-medium text-navy group-hover:underline underline-offset-2 decoration-1">{s.fullName ?? "—"}</span>
                  </Link>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-white text-eyebrow font-semibold">
                      {(s.fullName ?? s.email).charAt(0).toUpperCase()}
                    </div>
                    <span className="text-body font-medium text-navy">{s.fullName ?? "—"}</span>
                  </div>
                )}
              </td>
              <td className="py-4 px-4 text-body-sm text-ink">{s.email}</td>
              <td className="py-4 px-4 text-body-sm text-ink">{degreeLevelLabel(s.degreeLevel)}</td>
              <td className="py-4 px-4 text-body-sm text-ink-secondary">
                {new Date(s.createdAt).toLocaleDateString(dateLocale)}
              </td>
              <td className="py-4 px-4">
                <DeleteUserButton profileId={s.id} name={s.fullName ?? s.email} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-h1 text-navy">{t("heading")}</h1>
        <p className="mt-1 text-body text-ink-secondary">
          {t("subhead")}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-white p-5">
        <p className="text-label text-navy mb-1">{t("signupLinkLabel")}</p>
        <p className="text-body-sm text-ink-secondary mb-3">
          {t("signupLinkIntro")}
        </p>
        <CopyLink url="https://mirajob.cloud/signup" />
      </div>

      {!students.length ? (
        <div className="rounded-lg border border-border bg-white p-8 text-center">
          <p className="text-body text-ink-secondary">{t("noUsers")}</p>
        </div>
      ) : (
        universities.map((university) => {
          const rows = byUniversity.get(university)!;
          const registered = rows.filter((s) => !s.onboardingCompleted);
          const cardCompleted = rows.filter((s) => s.onboardingCompleted);
          return (
            <div key={university} className="space-y-3">
              <h2 className="font-display text-h2 text-navy">
                {university} <span className="text-body text-ink-tertiary font-normal">({rows.length})</span>
              </h2>

              <div className="rounded-lg border border-border bg-white overflow-hidden">
                <div className="border-b border-border bg-navy-50/50 px-4 py-2">
                  <p className="text-label text-navy">
                    {t("onlyRegistered")} <span className="text-ink-tertiary font-normal">({registered.length})</span>
                  </p>
                </div>
                <StudentsTable rows={registered} />
              </div>

              <div className="rounded-lg border border-border bg-white overflow-hidden">
                <div className="border-b border-border bg-navy-50/50 px-4 py-2">
                  <p className="text-label text-navy">
                    {t("cardCompleted")} <span className="text-ink-tertiary font-normal">({cardCompleted.length})</span>
                  </p>
                </div>
                <StudentsTable rows={cardCompleted} />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
