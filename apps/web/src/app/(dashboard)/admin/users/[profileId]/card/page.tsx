import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { MiraCardDocument } from "@/components/card-view/mira-card-document";

interface Props {
  params: Promise<{ profileId: string }>;
}

export default async function AdminStudentCardPage({ params }: Props) {
  const { profileId } = await params;
  const ctx = await getUserContext();
  if (!ctx.isMiraAdmin) redirect("/student");

  const t = await getTranslations("AdminUsers");
  const supabase = await createServiceClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, student_profiles(id)")
    .eq("id", profileId)
    .maybeSingle();

  const studentProfile = (profile as any)?.student_profiles as { id: string } | null;
  if (!profile || !studentProfile) notFound();

  const { data: blockRows } = await (supabase.from("card_blocks") as any)
    .select("block_type, prose_content, visibility")
    .eq("student_profile_id", studentProfile.id)
    .eq("status", "approved");

  const blockMap = new Map<string, any>((blockRows ?? []).map((b: any) => [b.block_type, b]));
  const cardProps = {
    header: blockMap.has("header") ? { data: blockMap.get("header").prose_content, visibility: blockMap.get("header").visibility } : undefined,
    disponibilita: blockMap.has("disponibilita") ? { data: blockMap.get("disponibilita").prose_content } : undefined,
    esperienze: blockMap.has("esperienze") ? { data: blockMap.get("esperienze").prose_content } : undefined,
    formazione: blockMap.has("formazione") ? { data: blockMap.get("formazione").prose_content } : undefined,
    competenze: blockMap.has("competenze") ? { data: blockMap.get("competenze").prose_content } : undefined,
    lingue: blockMap.has("lingue") ? { data: blockMap.get("lingue").prose_content } : undefined,
    interessi: blockMap.has("interessi") ? { data: blockMap.get("interessi").prose_content } : undefined,
    autodescrizione: blockMap.has("autodescrizione") ? { data: blockMap.get("autodescrizione").prose_content } : undefined,
    pianoCarriera: blockMap.has("piano_carriera") ? { data: blockMap.get("piano_carriera").prose_content } : undefined,
    viewer: "self" as const,
    displayName: (profile as any).full_name ?? undefined,
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/users" className="text-body-sm text-petrol hover:text-petrol-700 transition-colors">
          {t("backToUsers")}
        </Link>
        <h1 className="font-display text-h1 text-navy mt-2">{(profile as any).full_name ?? (profile as any).email}</h1>
        <p className="text-body text-ink-secondary">{(profile as any).email}</p>
      </div>

      <MiraCardDocument {...cardProps} />
    </div>
  );
}
