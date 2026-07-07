"use client";

interface Invitation {
  id: string;
  invited_email: string;
  status: string;
  metadata: Record<string, unknown>;
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-warning-bg text-warning",
  accepted: "bg-success-bg text-success",
  expired: "bg-navy-50 text-navy-200",
  revoked: "bg-error-bg text-error",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "In attesa",
  accepted: "Accettato",
  expired: "Scaduto",
  revoked: "Revocato",
};

export function InvitationList({
  invitations,
  onRevoke,
  nameColumn = "Nome",
}: {
  invitations: Invitation[];
  onRevoke: (invitationId: string) => Promise<unknown>;
  nameColumn?: string;
}) {
  if (invitations.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-white p-8 text-center">
        <p className="text-body text-ink-secondary">Nessun invito ancora inviato</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-white overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">Email</th>
            <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">{nameColumn}</th>
            <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">Stato</th>
            <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">Scadenza</th>
            <th className="text-right text-eyebrow text-navy/60 uppercase py-3 px-4">Azioni</th>
          </tr>
        </thead>
        <tbody>
          {invitations.map((inv) => {
            const metadata = inv.metadata as Record<string, string>;
            const name = metadata?.association_name ?? metadata?.company_name ?? "—";
            return (
              <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-navy-50/50">
                <td className="py-4 px-4 text-body text-ink">{inv.invited_email}</td>
                <td className="py-4 px-4 text-body text-ink">{name}</td>
                <td className="py-4 px-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-body-sm font-medium ${STATUS_STYLES[inv.status] ?? "bg-navy-50 text-navy"}`}>
                    {STATUS_LABELS[inv.status] ?? inv.status}
                  </span>
                </td>
                <td className="py-4 px-4 text-body-sm text-ink-secondary">
                  {new Date(inv.expires_at).toLocaleDateString("it-IT")}
                </td>
                <td className="py-4 px-4 text-right">
                  {inv.status === "pending" && (
                    <form action={() => onRevoke(inv.id)}>
                      <button
                        type="submit"
                        className="text-body-sm text-error hover:text-error/80 transition-colors duration-100"
                      >
                        Revoca
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
