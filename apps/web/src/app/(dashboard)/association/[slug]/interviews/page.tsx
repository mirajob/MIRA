import { createServerClient } from "@mira/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function InterviewsPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createServerClient();

  const { data: association } = await supabase
    .from("association_profiles")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (!association) notFound();

  const { data: interviews } = await supabase
    .from("interview_invites")
    .select(`
      *,
      applications(id, profiles(full_name, email)),
      profiles!interview_invites_sent_by_user_id_fkey(full_name)
    `)
    .eq("association_id", association.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-h2 text-navy">Colloqui</h2>
        <p className="mt-1 text-body text-ink-secondary">Inviti a colloquio inviati</p>
      </div>

      {!interviews?.length ? (
        <div className="rounded-lg border border-border bg-white p-8 text-center">
          <p className="text-body text-ink-secondary">
            Nessun colloquio programmato. Invita i candidati dalla pagina di dettaglio candidato.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {interviews.map((inv) => {
            const candidate = (inv.applications as { profiles: { full_name: string | null; email: string } })?.profiles;
            const sentBy = (inv.profiles as { full_name: string | null })?.full_name;

            return (
              <div key={inv.id} className="rounded-lg border border-border bg-white p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-body font-medium text-navy">
                      {candidate?.full_name ?? candidate?.email ?? "Candidato"}
                    </p>
                    <div className="mt-1 flex gap-3 text-body-sm text-ink-tertiary">
                      {inv.selected_time && (
                        <span>
                          {new Date(inv.selected_time).toLocaleDateString("it-IT", {
                            weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                          })}
                        </span>
                      )}
                      {inv.location_or_link && <span>{inv.location_or_link}</span>}
                      <span>Inviato da {sentBy ?? "—"}</span>
                    </div>
                    {inv.message && (
                      <p className="mt-2 text-body-sm text-ink-secondary">{inv.message}</p>
                    )}
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-body-sm font-medium ${
                    inv.status === "sent" ? "bg-petrol-50 text-petrol-700"
                    : inv.status === "accepted" ? "bg-success-bg text-success"
                    : inv.status === "completed" ? "bg-navy-50 text-navy"
                    : "bg-warning-bg text-warning"
                  }`}>
                    {inv.status === "sent" ? "Inviato" : inv.status === "accepted" ? "Accettato" : inv.status === "completed" ? "Completato" : inv.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
