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
    // Due soli livelli: amministratore o membro. I ruoli storici (president, reviewer,
    // interviewer) sono ritirati; se sopravvivessero su qualche riga valgono come
    // amministratore, che e' il livello di accesso che avevano.
    const roleLabel = m.role === "association_member" ? "Membro" : "Amministratore";

    roles.push({
      label: `${roleLabel} — ${m.association_profiles.name}`,
      href: `/association/${m.association_profiles.slug}`,
      initials: m.association_profiles.name.charAt(0).toUpperCase(),
    });
  }

  if (isMiraAdmin) {
    roles.push({ label: "MIRA Admin", href: "/admin", initials: "M" });
  }

  if (roles.length === 0) return null;

  return (
    <nav className="space-y-1">
      {roles.length > 1 && (
        <p className="text-eyebrow text-navy/60 uppercase px-2 mb-2 text-[10px]">
          Modalità
        </p>
      )}
      {roles.map((role) => {
        const isActive = pathname.startsWith(role.href);
        return (
          <Link
            key={role.href}
            href={role.href}
            className={`flex items-center gap-2 rounded-md px-2 py-2 text-body-sm font-medium transition-colors duration-100 ${
              isActive
                ? "bg-navy-50 text-navy"
                : "text-ink-secondary hover:text-navy hover:bg-navy-50/50"
            }`}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold ${
                isActive
                  ? "bg-navy text-white"
                  : "bg-navy-50 text-navy-500"
              }`}
            >
              {role.initials}
            </span>
            <span className="truncate text-xs">{role.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
