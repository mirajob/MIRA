import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { InvitationForm } from "./invitation-form";
import { ApproveRejectButtons } from "./approve-reject-buttons";
import { DeleteAssociationButton } from "./delete-association-button";
import { ReminderButton } from "./reminder-button";
import { getLocale, getTranslations } from "next-intl/server";

/* eslint-disable @typescript-eslint/no-explicit-any */

const STATUS_CLASS: Record<string, string> = {
  pending_verification: "bg-amber-100 text-amber-700",
  verified: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-600",
  suspended: "bg-red-100 text-red-600",
};

function AssociationRow({ assoc, president, t, statusLabel, dateLocale, showReminder }: { assoc: any; president: any; t: any; statusLabel: Record<string, string>; dateLocale: string; showReminder?: boolean }) {
  return (
    <tr className="border-b border-border last:border-0 hover:bg-paper transition-colors">
      <td className="px-3 py-2">
        <p className="text-body-sm font-medium text-navy">{assoc.name}</p>
        <p className="text-eyebrow text-ink-tertiary">/{assoc.slug}</p>
      </td>
      <td className="px-3 py-2">
        <p className="text-body-sm text-ink">{president?.full_name ?? "—"}</p>
        <p className="text-eyebrow text-ink-tertiary">{president?.email ?? assoc.contact_email ?? "—"}</p>
      </td>
      <td className="px-3 py-2 text-body-sm text-ink">{assoc.category ?? "—"}</td>
      <td className="px-3 py-2">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${STATUS_CLASS[assoc.verification_status] ?? "bg-gray-100 text-gray-600"}`}>
          {statusLabel[assoc.verification_status] ?? assoc.verification_status}
        </span>
      </td>
      <td className="px-3 py-2 text-body-sm text-ink-tertiary whitespace-nowrap">
        {new Date(assoc.created_at).toLocaleString(dateLocale, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-3">
          {showReminder && <ReminderButton associationId={assoc.id} associationName={assoc.name} />}
          <ApproveRejectButtons associationId={assoc.id} status={assoc.verification_status} />
          <DeleteAssociationButton associationId={assoc.id} name={assoc.name} />
        </div>
      </td>
    </tr>
  );
}

function AssociationTable({ rows, presidentByAssociation, t, statusLabel, dateLocale, showReminder }: { rows: any[]; presidentByAssociation: Record<string, any>; t: any; statusLabel: Record<string, string>; dateLocale: string; showReminder?: boolean }) {
  if (!rows.length) {
    return <p className="px-3 py-3 text-body-sm text-ink-tertiary">{t("noAssociationsInSection")}</p>;
  }
  return (
    // overflow-x-auto sul solo <table>: su mobile la colonna azioni era irraggiungibile
    // perché il contenitore esterno è overflow-hidden.
    <div className="overflow-x-auto">
    <table className="w-full min-w-[820px]">
      <thead>
        <tr className="border-b border-border">
          <th className="px-3 py-2 text-left text-eyebrow uppercase text-navy/60">{t("tableAssociation")}</th>
          <th className="px-3 py-2 text-left text-eyebrow uppercase text-navy/60">{t("tablePresident")}</th>
          <th className="px-3 py-2 text-left text-eyebrow uppercase text-navy/60">{t("tableCategory")}</th>
          <th className="px-3 py-2 text-left text-eyebrow uppercase text-navy/60">{t("tableStatus")}</th>
          <th className="px-3 py-2 text-left text-eyebrow uppercase text-navy/60">{t("tableDate")}</th>
          <th className="px-3 py-2 text-left text-eyebrow uppercase text-navy/60">{t("tableActions")}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((assoc) => (
          <AssociationRow key={assoc.id} assoc={assoc} president={presidentByAssociation[assoc.id]} t={t} statusLabel={statusLabel} dateLocale={dateLocale} showReminder={showReminder} />
        ))}
      </tbody>
    </table>
    </div>
  );
}

function AssociationSection({ label, rows, presidentByAssociation, t, statusLabel, dateLocale, showReminder }: {
  label: string; rows: any[]; presidentByAssociation: Record<string, any>; t: any; statusLabel: Record<string, string>; dateLocale: string; showReminder?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-white overflow-hidden">
      <div className="border-b border-border bg-navy-50/50 px-3 py-1.5">
        <p className="text-eyebrow uppercase text-navy/70">{label}</p>
      </div>
      <AssociationTable rows={rows} presidentByAssociation={presidentByAssociation} t={t} statusLabel={statusLabel} dateLocale={dateLocale} showReminder={showReminder} />
    </div>
  );
}

export default async function AdminAssociationsPage() {
  const ctx = await getUserContext();
  if (!ctx.isMiraAdmin) redirect("/student");

  const t = await getTranslations("AdminAssociations");
  const locale = await getLocale();
  const dateLocale = locale === "it" ? "it-IT" : "en-US";
  const statusLabel: Record<string, string> = {
    pending_verification: t("statusPendingVerification"),
    verified: t("statusVerified"),
    rejected: t("statusRejected"),
    suspended: t("statusSuspended"),
  };
  const supabase = await createServiceClient();

  const { data: associations, error: associationsErr } = await (supabase.from("association_profiles") as any)
    .select("*")
    .order("created_at", { ascending: false });

  if (associationsErr) console.error("admin associations query error:", associationsErr);

  // Fetch president memberships separately to avoid ambiguous FK (user_id vs invited_by_user_id → profiles)
  const associationIds = (associations ?? []).map((a: any) => a.id);
  const { data: memberships, error: membershipsErr } = associationIds.length
    ? await (supabase.from("association_memberships") as any)
        .select("association_id, role, profiles!association_memberships_user_id_fkey(full_name, email)")
        .in("association_id", associationIds)
        .eq("role", "association_president")
    : { data: [], error: null };

  if (membershipsErr) console.error("admin association memberships query error:", membershipsErr);

  const presidentByAssociation: Record<string, any> = {};
  for (const m of memberships ?? []) presidentByAssociation[m.association_id] = m.profiles;

  // Richieste in attesa e associazioni accettate — raggruppate per università, con
  // sottosezioni per stato del percorso (richiesta → accettata → pagina pubblica).
  const relevant = (associations ?? []).filter((a: any) =>
    ["pending_verification", "verified"].includes(a.verification_status)
  );
  const others = (associations ?? []).filter((a: any) =>
    !["pending_verification", "verified"].includes(a.verification_status)
  );

  const byUniversity = new Map<string, any[]>();
  for (const a of relevant) {
    const uni = a.university || t("noUniversitySpecified");
    const list = byUniversity.get(uni) ?? [];
    list.push(a);
    byUniversity.set(uni, list);
  }
  const universities = [...byUniversity.keys()].sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-h2 text-navy">{t("heading")}</h1>
        <p className="mt-0.5 text-body-sm text-ink-secondary">
          {t("subhead")}
        </p>
      </div>

      <section>
        <InvitationForm />
      </section>

      {universities.length === 0 ? (
        <div className="rounded-lg border border-border bg-white p-6 text-center">
          <p className="text-body-sm text-ink-secondary">{t("noActiveAssociations")}</p>
        </div>
      ) : (
        universities.map((uni) => {
          const rows = byUniversity.get(uni)!;
          const pendingRows = rows.filter((a) => a.verification_status === "pending_verification");
          const acceptedNoPage = rows.filter((a) => a.verification_status === "verified" && a.public_page_status !== "published");
          const published = rows.filter((a) => a.verification_status === "verified" && a.public_page_status === "published");

          return (
            <div key={uni} className="space-y-2">
              <h2 className="font-sans text-body font-semibold text-navy">
                {uni} <span className="text-body-sm text-ink-tertiary font-normal">({rows.length})</span>
              </h2>

              <AssociationSection
                label={t("pendingApprovalHeading", { count: pendingRows.length })}
                rows={pendingRows}
                presidentByAssociation={presidentByAssociation}
                t={t}
                statusLabel={statusLabel}
                dateLocale={dateLocale}
              />
              <AssociationSection
                label={t("acceptedNoPageHeading", { count: acceptedNoPage.length })}
                rows={acceptedNoPage}
                presidentByAssociation={presidentByAssociation}
                t={t}
                statusLabel={statusLabel}
                dateLocale={dateLocale}
                showReminder
              />
              <AssociationSection
                label={t("publishedHeading", { count: published.length })}
                rows={published}
                presidentByAssociation={presidentByAssociation}
                t={t}
                statusLabel={statusLabel}
                dateLocale={dateLocale}
              />
            </div>
          );
        })
      )}

      {others.length > 0 && (
        <section>
          <h2 className="font-sans text-body font-semibold text-navy mb-2">{t("othersHeading", { count: others.length })}</h2>
          <div className="rounded-lg border border-border bg-white overflow-hidden">
            <AssociationTable rows={others} presidentByAssociation={presidentByAssociation} t={t} statusLabel={statusLabel} dateLocale={dateLocale} />
          </div>
        </section>
      )}
    </div>
  );
}
