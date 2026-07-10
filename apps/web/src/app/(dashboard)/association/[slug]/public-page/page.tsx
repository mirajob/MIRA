import { createServerClient } from "@mira/supabase/server";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageEditorForm } from "./page-editor-form";

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
