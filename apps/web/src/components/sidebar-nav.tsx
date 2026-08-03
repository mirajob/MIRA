"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

interface SidebarNavProps {
  isStudent: boolean;
  isMiraAdmin: boolean;
  memberships: Array<{
    role: string;
    association_profiles: {
      name: string;
      slug: string;
      logo_url?: string | null;
    } | null;
  }>;
  unreadNotifications?: number;
  unreadAziende?: number;
}

const STUDENT_LINKS = [
  { labelKey: "profile", href: "/student" },
  { labelKey: "associations", href: "/student/associazioni" },
  { labelKey: "interviews", href: "/student/colloqui" },
  { labelKey: "companies", href: "/student/aziende" },
] as const;

export function SidebarNav({ isStudent, isMiraAdmin, memberships, unreadNotifications = 0, unreadAziende = 0 }: SidebarNavProps) {
  const t = useTranslations("SidebarNav");
  const pathname = usePathname();
  const inAdminMode = pathname.startsWith("/admin");

  function isActive(href: string) {
    // La card e l'account sono due pagine diverse: /student/profile non deve
    // accendere la voce della card.
    if (href === "/student") return pathname === "/student";
    return pathname.startsWith(href);
  }

  const linkClass = (active: boolean) =>
    `flex items-center justify-between gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors duration-100 ${
      active ? "bg-navy-50 text-navy" : "text-ink-secondary hover:text-navy hover:bg-navy-50/50"
    }`;

  return (
    <nav className="space-y-5">
      {/* Student section */}
      {isStudent && (
        <div className="space-y-1">
          {STUDENT_LINKS.map((link) => {
            const active = isActive(link.href);
            const isAssociazioni = link.href === "/student/associazioni";
            const isAziende = link.href === "/student/aziende";
            const badgeCount = isAssociazioni ? unreadNotifications : isAziende ? unreadAziende : 0;
            return (
              <Link key={link.href} href={link.href} className={linkClass(active)}>
                <span>{t(link.labelKey)}</span>
                {badgeCount > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-error text-white text-[9px] font-bold px-1">
                    {badgeCount > 9 ? "9+" : badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {/* Association workspaces */}
      {memberships.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-ink-tertiary uppercase px-3 mb-1">{t("workspacesHeader")}</p>
          {memberships.map((m) => {
            if (!m.association_profiles) return null;
            const href = `/association/${m.association_profiles.slug}`;
            const active = pathname.startsWith(href);
            const logo = m.association_profiles.logo_url;
            return (
              // Il nome va a capo invece di essere tagliato: le associazioni si
              // chiamano "Bocconi Students for Innovation", e "Bocconi Stude…"
              // non distingue una voce dall'altra. Il quadratino con l'iniziale
              // c'è solo se esiste un logo vero: un riquadro con una lettera non
              // aggiunge niente che il nome non dica già.
              <Link key={href} href={href} className={linkClass(active)}>
                <span className="flex min-w-0 items-start gap-2">
                  {logo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logo}
                      alt=""
                      className="mt-0.5 h-4 w-4 shrink-0 rounded-sm object-contain"
                    />
                  )}
                  <span className="min-w-0 leading-snug">{m.association_profiles.name}</span>
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Admin */}
      {isMiraAdmin && (
        <div className="space-y-1">
          <p className="text-[10px] text-ink-tertiary uppercase px-3 mb-1">{t("adminHeader")}</p>
          <Link href="/admin" className={linkClass(inAdminMode)}>
            MIRA Admin
          </Link>
        </div>
      )}
    </nav>
  );
}
