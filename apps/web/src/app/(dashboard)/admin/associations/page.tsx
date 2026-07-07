import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revokeInvitation } from "@/lib/actions/invitations";
import { InvitationForm } from "./invitation-form";
import { InvitationList } from "@/components/admin/invitation-list";
import { ApproveRejectButtons } from "./approve-reject-buttons";

/* eslint-disable @typescript-eslint/no-explicit-any */

const STATUS_LABEL: Record<string, string> = {
  pending_verification: "In attesa",
  verified: "Attiva",
  rejected: "Rifiutata",
  suspended: "Sospesa",
};

const STATUS_CLASS: Record<string, string> = {
  pending_verification: "bg-amber-100 text-amber-700",
  verified: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-600",
  suspended: "bg-red-100 text-red-600",
};

function AssociationRow({ assoc }: { assoc: any }) {
  const president = (assoc.association_memberships as Array<Record<string, unknown>>)?.find(
    (m) => m.role === "association_president"
  );
  const presidentProfile = (president as any)?.profiles;

  return (
    <tr className="border-b border-border last:border-0 hover:bg-paper transition-colors">
      <td className="px-4 py-3">
        <p className="text-body font-medium text-navy">{assoc.name}</p>
        <p className="text-body-sm text-ink-tertiary">/{assoc.slug}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-body-sm text-ink">{presidentProfile?.full_name ?? "—"}</p>
        <p className="text-body-sm text-ink-tertiary">{presidentProfile?.email ?? assoc.contact_email ?? "—"}</p>
      </td>
      <td className="px-4 py-3 text-body text-ink">{assoc.category ?? "—"}</td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLASS[assoc.verification_status] ?? "bg-gray-100 text-gray-600"}`}>
          {STATUS_LABEL[assoc.verification_status] ?? assoc.verification_status}
        </span>
      </td>
      <td className="px-4 py-3 text-body-sm text-ink-tertiary">
        {new Date(assoc.created_at).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" })}
      </td>
      <td className="px-4 py-3">
        <ApproveRejectButtons associationId={assoc.id} status={assoc.verification_status} />
      </td>
    </tr>
  );
}

function AssociationTable({ rows }: { rows: any[] }) {
  return (
    <div className="rounded-lg border border-border bg-white overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-3 text-left text-label text-ink-secondary">Associazione</th>
            <th className="px-4 py-3 text-left text-label text-ink-secondary">Presidente</th>
            <th className="px-4 py-3 text-left text-label text-ink-secondary">Categoria</th>
            <th className="px-4 py-3 text-left text-label text-ink-secondary">Stato</th>
            <th className="px-4 py-3 text-left text-label text-ink-secondary">Data</th>
            <th className="px-4 py-3 text-left text-label text-ink-secondary">Azioni</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((assoc) => <AssociationRow key={assoc.id} assoc={assoc} />)}
        </tbody>
      </table>
    </div>
  );
}

export default async function AdminAssociationsPage() {
  const ctx = await getUserContext();
  if (!ctx.isMiraAdmin) redirect("/student");

  const supabase = await createServiceClient();

  const { data: associations } = await (supabase.from("association_profiles") as any)
    .select("*, association_memberships(user_id, role, profiles(full_name, email))")
    .order("created_at", { ascending: false });

  const { data: invitations } = await supabase
    .from("invitations")
    .select("*")
    .eq("invitation_type", "association_president")
    .order("created_at", { ascending: false });

  const pending = (associations ?? []).filter((a: any) => a.verification_status === "pending_verification");
  const active = (associations ?? []).filter((a: any) => a.verification_status === "verified");
  const others = (associations ?? []).filter((a: any) => !["pending_verification", "verified"].includes(a.verification_status));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-h1 text-navy">Associazioni</h1>
        <p className="mt-1 text-body text-ink-secondary">
          Candidature in attesa, inviti diretti e associazioni attive su MIRA
        </p>
      </div>

      {pending.length > 0 && (
        <section>
          <h2 className="font-display text-h2 text-navy mb-4">In attesa di approvazione ({pending.length})</h2>
          <AssociationTable rows={pending} />
        </section>
      )}

      <section>
        <InvitationForm />
      </section>

      <section>
        <h2 className="font-display text-h2 text-navy mb-4">Inviti inviati</h2>
        <InvitationList invitations={invitations ?? []} onRevoke={revokeInvitation} nameColumn="Associazione" />
      </section>

      <section>
        <h2 className="font-display text-h2 text-navy mb-4">Associazioni attive ({active.length})</h2>
        {active.length > 0 ? (
          <AssociationTable rows={active} />
        ) : (
          <div className="rounded-lg border border-border bg-white p-8 text-center">
            <p className="text-body text-ink-secondary">Nessuna associazione attiva ancora.</p>
          </div>
        )}
      </section>

      {others.length > 0 && (
        <section>
          <h2 className="font-display text-h2 text-navy mb-4">Altre ({others.length})</h2>
          <AssociationTable rows={others} />
        </section>
      )}
    </div>
  );
}
