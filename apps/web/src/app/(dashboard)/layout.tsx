import { getUserContext } from "@/lib/auth";
import { RoleSwitcher } from "@/components/role-switcher";
import { UserNav } from "@/components/user-nav";
import Link from "next/link";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getUserContext();

  const memberships = ctx.memberships.map((m) => ({
    role: m.role,
    association_profiles: m.association_profiles as {
      name: string;
      slug: string;
    } | null,
  }));

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — 240px per design system */}
      <aside className="flex w-60 flex-col border-r border-border bg-white">
        <div className="border-b border-border px-6 py-5">
          <Link href="/">
            <img src="/brand/mira-lockup.svg" alt="MIRA" className="h-6" />
          </Link>
        </div>

        <div className="flex-1 space-y-6 px-3 py-6">
          <RoleSwitcher
            isStudent={ctx.isStudent}
            isMiraAdmin={ctx.isMiraAdmin}
            memberships={memberships}
          />
        </div>

        <div className="border-t border-border px-4 py-4">
          <UserNav
            fullName={ctx.profile.full_name}
            email={ctx.profile.email}
          />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-paper">
        <div className="mx-auto max-w-app px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
