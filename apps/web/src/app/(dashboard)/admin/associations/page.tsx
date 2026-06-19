import { createServerClient } from "@mira/supabase/server";

export default async function AdminAssociationsPage() {
  const supabase = await createServerClient();

  const { data: associations } = await supabase
    .from("association_profiles")
    .select("*, association_memberships(user_id, role, profiles(full_name, email))")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-h1 text-navy">Associazioni</h1>
        <p className="mt-1 text-body text-ink-secondary">
          Tutte le associazioni registrate su MIRA
        </p>
      </div>

      {!associations?.length ? (
        <div className="rounded-lg border border-border bg-white p-8 text-center">
          <p className="text-body text-ink-secondary">
            Nessuna associazione ancora registrata. Inizia invitando un presidente.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-white overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">Nome</th>
                <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">Categoria</th>
                <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">Stato pagina</th>
                <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">Presidente</th>
                <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">Creata il</th>
              </tr>
            </thead>
            <tbody>
              {associations.map((assoc) => {
                const president = (assoc.association_memberships as Array<Record<string, unknown>>)?.find(
                  (m) => m.role === "association_president"
                );
                return (
                  <tr key={assoc.id} className="border-b border-border last:border-0 hover:bg-navy-50/50">
                    <td className="py-4 px-4">
                      <p className="text-body font-medium text-navy">{assoc.name}</p>
                      <p className="text-body-sm text-ink-tertiary">/{assoc.slug}</p>
                    </td>
                    <td className="py-4 px-4 text-body text-ink">
                      {assoc.category ?? "—"}
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-body-sm font-medium bg-navy-50 text-navy">
                        {assoc.public_page_status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-body-sm text-ink">
                      {(president as Record<string, Record<string, string>>)?.profiles?.full_name ?? "—"}
                    </td>
                    <td className="py-4 px-4 text-body-sm text-ink-secondary">
                      {new Date(assoc.created_at).toLocaleDateString("it-IT")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
