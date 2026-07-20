import { getUserContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getUserContext();

  if (!ctx.isMiraAdmin) {
    redirect("/student");
  }

  const t = await getTranslations("AdminNav");
  const adminNav = [
    { label: t("associationsLink"), href: "/admin/associations" },
    { label: t("companiesLink"), href: "/admin/companies" },
    { label: t("usersLink"), href: "/admin/users" },
    { label: t("teamLink"), href: "/admin/team" },
  ];

  return (
    <div>
      <nav className="mb-4 flex gap-1 overflow-x-auto border-b border-border pb-2">
        {adminNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-body-sm font-medium text-ink-secondary hover:text-navy hover:bg-navy-50/50 transition-colors duration-100"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
