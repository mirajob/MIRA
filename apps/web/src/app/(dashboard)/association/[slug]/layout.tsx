import { getUserContext } from "@/lib/auth";
import { createServerClient } from "@mira/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { hasWorkspaceAccess } from "@/lib/association-roles";

interface Props {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

export default async function AssociationWorkspaceLayout({ params, children }: Props) {
  const { slug } = await params;
  const ctx = await getUserContext();
  const supabase = await createServerClient();
  const t = await getTranslations("AssociationLayout");
  const c = await getTranslations("Common");

  const getAssociationNav = (slug: string) => [
    { label: t("navCicli"), href: `/association/${slug}/cycles` },
    { label: t("navCandidati"), href: `/association/${slug}/candidates` },
    { label: t("navMembri"), href: `/association/${slug}/board` },
    { label: t("navPaginaPubblica"), href: `/association/${slug}/public-page` },
  ];

  const { data: association } = await supabase
    .from("association_profiles")
    .select("id, name, slug, logo_url, verification_status, public_page_status")
    .eq("slug", slug)
    .maybeSingle();

  if (!association) notFound();

  const { data: membership } = await supabase
    .from("association_memberships")
    .select("role, permissions")
    .eq("association_id", association.id)
    .eq("user_id", ctx.profile.id)
    .eq("status", "active")
    .maybeSingle();

  if (!membership && !ctx.isMiraAdmin) {
    redirect("/student");
  }

  // Block simple members (no permissions) from workspace — same rule the UI
  // uses to decide whether to even show "Gestisci"/sidebar entries.
  if (membership && !ctx.isMiraAdmin && !hasWorkspaceAccess(membership)) {
    redirect("/student");
  }

  // L'admin MIRA vede sempre la dashboard (deve poter revisionare/approvare).
  const isPending = !ctx.isMiraAdmin && association.verification_status !== "verified";

  const associationHeader = (
    <div className="mb-6 flex items-center gap-3">
      {association.logo_url ? (
        <img src={association.logo_url} alt="" className="h-10 w-10 rounded-md object-cover" />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-navy text-white text-label font-semibold">
          {association.name.charAt(0)}
        </div>
      )}
      <div>
        <h1 className="font-sans text-h3 text-navy">{association.name}</h1>
        <p className="text-body-sm text-ink-tertiary">
          {c.has(`boardRoles.${membership?.role}`) ? c(`boardRoles.${membership?.role}`) : c("boardRoles.association_admin")}
        </p>
      </div>
    </div>
  );

  // Finché MIRA non approva l'associazione, il board NON vede la dashboard: al suo
  // posto, inline (stessa pagina, sidebar mantenuta), lo stato "in attesa di
  // approvazione". Nessun redirect: cliccando la voce in sidebar resta qui.
  if (isPending) {
    return (
      <div>
        {associationHeader}
        <div className="rounded-lg border border-petrol/30 bg-petrol-50 p-6">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/70 border border-petrol/20">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-petrol">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <h2 className="font-display text-h2 text-navy mb-2">{t("pendingHeading", { name: association.name })}</h2>
          <p className="text-body text-ink-secondary max-w-xl">{t("pendingBody")}</p>
        </div>
      </div>
    );
  }

  const nav = getAssociationNav(slug);

  const { data: studentProfile } = await supabase
    .from("student_profiles")
    .select("onboarding_completed")
    .eq("user_id", ctx.profile.id)
    .maybeSingle();

  const showOnboardingBanner = membership && studentProfile && !studentProfile.onboarding_completed;

  // Finché la pagina pubblica non è pubblicata, l'associazione non compare ai
  // candidati: lo diciamo con un banner su ogni tab, così non aprono un ciclo
  // pensando di essere già visibili. Sparisce da solo appena pubblicano.
  const showPublicPageBanner = association.public_page_status !== "published";

  return (
    <div>
      {showOnboardingBanner && (
        <Link
          href="/student/onboarding"
          className="mb-6 block rounded-lg border border-petrol/30 bg-petrol-50 px-4 py-3 text-body-sm text-petrol-700 hover:bg-petrol-100 transition-colors"
        >
          {t("onboardingBanner")}
        </Link>
      )}

      {showPublicPageBanner && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning-bg px-4 py-3">
          <p className="flex items-center gap-2 text-body-sm text-warning">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            {t("publicPageBanner")}
          </p>
          <Link
            href={`/association/${slug}/public-page`}
            className="shrink-0 text-body-sm font-medium text-navy underline underline-offset-2 hover:text-petrol transition-colors"
          >
            {t("publicPageBannerCta")}
          </Link>
        </div>
      )}

      {associationHeader}

      <nav className="mb-6 flex gap-1 border-b border-border pb-4 overflow-x-auto">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="whitespace-nowrap rounded-md px-3 py-2 text-body-sm font-medium text-ink-secondary hover:text-navy hover:bg-navy-50/50 transition-colors duration-100"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
