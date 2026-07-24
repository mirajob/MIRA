import { createServerClient } from "@mira/supabase/server";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageEditorForm } from "./page-editor-form";
import { PublicPageCardFlow } from "./public-page-card-flow";
import { loadPublicPageCard } from "@/lib/actions/public-page-card";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function PublicPageEditorPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createServerClient();
  const t = await getTranslations("PublicPageEditor");

  const { data: association } = await supabase
    .from("association_profiles")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!association) notFound();

  // Associazioni in beta: la pagina pubblica si costruisce come card. Le altre restano sul
  // vecchio form finche' la nuova esperienza non viene accesa per tutti.
  if ((association as Record<string, unknown>).beta_dashboard) {
    const { state, error } = await loadPublicPageCard((association as Record<string, unknown>).id as string);
    if (error) {
      return (
        <div className="rounded-md border border-error/30 bg-error-bg px-4 py-3">
          <p className="text-body-sm text-error">{error}</p>
        </div>
      );
    }
    if (state) return <PublicPageCardFlow initialState={state} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-h2 text-navy">{t("heading")}</h2>
        <p className="mt-1 text-body text-ink-secondary">
          {t("subhead")}
        </p>
      </div>

      <PageEditorForm association={association} />
    </div>
  );
}
