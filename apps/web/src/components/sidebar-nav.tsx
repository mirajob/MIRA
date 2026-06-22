"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarNavProps {
  isStudent: boolean;
  isMiraAdmin: boolean;
  memberships: Array<{
    role: string;
    association_profiles: {
      name: string;
      slug: string;
    } | null;
  }>;
}

const STUDENT_LINKS = [
  { label: "Profilo", href: "/student" },
  { label: "Percorso", href: "/student/percorso" },
  { label: "Associazioni", href: "/student/associazioni" },
];

const ROLE_LABELS: Record<string, string> = {
  association_president: "Presidente",
  association_admin: "Admin",
  association_reviewer: "Reviewer",
  association_interviewer: "Interviewer",
  association_member: "Membro",
};

export function SidebarNav({ isStudent, isMiraAdmin, memberships }: SidebarNavProps) {
  const pathname = usePathname();
  const inStudentMode = pathname.startsWith("/student");
  const inAdminMode = pathname.startsWith("/admin");

  function isActive(href: string) {
    if (href === "/student") return pathname === "/student" || pathname === "/student/profile";
    return pathname.startsWith(href);
  }

  const linkClass = (active: boolean) =>
    `block rounded-md px-3 py-2 text-xs font-medium transition-colors duration-100 ${
      active ? "bg-navy-50 text-navy" : "text-ink-secondary hover:text-navy hover:bg-navy-50/50"
    }`;

  return (
    <nav className="space-y-5">
      {/* Student section */}
      {isStudent && (
        <div className="space-y-1">
          {STUDENT_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(isActive(link.href))}>
              {link.label}
            </Link>
          ))}
        </div>
      )}

      {/* Association workspaces */}
      {memberships.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-ink-tertiary uppercase px-3 mb-1">Associazioni</p>
          {memberships.map((m) => {
            if (!m.association_profiles) return null;
            const href = `/association/${m.association_profiles.slug}`;
            const active = pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={linkClass(active)}>
                <span className="flex items-center gap-2">
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-semibold ${
                    active ? "bg-navy text-white" : "bg-navy-50 text-navy-500"
                  }`}>
                    {m.association_profiles.name.charAt(0)}
                  </span>
                  <span className="truncate">{m.association_profiles.name}</span>
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Admin */}
      {isMiraAdmin && (
        <div className="space-y-1">
          <p className="text-[10px] text-ink-tertiary uppercase px-3 mb-1">Admin</p>
          <Link href="/admin" className={linkClass(inAdminMode)}>
            MIRA Admin
          </Link>
        </div>
      )}
    </nav>
  );
}
