import { getUserContext } from "@/lib/auth";
import { createServerClient } from "@mira/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { JoinByCode } from "@/components/join-by-code";
import { WORKSPACE_ROLES } from "@/lib/association-roles";

const ROLE_LABELS: Record<string, string> = {
  association_president: "Presidente",
  association_admin: "Admin",
  association_reviewer: "Reviewer",
  association_interviewer: "Interviewer",
  association_member: "Membro",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Bozza",
  submitted: "Inviata",
  in_review: "In revisione",
  interview: "Colloquio",
  accepted: "Accettata",
  rejected: "Rifiutata",
  waitlisted: "Lista d'attesa",
};

export default async function StudentAssociazioniPage() {
  const ctx = await getUserContext();
  if (!ctx.isStudent) redirect("/api/auth/redirect");

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const supabase = await createServerClient();
  const profileId = (ctx.profile as any).id as string;

  const { data: associations } = await (supabase.from("association_profiles") as any)
    .select("id, name, slug, category, short_description, logo_url, sectors")
    .eq("public_page_status", "published")
    .order("name");

  const { data: openCycles } = await (supabase.from("application_cycles") as any)
    .select("id, title, closes_at, association_id")
    .eq("status", "open");

  const { data: myApplications } = await (supabase.from("applications") as any)
    .select("id, status, association_id, application_cycle_id, application_cycles(title, status), association_profiles(name, slug)")
    .eq("student_user_id", profileId)
    .order("submitted_at", { ascending: false });

  const { data: myMemberships } = await (supabase.from("association_memberships") as any)
    .select("association_id, role, joined_at, association_profiles(name, slug, verification_status, public_page_status)")
    .eq("user_id", profileId)
    .eq("status", "active");

  const { data: studentProfile } = await (supabase.from("student_profiles") as any)
    .select("onboarding_completed")
    .eq("user_id", profileId)
    .maybeSingle();

  const cyclesByAssoc = new Map<string, any[]>();
  for (const c of openCycles ?? []) {
    const list = cyclesByAssoc.get(c.association_id) ?? [];
    list.push(c);
    cyclesByAssoc.set(c.association_id, list);
  }

  // Only track applications to OPEN cycles (ignore old closed/rejected ones)
  const appsByAssoc = new Map<string, any>();
  const openCycleIds = new Set((openCycles ?? []).map((c: any) => c.id));
  for (const a of myApplications ?? []) {
    if (openCycleIds.has(a.application_cycle_id)) {
      if (!appsByAssoc.has(a.association_id)) {
        appsByAssoc.set(a.association_id, a);
      }
    }
  }

  // Active/pending applications (for the "Le tue candidature" section)
  const activeApplications = (myApplications ?? []).filter((a: any) => {
    const cycleStatus = a.application_cycles?.status;
    return cycleStatus === "open" || ["submitted", "in_review", "interview", "waitlisted"].includes(a.status);
  });

  const membershipByAssoc = new Map<string, any>();
  for (const m of myMemberships ?? []) {
    membershipByAssoc.set(m.association_id, m);
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-6 space-y-5">
      <h1 className="font-display text-h2 text-navy">Associazioni</h1>

      <JoinByCode />

      {(() => {
        const pendingPages = (myMemberships ?? []).filter(
          (m: any) => WORKSPACE_ROLES.includes(m.role) && m.association_profiles?.public_page_status === "draft"
        );
        const showOnboardingPrompt = (myMemberships ?? []).length > 0 && !studentProfile?.onboarding_completed;

        if (pendingPages.length === 0 && !showOnboardingPrompt) return null;

        return (
          <div className="rounded-lg border border-petrol/30 bg-petrol-50 p-5 space-y-3">
            <h2 className="font-sans text-h3 text-navy">Prossimi passi</h2>

            {pendingPages.map((m: any) => (
              <div key={m.association_id} className="flex items-center justify-between gap-3 rounded-md bg-white px-4 py-3">
                <span className="text-body text-ink">
                  La pagina di <strong className="text-navy">{m.association_profiles.name}</strong> non è ancora pubblica
                </span>
                <Link
                  href={`/association/${m.association_profiles.slug}/public-page`}
                  className="flex-shrink-0 bg-navy text-white px-4 py-1.5 rounded-md text-body-sm hover:bg-navy-700 transition-colors duration-100"
                >
                  Completala →
                </Link>
              </div>
            ))}

            {showOnboardingPrompt && (
              <Link
                href="/student/onboarding"
                className="block rounded-md bg-white px-4 py-3 text-body-sm text-petrol-700 hover:bg-petrol-100/50 transition-colors"
              >
                Completa il tuo profilo MiraCard (~5 minuti) →
              </Link>
            )}
          </div>
        );
      })()}

      {activeApplications.length > 0 && (
        <div className="rounded-lg border border-border bg-white p-5">
          <h2 className="font-sans text-h3 text-navy mb-3">Le tue candidature</h2>
          <div className="space-y-2">
            {activeApplications.map((app: any) => (
              <div
                key={app.id}
                className="flex items-center justify-between rounded-md px-3 py-2"
              >
                <span className="text-body text-ink">{app.association_profiles?.name ?? "—"}</span>
                <span className={`text-body-sm ${app.status === "accepted" ? "text-success" : app.status === "rejected" ? "text-error" : "text-ink-tertiary"}`}>
                  {STATUS_LABELS[app.status] ?? app.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {(associations ?? []).map((assoc: any) => {
          const cycles = cyclesByAssoc.get(assoc.id) ?? [];
          const myApp = appsByAssoc.get(assoc.id);
          const membership = membershipByAssoc.get(assoc.id);
          const hasOpenCycle = cycles.length > 0;

          return (
            <div key={assoc.id} className="rounded-lg border border-border bg-white p-5">
              <div className="flex items-start gap-3">
                {assoc.logo_url ? (
                  <img src={assoc.logo_url} alt="" className="h-10 w-10 rounded-md object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-navy text-white text-label font-semibold shrink-0">
                    {assoc.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-sans text-h3 text-navy">{assoc.name}</h3>
                    {membership && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-petrol-50 text-petrol-700">
                        {ROLE_LABELS[membership.role] ?? membership.role}
                      </span>
                    )}
                  </div>
                  {assoc.category && (
                    <p className="text-body-sm text-ink-tertiary">
                      {assoc.category.charAt(0).toUpperCase() + assoc.category.slice(1).replace("_", " ")}
                    </p>
                  )}
                </div>
              </div>

              {assoc.short_description && (
                <p className="mt-2 text-body-sm text-ink-secondary">{assoc.short_description}</p>
              )}

              {assoc.sectors?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {assoc.sectors.map((s: string) => (
                    <span key={s} className="px-2 py-0.5 rounded-full text-xs font-medium bg-navy-50 text-navy">
                      {s}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-3 flex items-center gap-3">
                <Link
                  href={`/associations/${assoc.slug}`}
                  className="text-body-sm text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700"
                >
                  Vedi pagina
                </Link>

                {membership ? (
                  <Link
                    href={`/association/${assoc.slug}`}
                    className="bg-petrol text-white px-4 py-1.5 rounded-md text-body-sm hover:bg-petrol-700 transition-colors duration-100"
                  >
                    Gestisci
                  </Link>
                ) : myApp ? (
                  <span className="text-body-sm text-ink-secondary">
                    Candidatura: {STATUS_LABELS[myApp.status] ?? myApp.status}
                  </span>
                ) : hasOpenCycle ? (
                  <Link
                    href={`/associations/${assoc.slug}/apply?cycle=${cycles[0].id}`}
                    className="bg-navy text-white px-4 py-1.5 rounded-md text-body-sm hover:bg-navy-700 transition-colors duration-100"
                  >
                    Candidati
                  </Link>
                ) : (
                  <span className="text-body-sm text-ink-tertiary">Candidature chiuse</span>
                )}
              </div>
            </div>
          );
        })}

        {!(associations?.length) && (
          <div className="rounded-lg border border-border bg-white p-8 text-center">
            <p className="text-body text-ink-secondary">Nessuna associazione disponibile al momento.</p>
          </div>
        )}
      </div>
    </div>
  );
}
