/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { hasWorkspaceAccess } from "@/lib/association-roles";
import { DetailHeader } from "@/components/page-bar";
import { NewSessionForm } from "./new-session-form";
import type { CycleOption } from "../new-session-panel";

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * Creare un round è una pagina sua.
 *
 * Prima il modulo si apriva dentro l'elenco: sopra e sotto restavano i round
 * esistenti, e mentre si compilava si poteva agire su quelli, che è il tipo di
 * confusione per cui poi si crea il round sbagliato.
 */
export default async function NewInterviewSessionPage({ params }: Props) {
  const { slug } = await params;
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  const { data: association } = await (supabase.from("association_profiles") as any)
    .select("id, name")
    .eq("slug", slug)
    .maybeSingle();

  if (!association) notFound();

  const { data: membership } = await (supabase.from("association_memberships") as any)
    .select("role, permissions")
    .eq("association_id", association.id)
    .eq("user_id", (ctx.profile as any).id)
    .eq("status", "active")
    .maybeSingle();

  if (!ctx.isMiraAdmin && !hasWorkspaceAccess(membership)) redirect("/student");

  const { data: cycles } = await (supabase.from("application_cycles") as any)
    .select("id, title, status")
    .eq("association_id", association.id)
    .order("created_at", { ascending: false });

  const cycleOptions: CycleOption[] = ((cycles ?? []) as any[])
    .filter((c) => c.status !== "closed")
    .map((c) => ({ id: c.id, title: c.title }));

  // Senza una selezione aperta un round non ha a chi appartenere.
  if (!cycleOptions.length) redirect(`/association/${slug}/colloqui`);

  const t = await getTranslations("Interviews");

  return (
    <div className="space-y-4">
      <DetailHeader
        back={{ href: `/association/${slug}/colloqui`, label: t("backToSessions") }}
        title={t("newSessionCta")}
      />

      <NewSessionForm associationId={association.id} slug={slug} cycles={cycleOptions} />
    </div>
  );
}
