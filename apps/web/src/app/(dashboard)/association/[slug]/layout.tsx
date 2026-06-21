import { getUserContext } from "@/lib/auth";
import { createServerClient } from "@mira/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

interface Props {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

const getAssociationNav = (slug: string) => [
  { label: "Dashboard", href: `/association/${slug}` },
  { label: "Pagina pubblica", href: `/association/${slug}/public-page` },
  { label: "Cicli candidatura", href: `/association/${slug}/cycles` },
  { label: "Candidati", href: `/association/${slug}/candidates` },
  { label: "Colloqui", href: `/association/${slug}/interviews` },
  { label: "Board", href: `/association/${slug}/board` },
];

export default async function AssociationWorkspaceLayout({ params, children }: Props) {
  const { slug } = await params;
  const ctx = await getUserContext();
  const supabase = await createServerClient();

  const { data: association } = await supabase
    .from("association_profiles")
    .select("id, name, slug, logo_url")
    .eq("slug", slug)
    .maybeSingle();

  if (!association) notFound();

  const { data: membership } = await supabase
    .from("association_memberships")
    .select("role, permissions")
    .eq("association_id", association.id)
    .eq("user_id", ctx.profile.id)
    .eq("status", "active")
    .maybeSingle();

  if (!membership && !ctx.isMiraAdmin) {
    redirect("/student");
  }

  const nav = getAssociationNav(slug);

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        {association.logo_url ? (
          <img src={association.logo_url} alt="" className="h-10 w-10 rounded-md object-cover" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-navy text-white text-label font-semibold">
            {association.name.charAt(0)}
          </div>
        )}
        <div>
          <h1 className="font-sans text-h3 text-navy">{association.name}</h1>
          <p className="text-body-sm text-ink-tertiary">
            {membership?.role === "association_president" ? "Presidente" : membership?.role?.replace("association_", "") ?? "Admin"}
          </p>
        </div>
      </div>

      <nav className="mb-6 flex gap-1 border-b border-border pb-4 overflow-x-auto">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="whitespace-nowrap rounded-md px-3 py-2 text-body-sm font-medium text-ink-secondary hover:text-navy hover:bg-navy-50/50 transition-colors duration-100"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
