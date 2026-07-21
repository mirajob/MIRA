/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { MiraCardDocument } from "@/components/card-view/mira-card-document";
import { canManageMembers } from "@/lib/association-access";

interface Props {
  params: Promise<{ slug: string; profileId: string }>;
}

/**
 * MiraCard di un membro, vista dall'associazione.
 *
 * Due controlli, non uno: chi guarda deve poter gestire i membri di QUESTA associazione,
 * e la persona guardata deve esserne davvero un membro attivo. Senza il secondo, un
 * amministratore potrebbe leggere la card di qualunque studente cambiando l'id nell'URL.
 *
 * viewer="associazioni" e' lo stesso usato per i candidati: la card mostra solo cio' che
 * lo studente ha scelto di rendere visibile alle associazioni.
 */
export default async function MemberCardPage({ params }: Props) {
  const { slug, profileId } = await params;
  const ctx = await getUserContext();
  const supabase = await createServiceClient();
  const viewerProfileId = (ctx.profile as any).id as string;

  const { data: association } = await (supabase.from("association_profiles") as any)
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (!association) notFound();

  if (!(await canManageMembers(supabase, association.id, viewerProfileId, ctx.isMiraAdmin))) {
    redirect(`/association/${slug}/board`);
  }

  const { data: membership } = await (supabase.from("association_memberships") as any)
    .select("id")
    .eq("association_id", association.id)
    .eq("user_id", profileId)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) notFound();

  const t = await getTranslations("Board");

  const { data: profile } = await (supabase.from("profiles") as any)
    .select("full_name, email, student_profiles(id, degree_level, degree_program, university)")
    .eq("id", profileId)
    .maybeSingle();

  const studentProfile = (profile as any)?.student_profiles as
    | { id: string; degree_level: string | null; degree_program: string | null; university: string | null }
    | null;

  if (!profile) notFound();

  const { data: blockRows } = studentProfile
    ? await (supabase.from("card_blocks") as any)
        .select("block_type, prose_content, visibility")
        .eq("student_profile_id", studentProfile.id)
        .eq("status", "approved")
    : { data: [] };

  const blockMap = new Map<string, any>((blockRows ?? []).map((b: any) => [b.block_type, b]));
  const block = (key: string) =>
    blockMap.has(key) ? { data: blockMap.get(key).prose_content } : undefined;

  const cardProps = {
    header: blockMap.has("header")
      ? { data: blockMap.get("header").prose_content, visibility: blockMap.get("header").visibility }
      : undefined,
    disponibilita: block("disponibilita"),
    esperienze: block("esperienze"),
    formazione: block("formazione"),
    competenze: block("competenze"),
    lingue: block("lingue"),
    interessi: block("interessi"),
    autodescrizione: block("autodescrizione"),
    pianoCarriera: block("piano_carriera"),
    viewer: "associazioni" as const,
    displayName: (profile as any).full_name ?? undefined,
  };

  const subtitle = [studentProfile?.degree_program, studentProfile?.university]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-4">
      <div>
        <Link
          href={`/association/${slug}/board`}
          className="text-body-sm text-petrol hover:text-petrol-700 transition-colors"
        >
          ← {t("heading")}
        </Link>
        <h1 className="font-display text-h2 text-navy mt-1.5">
          {(profile as any).full_name ?? (profile as any).email}
        </h1>
        <p className="text-body-sm text-ink-secondary">
          {(profile as any).email}
          {subtitle && ` · ${subtitle}`}
        </p>
      </div>

      {studentProfile ? (
        <MiraCardDocument {...cardProps} />
      ) : (
        <div className="rounded-lg border border-border bg-white p-6 text-center">
          <p className="text-body-sm text-ink-secondary">{t("noCard")}</p>
        </div>
      )}
    </div>
  );
}
