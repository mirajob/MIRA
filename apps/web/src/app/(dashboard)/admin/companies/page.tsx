import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ApproveRejectButtons } from "./approve-reject-buttons";
import { AccessRequestButtons } from "./access-request-buttons";
import { InvitationForm } from "./invitation-form";
import { getLocale, getTranslations } from "next-intl/server";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function AdminCompaniesPage() {
  const ctx = await getUserContext();
  if (!ctx.isMiraAdmin) redirect("/student");

  const t = await getTranslations("AdminCompanies");
  const locale = await getLocale();
  const dateLocale = locale === "it" ? "it-IT" : "en-US";
  const supabase = await createServiceClient();

  const { data: accessRequests, error: accessRequestsErr } = await (supabase.from("company_access_requests") as any)
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (accessRequestsErr) console.error("admin access requests query error:", accessRequestsErr);

  const { data: companies, error: companiesErr } = await (supabase.from("company_profiles") as any)
    .select("*")
    .order("created_at", { ascending: false });

  if (companiesErr) console.error("admin companies query error:", companiesErr);

  // Fetch admin memberships separately to avoid ambiguous FK (user_id vs invited_by_user_id → profiles)
  const companyIds = (companies ?? []).map((c: any) => c.id);
  const { data: memberships } = companyIds.length
    ? await (supabase.from("company_memberships") as any)
        .select("company_id, role, user_id, profiles!company_memberships_user_id_fkey(full_name, email)")
        .in("company_id", companyIds)
        .eq("role", "admin")
    : { data: [] };

  const membershipByCompany: Record<string, any> = {};
  for (const m of memberships ?? []) membershipByCompany[m.company_id] = m;

  const pending = (companies ?? []).filter((c: any) => c.verification_status === "pending_verification");
  const active = (companies ?? []).filter((c: any) => c.verification_status === "verified");
  const others = (companies ?? []).filter((c: any) => !["pending_verification", "verified"].includes(c.verification_status));

  const statusLabel: Record<string, string> = {
    pending_verification: t("statusPendingVerification"),
    verified: t("statusVerified"),
    rejected: t("statusRejected"),
    suspended: t("statusSuspended"),
    invited: t("statusInvited"),
  };

  const statusClass: Record<string, string> = {
    pending_verification: "bg-amber-100 text-amber-700",
    verified: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-600",
    suspended: "bg-red-100 text-red-600",
    invited: "bg-blue-100 text-blue-700",
  };

  function CompanyRow({ company }: { company: any }) {
    const membership = membershipByCompany[company.id];
    const contact = membership?.profiles;
    return (
      <tr className="border-b border-border last:border-0 hover:bg-paper transition-colors">
        <td className="px-4 py-3">
          <p className="text-body font-medium text-navy">{company.legal_name}</p>
          <p className="text-body-sm text-ink-secondary">{company.sector ?? "—"}</p>
        </td>
        <td className="px-4 py-3">
          <p className="text-body-sm text-ink">{contact?.full_name ?? "—"}</p>
          <p className="text-body-sm text-ink-tertiary">{contact?.email ?? "—"}</p>
        </td>
        <td className="px-4 py-3">
          {company.website_url ? (
            <a href={company.website_url} target="_blank" rel="noopener noreferrer"
              className="text-body-sm text-petrol underline underline-offset-2 decoration-1">
              {company.website_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            </a>
          ) : <span className="text-body-sm text-ink-tertiary">—</span>}
        </td>
        <td className="px-4 py-3">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusClass[company.verification_status] ?? "bg-gray-100 text-gray-600"}`}>
            {statusLabel[company.verification_status] ?? company.verification_status}
          </span>
        </td>
        <td className="px-4 py-3 text-body-sm text-ink-tertiary">
          {new Date(company.created_at).toLocaleString(dateLocale, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
        </td>
        <td className="px-4 py-3">
          <ApproveRejectButtons
            companyId={company.id}
            status={company.verification_status}
          />
        </td>
      </tr>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-h1 text-navy">{t("heading")}</h1>
        <p className="mt-1 text-body text-ink-secondary">{t("subhead")}</p>
      </div>

      <section>
        <InvitationForm />
      </section>

      {(accessRequests?.length ?? 0) > 0 && (
        <section>
          <h2 className="font-display text-h2 text-navy mb-4">{t("accessRequestsHeading", { count: accessRequests.length })}</h2>
          <div className="rounded-lg border border-amber-200 bg-white overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-amber-50">
                  <th className="px-4 py-3 text-left text-label text-ink-secondary">{t("tableCompany")}</th>
                  <th className="px-4 py-3 text-left text-label text-ink-secondary">{t("tableContact")}</th>
                  <th className="px-4 py-3 text-left text-label text-ink-secondary">{t("tableWebsite")}</th>
                  <th className="px-4 py-3 text-left text-label text-ink-secondary">{t("tableDate")}</th>
                  <th className="px-4 py-3 text-left text-label text-ink-secondary">{t("tableActions")}</th>
                </tr>
              </thead>
              <tbody>
                {accessRequests.map((r: any) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-paper transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-body font-medium text-navy">{r.legal_name}</p>
                      <p className="text-body-sm text-ink-secondary">{r.sector ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-body-sm text-ink">{r.contact_name}</p>
                      <p className="text-body-sm text-ink-tertiary">{r.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      {r.website_url ? (
                        <a href={r.website_url} target="_blank" rel="noopener noreferrer"
                          className="text-body-sm text-petrol underline underline-offset-2 decoration-1">
                          {r.website_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                        </a>
                      ) : <span className="text-body-sm text-ink-tertiary">—</span>}
                    </td>
                    <td className="px-4 py-3 text-body-sm text-ink-tertiary">
                      {new Date(r.created_at).toLocaleString(dateLocale, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3">
                      <AccessRequestButtons requestId={r.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {pending.length > 0 && (
        <section>
          <h2 className="font-display text-h2 text-navy mb-4">{t("pendingApprovalHeading", { count: pending.length })}</h2>
          <div className="rounded-lg border border-amber-200 bg-white overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-amber-50">
                  <th className="px-4 py-3 text-left text-label text-ink-secondary">{t("tableCompany")}</th>
                  <th className="px-4 py-3 text-left text-label text-ink-secondary">{t("tableContact")}</th>
                  <th className="px-4 py-3 text-left text-label text-ink-secondary">{t("tableWebsite")}</th>
                  <th className="px-4 py-3 text-left text-label text-ink-secondary">{t("tableStatus")}</th>
                  <th className="px-4 py-3 text-left text-label text-ink-secondary">{t("tableDate")}</th>
                  <th className="px-4 py-3 text-left text-label text-ink-secondary">{t("tableActions")}</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((c: any) => <CompanyRow key={c.id} company={c} />)}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {active.length > 0 && (
        <section>
          <h2 className="font-display text-h2 text-navy mb-4">{t("activeCompaniesHeading", { count: active.length })}</h2>
          <div className="rounded-lg border border-border bg-white overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-label text-ink-secondary">{t("tableCompany")}</th>
                  <th className="px-4 py-3 text-left text-label text-ink-secondary">{t("tableContact")}</th>
                  <th className="px-4 py-3 text-left text-label text-ink-secondary">{t("tableWebsite")}</th>
                  <th className="px-4 py-3 text-left text-label text-ink-secondary">{t("tableStatus")}</th>
                  <th className="px-4 py-3 text-left text-label text-ink-secondary">{t("tableDate")}</th>
                  <th className="px-4 py-3 text-left text-label text-ink-secondary">{t("tableActions")}</th>
                </tr>
              </thead>
              <tbody>
                {active.map((c: any) => <CompanyRow key={c.id} company={c} />)}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section>
          <h2 className="font-display text-h2 text-navy mb-4">{t("othersHeading", { count: others.length })}</h2>
          <div className="rounded-lg border border-border bg-white overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-label text-ink-secondary">{t("tableCompany")}</th>
                  <th className="px-4 py-3 text-left text-label text-ink-secondary">{t("tableContact")}</th>
                  <th className="px-4 py-3 text-left text-label text-ink-secondary">{t("tableWebsite")}</th>
                  <th className="px-4 py-3 text-left text-label text-ink-secondary">{t("tableStatus")}</th>
                  <th className="px-4 py-3 text-left text-label text-ink-secondary">{t("tableDate")}</th>
                  <th className="px-4 py-3 text-left text-label text-ink-secondary">{t("tableActions")}</th>
                </tr>
              </thead>
              <tbody>
                {others.map((c: any) => <CompanyRow key={c.id} company={c} />)}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!companies?.length && (
        <div className="rounded-lg border border-border bg-white p-8 text-center">
          <p className="text-body text-ink-secondary">{t("noCompanies")}</p>
        </div>
      )}
    </div>
  );
}
