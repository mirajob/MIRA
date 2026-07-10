import { getCompanyContext } from "@/lib/auth";
import { signOut } from "@/lib/actions/auth";
import { getUnreadCount } from "@/lib/actions/notifications";
import { NotificationBell } from "@/components/notification-bell";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Props {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function CompanyLayout({ children, params }: Props) {
  const { slug } = await params;
  const { profile, company } = await getCompanyContext(slug);
  const unreadNotifications = await getUnreadCount();
  const t = await getTranslations("CompanyLayout");
  const c = await getTranslations("Common");

  const nav = [
    { href: `/company/${slug}`, label: t("searchNav") },
    { href: `/company/${slug}/contacts`, label: t("contactsNav") },
    { href: `/company/${slug}/profile`, label: t("profileNav") },
  ];

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="border-b border-border bg-white shrink-0 sticky top-0 z-50">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/brand/mira-lockup.svg" alt="MIRA" className="h-5" />
            <span className="text-body-sm text-ink-tertiary">·</span>
            <span className="text-body-sm font-medium text-ink">{(company as any).display_name ?? (company as any).legal_name}</span>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell initialUnreadCount={unreadNotifications} />
            <span className="text-body-sm text-ink-secondary">{(profile as any).full_name}</span>
            <form action={signOut}>
              <button type="submit" className="text-body-sm text-ink-tertiary hover:text-navy transition-colors duration-100">
                {c("signOut")}
              </button>
            </form>
          </div>
        </div>
        <nav className="px-6 flex gap-1 border-t border-border">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-4 py-2.5 text-body-sm font-medium text-ink-secondary hover:text-navy border-b-2 border-transparent hover:border-navy transition-colors duration-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
