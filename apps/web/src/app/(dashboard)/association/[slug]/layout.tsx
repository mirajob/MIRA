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
    .select("id, name, slug, logo_url")
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

  const nav = getAssociationNav(slug);

  const { data: studentProfile } = await supabase
    .from("student_profiles")
    .select("onboarding_completed")
    .eq("user_id", ctx.profile.id)
    .maybeSingle();

  const showOnboardingBanner = membership && studentProfile && !studentProfile.onboarding_completed;

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
