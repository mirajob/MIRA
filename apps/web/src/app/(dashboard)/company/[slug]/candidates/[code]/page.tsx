import { createServiceClient } from "@mira/supabase/server";
import { getCompanyContext } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CandidateCard } from "@/components/card-view/candidate-card";
import { ContactButton } from "./contact-button";
import { getTranslations } from "next-intl/server";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Props {
  params: Promise<{ slug: string; code: string }>;
  searchParams: Promise<{ searchId?: string }>;
}

export default async function CompanyCandidateCardPage({ params, searchParams }: Props) {
  const { slug, code } = await params;
  const { searchId } = await searchParams;
  const { company } = await getCompanyContext(slug);
  const supabase = await createServiceClient();
  const t = await getTranslations("CompanyCandidateCard");

  const { data: codeRow } = await (supabase.from("company_candidate_codes") as any)
    .select("student_profile_id")
    .eq("company_id", (company as any).id)
    .eq("code", code)
    .maybeSingle();

  if (!codeRow) notFound();

  const studentProfileId = codeRow.student_profile_id as string;

  const { data: student } = await (supabase.from("student_profiles") as any)
    .select("id, degree_program, degree_level, current_year")
    .eq("id", studentProfileId)
    .maybeSingle();

  if (!student) notFound();

  const { data: blockRows } = await (supabase.from("card_blocks") as any)
    .select("block_type, prose_content, visibility")
    .eq("student_profile_id", studentProfileId)
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
    audience: "aziende" as const,
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={searchId ? `/company/${slug}/search?searchId=${searchId}` : `/company/${slug}/search`}
            className="text-body-sm text-ink-tertiary hover:text-navy transition-colors"
          >
            {t("backToSearch")}
          </Link>
          <h1 className="font-display text-h1 text-navy mt-2">{t("candidateHeading", { code })}</h1>
          <p className="text-body-sm text-ink-tertiary">
            {student.degree_program ?? "—"} {student.degree_level ? `· ${student.degree_level}` : ""}
          </p>
        </div>
        <ContactButton slug={slug} code={code} />
      </div>

      <CandidateCard {...cardProps} />
    </div>
  );
}
