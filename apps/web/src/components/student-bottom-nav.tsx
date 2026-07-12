"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const TABS = [
  {
    labelKey: "profile",
    href: "/student",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    labelKey: "associations",
    href: "/student/associazioni",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    labelKey: "companies",
    href: "/student/aziende",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
  },
] as const;

export function StudentBottomNav({
  unreadNotifications = 0,
  unreadAziende = 0,
}: {
  unreadNotifications?: number;
  unreadAziende?: number;
}) {
  const t = useTranslations("SidebarNav");
  const pathname = usePathname();

  // Segnala agli elementi flottanti globali (es. LocaleSwitcher) che su mobile
  // c'è una barra fissa in basso da cui scostarsi.
  useEffect(() => {
    document.body.classList.add("has-bottom-nav");
    return () => document.body.classList.remove("has-bottom-nav");
  }, []);

  function isActive(href: string) {
    if (href === "/student") return pathname === "/student" || pathname === "/student/profile";
    return pathname.startsWith(href);
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="mx-auto flex max-w-lg">
        {TABS.map((tab) => {
          const active = isActive(tab.href);
          const badgeCount =
            tab.href === "/student/associazioni" ? unreadNotifications :
            tab.href === "/student/aziende" ? unreadAziende : 0;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex flex-1 flex-col items-center gap-1 py-3 text-center transition-colors duration-100 ${
                active ? "text-navy" : "text-ink-tertiary hover:text-ink-secondary"
              }`}
            >
              <span className="relative">
                {tab.icon}
                {badgeCount > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[9px] font-bold text-white">
                    {badgeCount > 9 ? "9+" : badgeCount}
                  </span>
                )}
              </span>
              <span className={`text-xs ${active ? "font-medium" : ""}`}>{t(tab.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
