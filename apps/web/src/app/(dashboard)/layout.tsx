import { getUserContext } from "@/lib/auth";
import { SidebarNav } from "@/components/sidebar-nav";
import { UserNav } from "@/components/user-nav";
import { getUnreadCounts } from "@/lib/actions/notifications";
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

  const memberships = ctx.memberships.map((m) => ({
    role: m.role,
    association_profiles: m.association_profiles as {
      name: string;
      slug: string;
    } | null,
  }));

  const unreadCounts = ctx.isStudent ? await getUnreadCounts() : { total: 0, aziende: 0, other: 0 };

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-48 shrink-0 flex-col border-r border-border bg-white">
        <div className="border-b border-border px-4 py-4">
          <Link href="/student">
            <img src="/brand/mira-lockup.svg" alt="MIRA" className="h-5" />
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-4">
          <SidebarNav
            isStudent={ctx.isStudent}
            isMiraAdmin={ctx.isMiraAdmin}
            memberships={memberships}
            unreadNotifications={unreadCounts.other}
            unreadAziende={unreadCounts.aziende}
          />
        </div>

        <div className="border-t border-border px-3 py-3">
          <UserNav
            fullName={ctx.profile.full_name}
            email={ctx.profile.email}
          />
        </div>
      </aside>

      <main className="flex-1 bg-paper">
        <div className="mx-auto max-w-app px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
