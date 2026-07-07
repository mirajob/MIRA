import { getUserContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

const adminNav = [
  { label: "Associazioni", href: "/admin/associations" },
  { label: "Aziende", href: "/admin/companies" },
  { label: "Utenti", href: "/admin/users" },
  { label: "Team", href: "/admin/team" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getUserContext();

  if (!ctx.isMiraAdmin) {
    redirect("/student");
  }

  return (
    <div>
      <nav className="mb-6 flex gap-1 border-b border-border pb-4">
        {adminNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-md px-3 py-2 text-body-sm font-medium text-ink-secondary hover:text-navy hover:bg-navy-50/50 transition-colors duration-100"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
