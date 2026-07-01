import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ApproveRejectButtons } from "./approve-reject-buttons";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function AdminCompaniesPage() {
  const ctx = await getUserContext();
  if (!ctx.isMiraAdmin) redirect("/student");

  const supabase = await createServiceClient();

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
    pending_verification: "In attesa",
    verified: "Attiva",
    rejected: "Rifiutata",
    suspended: "Sospesa",
    invited: "Invitata",
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
          {new Date(company.created_at).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" })}
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
        <h1 className="font-display text-h1 text-navy">Aziende</h1>
        <p className="mt-1 text-body text-ink-secondary">Gestisci le aziende registrate su MIRA</p>
      </div>

      {pending.length > 0 && (
        <section>
          <h2 className="font-display text-h2 text-navy mb-4">In attesa di approvazione ({pending.length})</h2>
          <div className="rounded-lg border border-amber-200 bg-white overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-amber-50">
                  <th className="px-4 py-3 text-left text-label text-ink-secondary">Azienda</th>
                  <th className="px-4 py-3 text-left text-label text-ink-secondary">Contatto</th>
                  <th className="px-4 py-3 text-left text-label text-ink-secondary">Sito</th>
                  <th className="px-4 py-3 text-left text-label text-ink-secondary">Stato</th>
                  <th className="px-4 py-3 text-left text-label text-ink-secondary">Data</th>
                  <th className="px-4 py-3 text-left text-label text-ink-secondary">Azioni</th>
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
          <h2 className="font-display text-h2 text-navy mb-4">Aziende attive ({active.length})</h2>
          <div className="rounded-lg border border-border bg-white overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-label text-ink-secondary">Azienda</th>
                  <th className="px-4 py-3 text-left text-label text-ink-secondary">Contatto</th>
                  <th className="px-4 py-3 text-left text-label text-ink-secondary">Sito</th>
                  <th className="px-4 py-3 text-left text-label text-ink-secondary">Stato</th>
                  <th className="px-4 py-3 text-left text-label text-ink-secondary">Data</th>
                  <th className="px-4 py-3 text-left text-label text-ink-secondary">Azioni</th>
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
          <h2 className="font-display text-h2 text-navy mb-4">Altre ({others.length})</h2>
          <div className="rounded-lg border border-border bg-white overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-label text-ink-secondary">Azienda</th>
                  <th className="px-4 py-3 text-left text-label text-ink-secondary">Contatto</th>
                  <th className="px-4 py-3 text-left text-label text-ink-secondary">Sito</th>
                  <th className="px-4 py-3 text-left text-label text-ink-secondary">Stato</th>
                  <th className="px-4 py-3 text-left text-label text-ink-secondary">Data</th>
                  <th className="px-4 py-3 text-left text-label text-ink-secondary">Azioni</th>
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
          <p className="text-body text-ink-secondary">Nessuna azienda registrata ancora.</p>
        </div>
      )}
    </div>
  );
}
