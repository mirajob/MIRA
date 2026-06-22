/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServiceClient } from "@mira/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function InterviewsPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createServiceClient();

  const { data: association } = await (supabase.from("association_profiles") as any)
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (!association) notFound();

  const { data: interviewApps } = await (supabase.from("applications") as any)
    .select("id, status, last_status_change_at, student_user_id, application_cycles(title)")
    .eq("association_id", association.id)
    .eq("status", "interview")
    .order("last_status_change_at", { ascending: false });

  const studentIds = (interviewApps ?? []).map((a: any) => a.student_user_id).filter(Boolean);
  const { data: profiles } = studentIds.length > 0
    ? await (supabase.from("profiles") as any)
        .select("id, full_name, email")
        .in("id", studentIds)
    : { data: [] };

  const profileMap = new Map<string, any>();
  for (const p of (profiles ?? [])) profileMap.set(p.id, p);

  const appIds = (interviewApps ?? []).map((a: any) => a.id);
  const { data: statusEvents } = appIds.length > 0
    ? await (supabase.from("application_status_events") as any)
        .select("application_id, note, created_at")
        .in("application_id", appIds)
        .eq("new_status", "interview")
        .order("created_at", { ascending: false })
    : { data: [] };

  const interviewNotes = new Map<string, any>();
  for (const ev of (statusEvents ?? [])) {
    if (!interviewNotes.has(ev.application_id)) {
      interviewNotes.set(ev.application_id, ev);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-h2 text-navy">Colloqui</h2>
        <p className="mt-1 text-body text-ink-secondary">
          {(interviewApps ?? []).length} candidati in fase colloquio
        </p>
      </div>

      {!(interviewApps ?? []).length ? (
        <div className="rounded-lg border border-border bg-white p-8 text-center">
          <p className="text-body text-ink-secondary">
            Nessun colloquio in programma. Convoca i candidati dalla pagina di dettaglio.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-white overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">Candidato</th>
                <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">Ciclo</th>
                <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">Dettagli colloquio</th>
                <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">Convocato il</th>
              </tr>
            </thead>
            <tbody>
              {(interviewApps ?? []).map((app: any) => {
                const profile = profileMap.get(app.student_user_id);
                const interviewInfo = interviewNotes.get(app.id);
                const note = interviewInfo?.note ?? "";
                const dateMatch = note.match(/Colloquio:\s*(.+?)(?:\s*\||$)/);
                const linkMatch = note.match(/Link:\s*(.+)/);

                return (
                  <tr key={app.id} className="border-b border-border last:border-0 hover:bg-navy-50/50">
                    <td className="py-4 px-4">
                      <Link href={`/association/${slug}/candidates/${app.id}`} className="block">
                        <p className="text-body font-medium text-navy hover:text-petrol transition-colors">
                          {profile?.full_name ?? "—"}
                        </p>
                        <p className="text-body-sm text-ink-tertiary">{profile?.email ?? ""}</p>
                      </Link>
                    </td>
                    <td className="py-4 px-4 text-body-sm text-ink">
                      {app.application_cycles?.title ?? "—"}
                    </td>
                    <td className="py-4 px-4">
                      {dateMatch?.[1] && (
                        <p className="text-body-sm text-ink">{dateMatch[1]}</p>
                      )}
                      {linkMatch?.[1] && (
                        <a href={linkMatch[1]} target="_blank" rel="noopener noreferrer" className="text-body-sm text-petrol underline underline-offset-2">
                          Link colloquio
                        </a>
                      )}
                      {!dateMatch && !linkMatch && (
                        <p className="text-body-sm text-ink-tertiary">Da programmare</p>
                      )}
                    </td>
                    <td className="py-4 px-4 text-body-sm text-ink-secondary">
                      {interviewInfo?.created_at
                        ? new Date(interviewInfo.created_at).toLocaleDateString("it-IT")
                        : app.last_status_change_at
                          ? new Date(app.last_status_change_at).toLocaleDateString("it-IT")
                          : "—"}
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
