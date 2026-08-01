import { getUserContext } from "@/lib/auth";
import { createServerClient, createServiceClient } from "@mira/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { APPLICATION_STATUS_LABELS } from "@mira/domain";
import { JoinByCode } from "@/components/join-by-code";
import { WORKSPACE_ROLES, hasWorkspaceAccess } from "@/lib/association-roles";
import { MarkAssociationNotificationsRead } from "./mark-read";
import { MyMemberships } from "./my-memberships";
import { AssociationDirectory, type DirectoryAssociation } from "@/components/association-directory";

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

export default async function StudentAssociazioniPage({
  searchParams,
}: {
  searchParams: Promise<{ ateneo?: string }>;
}) {
  const ctx = await getUserContext();
  // L'admin MIRA passa anche senza profilo studente: è l'unico modo per rivedere
  // questa schermata com'è fatta davvero prima di pubblicare le pagine.
  if (!ctx.isStudent && !ctx.isMiraAdmin) redirect("/api/auth/redirect");

  const { ateneo } = await searchParams;

  const t = await getTranslations("Associazioni");
  const c = await getTranslations("Common");
  const locale = await getLocale();
  const dateLocale = locale === "it" ? "it-IT" : "en-US";

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const supabase = await createServerClient();
  const profileId = (ctx.profile as any).id as string;

  const { data: studentProfile } = await (supabase.from("student_profiles") as any)
    .select("onboarding_completed, university")
    .eq("user_id", profileId)
    .maybeSingle();

  // L'admin MIRA vede questa schermata in anteprima: stessa resa dello studente, ma
  // con dentro anche le pagine ancora in bozza e con la possibilità di cambiare
  // ateneo. Serve a giudicare l'insieme prima di pubblicare, non solo la singola pagina.
  const isAdminPreview = ctx.isMiraAdmin;

  // Atenei disponibili per il selettore dell'anteprima admin.
  const { data: allUniversities } = isAdminPreview
    ? await (supabase.from("association_profiles") as any).select("university")
    : { data: [] };
  const universityOptions = [
    ...new Set(((allUniversities ?? []) as any[]).map((a) => a.university).filter(Boolean)),
  ].sort((a: string, b: string) => a.localeCompare(b));

  // L'account admin può non avere un profilo studente: senza un ripiego sul primo
  // ateneo disponibile la schermata risulterebbe vuota e sembrerebbe rotta.
  const university = isAdminPreview
    ? (ateneo || studentProfile?.university || universityOptions[0] || "")
    : (studentProfile?.university ?? "");

  // Ogni associazione eredita l'università del presidente che l'ha candidata: uno
  // studente vede e si candida solo alle associazioni della propria università.
  let associationsQuery = (supabase.from("association_profiles") as any)
    .select("id, name, slug, category, short_description, logo_url, sectors, claim_status, public_page_status")
    .eq("university", university)
    .order("name");
  if (!isAdminPreview) {
    associationsQuery = associationsQuery.eq("public_page_status", "published");
  }
  const { data: associations } = await associationsQuery;

  const { data: openCycles } = await (supabase.from("application_cycles") as any)
    .select("id, title, closes_at, association_id")
    .eq("status", "open");

  const { data: myApplications } = await (supabase.from("applications") as any)
    .select(`
      id, status, association_id, application_cycle_id, submitted_at,
      association_profiles(name, slug, logo_url),
      application_cycles(title, status),
      interview_invites(id, selected_time, location_or_link, status)
    `)
    .eq("student_user_id", profileId)
    .order("submitted_at", { ascending: false });

  const { data: myMemberships } = await (supabase.from("association_memberships") as any)
    .select("association_id, role, permissions, joined_at, association_profiles(name, slug, verification_status, public_page_status)")
    .eq("user_id", profileId)
    .eq("status", "active");

  // Richieste di prendere in gestione una pagina non ancora rivendicata: è qui che
  // chi l'ha mandata ne segue lo stato. La tabella non ha policy client-side, quindi
  // si legge col service client filtrando sull'utente corrente.
  const service = await createServiceClient();
  const { data: myClaimRequests } = await (service.from("association_claim_requests") as any)
    .select("id, status, rejected_reason, association_profiles(name, slug)")
    .eq("user_id", profileId)
    .order("created_at", { ascending: false });

  const cyclesByAssoc = new Map<string, any[]>();
  for (const c of openCycles ?? []) {
    const list = cyclesByAssoc.get(c.association_id) ?? [];
    list.push(c);
    cyclesByAssoc.set(c.association_id, list);
  }

  // Only track applications to OPEN cycles for the "already applied" state on each association card
  const appsByAssoc = new Map<string, any>();
  const openCycleIds = new Set((openCycles ?? []).map((c: any) => c.id));
  for (const a of myApplications ?? []) {
    if (openCycleIds.has(a.application_cycle_id) && !appsByAssoc.has(a.association_id)) {
      appsByAssoc.set(a.association_id, a);
    }
  }

  const membershipByAssoc = new Map<string, any>();
  for (const m of myMemberships ?? []) {
    membershipByAssoc.set(m.association_id, m);
  }

  const directoryRows: DirectoryAssociation[] = (associations ?? []).map((assoc: any) => {
    const membership = membershipByAssoc.get(assoc.id);
    const myApp = appsByAssoc.get(assoc.id);
    return {
      id: assoc.id,
      name: assoc.name,
      slug: assoc.slug,
      category: assoc.category ?? null,
      shortDescription: assoc.short_description ?? null,
      // Una pagina seminata non ha un board che gestisce le candidature, quindi non
      // può avere cicli aperti: il pallino non le riguarda mai.
      hasOpenCycle: assoc.claim_status !== "seeded" && (cyclesByAssoc.get(assoc.id) ?? []).length > 0,
      isDraft: assoc.public_page_status !== "published",
      roleLabel: membership
        ? (c.has(`boardRoles.${membership.role}`) ? c(`boardRoles.${membership.role}`) : membership.role)
        : null,
      applicationLabel: myApp
        ? (APPLICATION_STATUS_LABELS[myApp.status] ?? myApp.status)
        : null,
    };
  });

  return (
    // Piu' largo del solito max-w-2xl: l'indice va su due colonne e con oltre cento
    // associazioni una colonna sola diventa un rotolo infinito.
    <div className="mx-auto max-w-4xl px-6 py-6 space-y-6">
      <MarkAssociationNotificationsRead />

      <div>
        <h1 className="font-display text-h2 text-navy">{t("pageTitle")}</h1>
        <p className="mt-1 text-body text-ink-secondary">
          {t("pageSubtitle")}
        </p>
      </div>

      <JoinByCode />

      {/* Membership semplici: chi ha un ruolo di board compare gia' piu' sotto con la
          scorciatoia "Gestisci", quindi qui lo escludiamo per non duplicarlo. */}
      <MyMemberships
        memberships={(myMemberships ?? [])
          .filter((m: any) => !hasWorkspaceAccess(m))
          .map((m: any) => ({
            associationId: m.association_id as string,
            name: (m.association_profiles?.name as string) ?? c("associationFallback"),
          }))}
      />

      {(() => {
        const workspaceMemberships = (myMemberships ?? []).filter((m: any) => WORKSPACE_ROLES.includes(m.role));
        // Non ancora approvata da MIRA: mostra "in attesa di approvazione" e manda
        // alla pagina post-invio. La pagina pubblica si completa solo DOPO l'ok.
        const pendingApproval = workspaceMemberships.filter(
          (m: any) => m.association_profiles?.verification_status !== "verified"
        );
        const pendingPages = workspaceMemberships.filter(
          (m: any) =>
            m.association_profiles?.verification_status === "verified" &&
            m.association_profiles?.public_page_status === "draft"
        );
        const showOnboardingPrompt = (myMemberships ?? []).length > 0 && !studentProfile?.onboarding_completed;

        const showTodo = pendingPages.length > 0 || showOnboardingPrompt;

        if (pendingApproval.length === 0 && !showTodo) return null;

        return (
          <div className="space-y-4">
            {/* In attesa di approvazione: box informativo, nessuna azione, niente "Da fare". */}
            {pendingApproval.map((m: any) => (
              <div key={m.association_id} className="rounded-lg border border-petrol/30 bg-petrol-50 px-5 py-4">
                <span className="text-body text-ink">
                  {t.rich("associationPending", {
                    name: m.association_profiles.name,
                    strong: (chunks) => <strong className="text-navy">{chunks}</strong>,
                  })}
                </span>
              </div>
            ))}

            {/* Da fare: azioni concrete (costruire la pagina pubblica, completare il profilo). */}
            {showTodo && (
              <div className="rounded-lg border border-petrol/30 bg-petrol-50 p-5 space-y-3">
                <h2 className="font-sans text-h3 text-navy">{t("todoHeading")}</h2>

                {pendingPages.map((m: any) => (
                  <div key={m.association_id} className="flex items-center justify-between gap-3 rounded-md bg-white px-4 py-3">
                    <span className="text-body text-ink">
                      {t.rich("pageNotPublic", {
                        name: m.association_profiles.name,
                        strong: (chunks) => <strong className="text-navy">{chunks}</strong>,
                      })}
                    </span>
                    <Link
                      href={`/association/${m.association_profiles.slug}/public-page`}
                      className="flex-shrink-0 bg-navy text-white px-4 py-1.5 rounded-md text-body-sm hover:bg-navy-700 transition-colors duration-100"
                    >
                      {t("completePageCta")}
                    </Link>
                  </div>
                ))}

                {showOnboardingPrompt && (
                  <Link
                    href="/student/onboarding"
                    className="block rounded-md bg-white px-4 py-3 text-body-sm text-petrol-700 hover:bg-petrol-100/50 transition-colors"
                  >
                    {t("completeProfileCta")}
                  </Link>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Richieste di gestione di una pagina associazione */}
      {(myClaimRequests ?? []).length > 0 && (
        <div>
          <h2 className="font-sans text-h3 text-navy mb-3">{t("claimRequestsHeading")}</h2>
          <div className="rounded-lg border border-border bg-white divide-y divide-border">
            {(myClaimRequests as any[]).map((req) => (
              <div key={req.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
                <p className="text-body-sm text-navy font-medium">
                  {req.association_profiles?.name ?? c("associationFallback")}
                </p>
                <span
                  className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
                    req.status === "approved"
                      ? "bg-success-bg text-success"
                      : req.status === "rejected"
                        ? "bg-error-bg text-error"
                        : "bg-warning-bg text-warning"
                  }`}
                >
                  {req.status === "approved"
                    ? t("claimStatusApproved")
                    : req.status === "rejected"
                      ? t("claimStatusRejected")
                      : t("claimStatusPending")}
                </span>
                {req.status === "rejected" && req.rejected_reason && (
                  <p className="w-full text-body-sm text-ink-tertiary">{req.rejected_reason}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Le tue candidature */}
      <div>
        <h2 className="font-sans text-h3 text-navy mb-3">{t("myApplicationsHeading")}</h2>

        {!myApplications?.length ? (
          <div className="rounded-lg border border-border bg-white p-6 text-center">
            <p className="text-body-sm text-ink-secondary">{t("noApplications")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(myApplications as any[]).map((app) => {
              const assoc = app.association_profiles as { name: string; slug: string; logo_url: string | null } | null;
              const cycle = app.application_cycles as { title: string } | null;
              const interviews = (app.interview_invites ?? []) as Array<{
                id: string; selected_time: string | null; location_or_link: string | null; status: string;
              }>;
              const upcomingInterview = interviews.find((i) => i.selected_time && i.status !== "cancelled");

              return (
                <div
                  key={app.id}
                  className="rounded-lg border border-border bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {assoc?.logo_url && (
                        <img src={assoc.logo_url} alt="" className="h-9 w-9 rounded-md object-cover shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-sans text-h3 text-navy">{assoc?.name ?? c("associationFallback")}</p>
                        <p className="text-body-sm text-ink-tertiary mt-0.5">
                          {cycle?.title}
                          {app.submitted_at && c("submittedOn", { date: new Date(app.submitted_at).toLocaleDateString(dateLocale, { timeZone: APP_TIME_ZONE }) })}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUS_COLORS[app.status] ?? "bg-navy-50 text-navy"}`}>
                      {APPLICATION_STATUS_LABELS[app.status] ?? app.status}
                    </span>
                  </div>

                  {upcomingInterview && (
                    <div className="mt-3 rounded-md bg-petrol-50 px-3 py-2">
                      <p className="text-xs font-medium text-navy">{t("interviewScheduled")}</p>
                      <p className="text-body-sm text-ink mt-0.5">
                        {new Date(upcomingInterview.selected_time!).toLocaleDateString(dateLocale, { timeZone: APP_TIME_ZONE,
                          weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                      {upcomingInterview.location_or_link && (
                        <p className="text-body-sm text-ink-secondary">{upcomingInterview.location_or_link}</p>
                      )}
                    </div>
                  )}

                  {app.status === "accepted" && (
                    <div className="mt-3 rounded-md bg-success-bg px-3 py-2">
                      <p className="text-body-sm text-success font-medium">{t("congratsAccepted")}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Indice delle associazioni dell'ateneo: sezioni per ambito, righe compatte.
          La query e' gia' filtrata per universita'. */}
      <div>
        <h2 className="font-sans text-h3 text-navy mb-3">{t("allAssociationsHeading")}</h2>

        {isAdminPreview && (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-body-sm text-ink">{t("adminPreviewNotice")}</p>
            {universityOptions.length > 1 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {universityOptions.map((u: string) => (
                  <Link
                    key={u}
                    href={`/student/associazioni?ateneo=${encodeURIComponent(u)}`}
                    className={`rounded-full px-2.5 py-0.5 text-body-sm transition-colors duration-100 ${
                      u === university ? "bg-navy text-white" : "bg-white text-navy hover:bg-navy-50"
                    }`}
                  >
                    {u}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {directoryRows.length === 0 ? (
          <div className="rounded-lg border border-border bg-white p-8 text-center">
            <p className="text-body text-ink-secondary">{t("noAssociationsAvailable")}</p>
          </div>
        ) : (
          <AssociationDirectory associations={directoryRows} />
        )}
      </div>
    </div>
  );
}
