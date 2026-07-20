import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CopyLink } from "./copy-link";
import { DeleteUserButton } from "./delete-user-button";
import { ReminderButton } from "./reminder-button";
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

  function StudentsTable({ rows, showReminder = false }: { rows: StudentRow[]; showReminder?: boolean }) {
    if (!rows.length) {
      return <p className="px-3 py-3 text-body-sm text-ink-tertiary">{t("noStudentsInSection")}</p>;
    }
    return (
      // overflow-x-auto sul solo <table>: su mobile la colonna azioni (sollecita/elimina)
      // era irraggiungibile perché il contenitore esterno è overflow-hidden. L'intestazione
      // di sezione resta ferma, scorre solo la tabella.
      <div className="overflow-x-auto">
      <table className="w-full min-w-[720px]">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left text-eyebrow text-navy/60 uppercase py-2 px-3">{t("tableName")}</th>
            <th className="text-left text-eyebrow text-navy/60 uppercase py-2 px-3">{t("tableEmail")}</th>
            <th className="text-left text-eyebrow text-navy/60 uppercase py-2 px-3">{t("tableLevel")}</th>
            <th className="text-left text-eyebrow text-navy/60 uppercase py-2 px-3">{t("tableRegistered")}</th>
            <th className="text-left text-eyebrow text-navy/60 uppercase py-2 px-3">{t("tableActions")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id} className="border-b border-border last:border-0 hover:bg-navy-50/50">
              <td className="py-2 px-3">
                {s.onboardingCompleted ? (
                  <Link href={`/admin/users/${s.id}/card`} className="flex items-center gap-2 group">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-white text-eyebrow font-semibold">
                      {(s.fullName ?? s.email).charAt(0).toUpperCase()}
                    </div>
                    <span className="text-body-sm font-medium text-navy group-hover:underline underline-offset-2 decoration-1">{s.fullName ?? "—"}</span>
                  </Link>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-white text-eyebrow font-semibold">
                      {(s.fullName ?? s.email).charAt(0).toUpperCase()}
                    </div>
                    <span className="text-body-sm font-medium text-navy">{s.fullName ?? "—"}</span>
                  </div>
                )}
              </td>
              <td className="py-2 px-3 text-body-sm text-ink">{s.email}</td>
              <td className="py-2 px-3 text-body-sm text-ink">{degreeLevelLabel(s.degreeLevel)}</td>
              <td className="py-2 px-3 text-body-sm text-ink-secondary whitespace-nowrap">
                {new Date(s.createdAt).toLocaleString(dateLocale, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              <td className="py-2 px-3">
                <div className="flex items-center gap-3">
                  {showReminder && <ReminderButton profileId={s.id} studentName={s.fullName ?? s.email} />}
                  <DeleteUserButton profileId={s.id} name={s.fullName ?? s.email} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-h2 text-navy">{t("heading")}</h1>
        <p className="mt-0.5 text-body-sm text-ink-secondary">
          {t("subhead")}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-white p-4">
        <p className="text-label text-navy mb-0.5">{t("signupLinkLabel")}</p>
        <p className="text-body-sm text-ink-secondary mb-2">
          {t("signupLinkIntro")}
        </p>
        <CopyLink url="https://mirajob.cloud/signup" />
      </div>

      {!students.length ? (
        <div className="rounded-lg border border-border bg-white p-6 text-center">
          <p className="text-body-sm text-ink-secondary">{t("noUsers")}</p>
        </div>
      ) : (
        universities.map((university) => {
          const rows = byUniversity.get(university)!;
          const registered = rows.filter((s) => !s.onboardingCompleted);
          const cardCompleted = rows.filter((s) => s.onboardingCompleted);
          return (
            <div key={university} className="space-y-2">
              <h2 className="font-sans text-body font-semibold text-navy">
                {university} <span className="text-body-sm text-ink-tertiary font-normal">({rows.length})</span>
              </h2>

              <div className="rounded-lg border border-border bg-white overflow-hidden">
                <div className="border-b border-border bg-navy-50/50 px-3 py-1.5">
                  <p className="text-eyebrow uppercase text-navy/70">
                    {t("onlyRegistered")} <span className="text-ink-tertiary font-normal">({registered.length})</span>
                  </p>
                </div>
                <StudentsTable rows={registered} showReminder />
              </div>

              <div className="rounded-lg border border-border bg-white overflow-hidden">
                <div className="border-b border-border bg-navy-50/50 px-3 py-1.5">
                  <p className="text-eyebrow uppercase text-navy/70">
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
