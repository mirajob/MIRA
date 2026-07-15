import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { InvitationForm } from "./invitation-form";
import { ApproveRejectButtons } from "./approve-reject-buttons";
import { DeleteAssociationButton } from "./delete-association-button";
import { getLocale, getTranslations } from "next-intl/server";

/* eslint-disable @typescript-eslint/no-explicit-any */

const STATUS_CLASS: Record<string, string> = {
  pending_verification: "bg-amber-100 text-amber-700",
  verified: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-600",
  suspended: "bg-red-100 text-red-600",
};

function AssociationRow({ assoc, president, t, statusLabel, dateLocale }: { assoc: any; president: any; t: any; statusLabel: Record<string, string>; dateLocale: string }) {
  return (
    <tr className="border-b border-border last:border-0 hover:bg-paper transition-colors">
      <td className="px-4 py-3">
        <p className="text-body font-medium text-navy">{assoc.name}</p>
        <p className="text-body-sm text-ink-tertiary">/{assoc.slug}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-body-sm text-ink">{president?.full_name ?? "—"}</p>
        <p className="text-body-sm text-ink-tertiary">{president?.email ?? assoc.contact_email ?? "—"}</p>
      </td>
      <td className="px-4 py-3 text-body text-ink">{assoc.category ?? "—"}</td>
      <td className="px-4 py-3 text-body-sm text-ink">{assoc.university ?? "—"}</td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLASS[assoc.verification_status] ?? "bg-gray-100 text-gray-600"}`}>
          {statusLabel[assoc.verification_status] ?? assoc.verification_status}
        </span>
      </td>
      <td className="px-4 py-3 text-body-sm text-ink-tertiary">
        {new Date(assoc.created_at).toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" })}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <ApproveRejectButtons associationId={assoc.id} status={assoc.verification_status} />
          <DeleteAssociationButton associationId={assoc.id} name={assoc.name} />
        </div>
      </td>
    </tr>
  );
}

function AssociationTable({ rows, presidentByAssociation, t, statusLabel, dateLocale }: { rows: any[]; presidentByAssociation: Record<string, any>; t: any; statusLabel: Record<string, string>; dateLocale: string }) {
  return (
    <div className="rounded-lg border border-border bg-white overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-3 text-left text-label text-ink-secondary">{t("tableAssociation")}</th>
            <th className="px-4 py-3 text-left text-label text-ink-secondary">{t("tablePresident")}</th>
            <th className="px-4 py-3 text-left text-label text-ink-secondary">{t("tableCategory")}</th>
            <th className="px-4 py-3 text-left text-label text-ink-secondary">{t("tableUniversity")}</th>
            <th className="px-4 py-3 text-left text-label text-ink-secondary">{t("tableStatus")}</th>
            <th className="px-4 py-3 text-left text-label text-ink-secondary">{t("tableDate")}</th>
            <th className="px-4 py-3 text-left text-label text-ink-secondary">{t("tableActions")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((assoc) => (
            <AssociationRow key={assoc.id} assoc={assoc} president={presidentByAssociation[assoc.id]} t={t} statusLabel={statusLabel} dateLocale={dateLocale} />
          ))}
        </tbody>
      </table>
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

  const pending = (associations ?? []).filter((a: any) => a.verification_status === "pending_verification");
  const active = (associations ?? []).filter((a: any) => a.verification_status === "verified");
  const others = (associations ?? []).filter((a: any) => !["pending_verification", "verified"].includes(a.verification_status));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-h1 text-navy">{t("heading")}</h1>
        <p className="mt-1 text-body text-ink-secondary">
          {t("subhead")}
        </p>
      </div>

      <section>
        <InvitationForm />
      </section>

      {pending.length > 0 && (
        <section>
          <h2 className="font-display text-h2 text-navy mb-4">{t("pendingApprovalHeading", { count: pending.length })}</h2>
          <AssociationTable rows={pending} presidentByAssociation={presidentByAssociation} t={t} statusLabel={statusLabel} dateLocale={dateLocale} />
        </section>
      )}

      <section>
        <h2 className="font-display text-h2 text-navy mb-4">{t("activeHeading", { count: active.length })}</h2>
        {active.length > 0 ? (
          <AssociationTable rows={active} presidentByAssociation={presidentByAssociation} t={t} statusLabel={statusLabel} dateLocale={dateLocale} />
        ) : (
          <div className="rounded-lg border border-border bg-white p-8 text-center">
            <p className="text-body text-ink-secondary">{t("noActiveAssociations")}</p>
          </div>
        )}
      </section>

      {others.length > 0 && (
        <section>
          <h2 className="font-display text-h2 text-navy mb-4">{t("othersHeading", { count: others.length })}</h2>
          <AssociationTable rows={others} presidentByAssociation={presidentByAssociation} t={t} statusLabel={statusLabel} dateLocale={dateLocale} />
        </section>
      )}
    </div>
  );
}
