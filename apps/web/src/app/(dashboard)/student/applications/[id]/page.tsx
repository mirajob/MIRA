import { getUserContext } from "@/lib/auth";
import { createServerClient } from "@mira/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { APPLICATION_STATUS_LABELS } from "@mira/domain";

interface Props {
  params: Promise<{ id: string }>;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-navy-50 text-ink-tertiary",
  submitted: "bg-petrol-50 text-petrol-700",
  in_review: "bg-warning-bg text-warning",
  interview: "bg-petrol-50 text-petrol-700",
  accepted: "bg-success-bg text-success",
  rejected: "bg-error-bg text-error",
  waitlisted: "bg-navy-50 text-navy",
  withdrawn: "bg-navy-50 text-ink-tertiary",
};

/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function ApplicationDetailPage({ params }: Props) {
  const { id } = await params;
  const ctx = await getUserContext();
  if (!ctx.isStudent) redirect("/api/auth/redirect");

  const supabase = await createServerClient();

  const { data: application } = await (supabase.from("applications") as any)
    .select(`
      id, status, submitted_at, last_status_change_at, selected_role_preferences,
      association_profiles(name, slug, short_description, logo_url),
      application_cycles(title, description),
      application_answers(id, answer_text, application_questions(question_text)),
      application_status_events(id, previous_status, new_status, note, created_at, visible_to_candidate),
      interview_invites(id, selected_time, location_or_link, meeting_link, status, notes)
    `)
    .eq("id", id)
    .eq("student_user_id", ctx.profile.id)
    .maybeSingle();

  if (!application) notFound();

  const assoc = application.association_profiles as {
    name: string; slug: string; short_description: string | null; logo_url: string | null;
  } | null;
  const cycle = application.application_cycles as { title: string; description: string | null } | null;
  const answers = (application.application_answers ?? []) as Array<{
    id: string; answer_text: string | null;
    application_questions: { question_text: string };
  }>;
  const events = ((application.application_status_events ?? []) as Array<{
    id: string; previous_status: string | null; new_status: string;
    note: string | null; created_at: string; visible_to_candidate: boolean;
  }>)
    .filter((e) => e.visible_to_candidate)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const interviews = (application.interview_invites ?? []) as Array<{
    id: string; selected_time: string | null; location_or_link: string | null;
    meeting_link: string | null; status: string; notes: string | null;
  }>;
  const activeInterview = interviews.find((i) => i.status !== "cancelled");

  const selectedRole = (application.selected_role_preferences as string[] | null)?.[0];

  return (
    <div className="mx-auto max-w-2xl px-6 py-6 space-y-6">
      {/* Back */}
      <Link href="/student/applications" className="text-body-sm text-ink-tertiary hover:text-navy transition-colors">
        ← Tutte le candidature
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4">
        {assoc?.logo_url ? (
          <img src={assoc.logo_url} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-navy text-white text-h3 font-semibold shrink-0">
            {assoc?.name?.charAt(0) ?? "?"}
          </div>
        )}
        <div className="flex-1">
          <h1 className="font-display text-h2 text-navy">{assoc?.name ?? "Associazione"}</h1>
          <p className="text-body-sm text-ink-tertiary mt-0.5">
            {cycle?.title}
            {selectedRole && selectedRole !== "generica" && ` · Ruolo: ${selectedRole}`}
            {application.submitted_at && ` · Inviata il ${new Date(application.submitted_at).toLocaleDateString("it-IT")}`}
          </p>
        </div>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-body-sm font-medium shrink-0 ${STATUS_COLORS[application.status] ?? "bg-navy-50 text-navy"}`}>
          {APPLICATION_STATUS_LABELS[application.status] ?? application.status}
        </span>
      </div>

      {/* Accepted message */}
      {application.status === "accepted" && (
        <div className="rounded-lg border border-success bg-success-bg p-5">
          <p className="font-medium text-success">Congratulazioni! Sei stato accettato in {assoc?.name}.</p>
          <p className="text-body-sm text-success/80 mt-1">
            Puoi gestire la tua attività nell&apos;associazione dalla sezione Associazioni.
          </p>
        </div>
      )}

      {/* Interview info */}
      {activeInterview && (
        <div className="rounded-lg border border-petrol-200 bg-petrol-50 p-5 space-y-2">
          <p className="font-sans text-h3 text-navy">Colloquio</p>
          {activeInterview.selected_time && (
            <p className="text-body-sm text-ink">
              {new Date(activeInterview.selected_time).toLocaleDateString("it-IT", {
                weekday: "long", day: "numeric", month: "long",
                year: "numeric", hour: "2-digit", minute: "2-digit",
              })}
            </p>
          )}
          {activeInterview.location_or_link && (
            <p className="text-body-sm text-ink-secondary">{activeInterview.location_or_link}</p>
          )}
          {activeInterview.meeting_link && (
            <a
              href={activeInterview.meeting_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-body-sm text-petrol underline underline-offset-2"
            >
              Entra al meeting →
            </a>
          )}
          {activeInterview.notes && (
            <p className="text-body-sm text-ink-secondary border-t border-petrol-200 pt-2 mt-2">{activeInterview.notes}</p>
          )}
        </div>
      )}

      {/* Timeline */}
      {events.length > 0 && (
        <div className="rounded-lg border border-border bg-white p-5">
          <h2 className="font-sans text-h3 text-navy mb-4">Aggiornamenti</h2>
          <div className="relative">
            <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-5 pl-8">
              {events.map((ev, i) => (
                <div key={ev.id} className="relative">
                  <div className={`absolute -left-6 top-1 h-3 w-3 rounded-full border-2 ${
                    i === events.length - 1 ? "bg-navy border-navy" : "bg-white border-border"
                  }`} />
                  <p className="text-body-sm font-medium text-ink">
                    {APPLICATION_STATUS_LABELS[ev.new_status] ?? ev.new_status}
                  </p>
                  <p className="text-xs text-ink-tertiary mt-0.5">
                    {new Date(ev.created_at).toLocaleDateString("it-IT", {
                      day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                  {ev.note && (
                    <p className="mt-1.5 text-body-sm text-ink-secondary bg-paper rounded px-3 py-2">{ev.note}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Application answers */}
      {answers.length > 0 && (
        <div className="rounded-lg border border-border bg-white p-5">
          <h2 className="font-sans text-h3 text-navy mb-4">Le tue risposte</h2>
          <div className="space-y-4">
            {answers.map((a) => (
              <div key={a.id}>
                <p className="text-xs font-medium text-ink-tertiary uppercase mb-1">
                  {a.application_questions?.question_text}
                </p>
                <p className="text-body-sm text-ink whitespace-pre-wrap">{a.answer_text ?? "—"}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Association description */}
      {assoc?.short_description && (
        <div className="rounded-lg border border-border bg-white p-5">
          <h2 className="font-sans text-h3 text-navy mb-2">Chi è {assoc.name}</h2>
          <p className="text-body-sm text-ink-secondary">{assoc.short_description}</p>
          <Link
            href={`/associations/${assoc.slug}`}
            className="mt-3 inline-block text-body-sm text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700"
          >
            Vedi pagina pubblica →
          </Link>
        </div>
      )}
    </div>
  );
}
