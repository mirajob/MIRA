import { createServerClient } from "@mira/supabase/server";
import { notFound } from "next/navigation";
import { PageEditorForm } from "./page-editor-form";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function PublicPageEditorPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createServerClient();

  const { data: association } = await supabase
    .from("association_profiles")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!association) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-h2 text-navy">Pagina pubblica</h2>
        <p className="mt-1 text-body text-ink-secondary">
          Modifica le informazioni visibili sulla pagina pubblica dell&apos;associazione
        </p>
      </div>

      <PageEditorForm association={association} />
    </div>
  );
}
