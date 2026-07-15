import { getUserContext } from "@/lib/auth";
import { SidebarNav } from "@/components/sidebar-nav";
import { UserNav } from "@/components/user-nav";
import { MobileHeader } from "@/components/mobile-header";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { getUnreadCounts } from "@/lib/actions/notifications";
import { hasWorkspaceAccess } from "@/lib/association-roles";
import Link from "next/link";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getUserContext();

  // Company users have their own full-page layout — skip the student sidebar entirely
  const isCompanyUser = ctx.globalRoles.includes("company_user") && !ctx.isMiraAdmin;
  if (isCompanyUser) {
    return <>{children}</>;
  }

  // In sidebar solo i workspace a cui si ha davvero accesso: un membro semplice
  // (es. candidato appena accettato) non deve vedere una voce che lo rimbalza.
  const memberships = ctx.memberships
    .filter((m) => hasWorkspaceAccess(m as { role: string; permissions?: unknown }))
    .map((m) => ({
      role: m.role,
      association_profiles: m.association_profiles as {
        name: string;
        slug: string;
      } | null,
    }));

  const unreadCounts = ctx.isStudent ? await getUnreadCounts() : { total: 0, aziende: 0, other: 0 };

  const navContent = (
    <SidebarNav
      isStudent={ctx.isStudent}
      isMiraAdmin={ctx.isMiraAdmin}
      memberships={memberships}
      unreadNotifications={unreadCounts.other}
      unreadAziende={unreadCounts.aziende}
    />
  );
  const userContent = (
    <div className="space-y-3">
      <UserNav fullName={ctx.profile.full_name} email={ctx.profile.email} />
      <LocaleSwitcher />
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      <aside className="sticky top-0 hidden h-screen w-48 shrink-0 flex-col border-r border-border bg-white lg:flex">
        <div className="border-b border-border px-4 py-4">
          <Link href="/student">
            <img src="/brand/mira-lockup.svg" alt="MIRA" className="h-5" />
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-4">{navContent}</div>

        <div className="border-t border-border px-3 py-3">{userContent}</div>
      </aside>

      <MobileHeader nav={navContent} user={userContent} />

      <main className="flex-1 bg-paper">
        <div className="mx-auto max-w-app px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
