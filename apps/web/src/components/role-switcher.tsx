"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface RoleSwitcherProps {
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

export function RoleSwitcher({ isStudent, isMiraAdmin, memberships }: RoleSwitcherProps) {
  const pathname = usePathname();

  const roles: Array<{ label: string; href: string; initials: string }> = [];

  if (isStudent) {
    roles.push({ label: "Studente", href: "/student", initials: "S" });
  }

  for (const m of memberships) {
    if (!m.association_profiles) continue;
    const roleLabel =
      m.role === "association_president" ? "Presidente"
      : m.role === "association_admin" ? "Admin"
      : m.role === "association_reviewer" ? "Reviewer"
      : m.role === "association_interviewer" ? "Interviewer"
      : "Membro";

    roles.push({
      label: `${roleLabel} — ${m.association_profiles.name}`,
      href: `/association/${m.association_profiles.slug}`,
      initials: m.association_profiles.name.charAt(0).toUpperCase(),
    });
  }

  if (isMiraAdmin) {
    roles.push({ label: "MIRA Admin", href: "/admin", initials: "M" });
  }

  if (roles.length <= 1) return null;

  return (
    <nav className="space-y-1">
      <p className="text-eyebrow text-navy/60 uppercase px-3 mb-2">
        Modalità
      </p>
      {roles.map((role) => {
        const isActive = pathname.startsWith(role.href);
        return (
          <Link
            key={role.href}
            href={role.href}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-body-sm font-medium transition-colors duration-100 ${
              isActive
                ? "bg-navy-50 text-navy"
                : "text-ink-secondary hover:text-navy hover:bg-navy-50/50"
            }`}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-md text-eyebrow font-semibold ${
                isActive
                  ? "bg-navy text-white"
                  : "bg-navy-50 text-navy-500"
              }`}
            >
              {role.initials}
            </span>
            <span className="truncate">{role.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
