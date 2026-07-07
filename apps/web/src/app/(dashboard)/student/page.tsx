import { getUserContext } from "@/lib/auth";
import { createServerClient } from "@mira/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { RoadmapBanner } from "@/components/roadmap-banner";
import { EditableRole } from "@/components/editable-role";
import { ensureCardBlocksExist } from "@/lib/actions/card-blocks";
import { EditableSection } from "@/components/card/editable-section";
import { WORKSPACE_ROLES } from "@/lib/association-roles";
import { HeaderBlock, HeaderView } from "@/components/card/header-block";
import { DisponibilitaBlock, DisponibilitaView } from "@/components/card/disponibilita-block";
import { EsperienzeBlock, EsperienzeView } from "@/components/card/esperienze-block";
import { CompetenzeBlock, CompetenzeView } from "@/components/card/competenze-block";
import { LingueBlock } from "@/components/card/lingue-block";
import { ProseBlock, ProseView } from "@/components/card/prose-block";
import type {
  CardBlockType,
  CardBlockStatus,
  HeaderProseContent,
  HeaderVisibility,
  DisponibilitaProseContent,
  EsperienzeProseContent,
  FormazioneProseContent,
  CompetenzeProseContent,
  LingueProseContent,
  AutodescrizioneProseContent,
  InteressiProseContent,
  PianoCarrieraProseContent,
} from "@mira/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ROLE_LABELS: Record<string, string> = {
  association_president: "Presidente",
  association_admin: "Admin",
  association_reviewer: "Reviewer",
  association_interviewer: "Interviewer",
  association_member: "Membro",
};

interface CardBlockRow {
  block_type: CardBlockType;
  prose_content: any;
  structured_data: any;
  status: CardBlockStatus;
  visibility: any;
}

export default async function StudentHomePage() {
  const ctx = await getUserContext();
  if (!ctx.isStudent) redirect("/api/auth/redirect");

  const supabase = await createServerClient();
  const profileId = (ctx.profile as any).id as string;

  const { data: student } = await supabase
    .from("student_profiles")
    .select("id, onboarding_completed, onboarding_answers")
    .eq("user_id", profileId)
    .single();

  if (!student?.onboarding_completed) {
    redirect("/student/onboarding");
  }

  const studentProfileId = (student as any).id as string;

  await ensureCardBlocksExist(studentProfileId);

  const { data: blockRows } = await (supabase.from("card_blocks") as any)
    .select("block_type, prose_content, structured_data, status, visibility")
    .eq("student_profile_id", studentProfileId);

  const blocks = new Map<CardBlockType, CardBlockRow>(
    ((blockRows ?? []) as CardBlockRow[]).map((b) => [b.block_type, b])
  );

  const { data: memberships } = await (supabase.from("association_memberships") as any)
    .select("id, role, title, joined_at, association_profiles(name, slug, verification_status)")
    .eq("user_id", profileId)
    .eq("status", "active");

  const answers = (student as any).onboarding_answers as Record<string, unknown> | null;
  const roadmapDismissed = answers?.roadmap_dismissed === true;
  const name = ctx.profile.full_name?.split(" ")[0] ?? "";

  const header = blocks.get("header");
  const disponibilita = blocks.get("disponibilita");
  const esperienze = blocks.get("esperienze");
  const formazione = blocks.get("formazione");
  const competenze = blocks.get("competenze");
  const lingue = blocks.get("lingue");
  const autodescrizione = blocks.get("autodescrizione");
  const interessi = blocks.get("interessi");
  const pianoCarriera = blocks.get("piano_carriera");

  const faseBBlocks = [competenze, lingue, interessi, autodescrizione, pianoCarriera];
  const faseBIncomplete = faseBBlocks.some((b) => b?.status !== "approved");

  const esperienzeItems = (esperienze?.prose_content as EsperienzeProseContent | undefined)?.items ?? [];
  const competenzeItems = (competenze?.prose_content as CompetenzeProseContent | undefined)?.items ?? [];
  const lingueItems = (lingue?.prose_content as LingueProseContent | undefined)?.items ?? [];
  const autodescrizioneTesto = (autodescrizione?.prose_content as AutodescrizioneProseContent | undefined)?.testo ?? null;
  const interessiTesto = (interessi?.prose_content as InteressiProseContent | undefined)?.testo ?? null;
  const pianoData = pianoCarriera?.prose_content as PianoCarrieraProseContent | undefined;
  const hasInteressiOPiano = interessiTesto || pianoData?.testo;

  return (
    <div className="mx-auto max-w-2xl px-6 py-6 space-y-5">
      <h1 className="font-display text-h2 text-navy">Ciao{name ? `, ${name}` : ""}</h1>

      {faseBIncomplete && (
        <Link
          href="/student/onboarding"
          className="block rounded-lg border border-petrol/30 bg-petrol-50 px-4 py-3 text-body-sm text-petrol-700 hover:bg-petrol-100 transition-colors"
        >
          Completa la tua card: mancano competenze, lingue, interessi, come ti descrivi e piano di carriera (~5 minuti) →
        </Link>
      )}

      {!roadmapDismissed && <RoadmapBanner />}

      <div className="rounded-xl border border-border bg-white overflow-hidden divide-y divide-border">
        {header && (
          <EditableSection
            view={
              <HeaderView
                data={header.prose_content as HeaderProseContent}
                formazioneItems={(formazione?.prose_content as FormazioneProseContent | undefined)?.items ?? []}
              />
            }
            edit={
              <HeaderBlock
                proseContent={header.prose_content as HeaderProseContent}
                visibility={header.visibility as HeaderVisibility}
                status={header.status}
                formazioneItems={(formazione?.prose_content as FormazioneProseContent | undefined)?.items ?? []}
              />
            }
          />
        )}

        {disponibilita && (
          <EditableSection
            view={<DisponibilitaView data={disponibilita.prose_content as DisponibilitaProseContent} />}
            edit={
              <DisponibilitaBlock
                proseContent={disponibilita.prose_content as DisponibilitaProseContent}
                status={disponibilita.status}
              />
            }
          />
        )}

        {esperienze && (
          <EditableSection
            view={<EsperienzeView items={esperienzeItems} />}
            edit={<EsperienzeBlock items={esperienzeItems} status={esperienze.status} />}
          />
        )}

        {competenze && (
          <EditableSection
            view={<CompetenzeView items={competenzeItems} />}
            edit={<CompetenzeBlock items={competenzeItems} status={competenze.status} />}
          />
        )}

        {lingue && (
          <EditableSection
            view={
              <div className="p-5">
                <p className="text-eyebrow text-navy/60 uppercase mb-2">Lingue</p>
                {lingueItems.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {lingueItems.map((it) => (
                      <span key={it.id} className="text-xs px-2 py-0.5 rounded-full bg-petrol-50 text-petrol-700">
                        {it.lingua} {it.livello}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-body-sm text-ink-tertiary italic">Nessuna lingua ancora.</p>
                )}
              </div>
            }
            edit={<LingueBlock items={lingueItems} status={lingue.status} />}
          />
        )}

        {autodescrizione && (
          <EditableSection
            view={<ProseView title="Come si descrive" testo={autodescrizioneTesto} serif />}
            edit={
              <ProseBlock
                blockType="autodescrizione"
                title="Come si descrive"
                testo={autodescrizioneTesto}
                status={autodescrizione.status}
                serif
                intro="Scritto con le tue parole — modificalo pure, ed è la parte più personale della card."
                placeholder="Racconta chi sei, con parole tue..."
              />
            }
          />
        )}

        {hasInteressiOPiano && (
          <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
            {pianoCarriera && (
              <EditableSection
                view={<ProseView title="Piano di carriera" testo={pianoData?.testo ?? null} stato={pianoData?.stato} />}
                edit={
                  <ProseBlock
                    blockType="piano_carriera"
                    title="Piano di carriera"
                    testo={pianoData?.testo ?? null}
                    stato={pianoData?.stato}
                    status={pianoCarriera.status}
                    placeholder="Come ti vedi nei prossimi 1-2 anni?"
                  />
                }
              />
            )}
            {interessi && (
              <EditableSection
                view={<ProseView title="Interessi" testo={interessiTesto} />}
                edit={
                  <ProseBlock
                    blockType="interessi"
                    title="Interessi"
                    testo={interessiTesto}
                    status={interessi.status}
                    placeholder="I tuoi interessi professionali e personali..."
                  />
                }
              />
            )}
          </div>
        )}
      </div>

      {(memberships?.length ?? 0) > 0 && (
        <div className="rounded-lg border border-border bg-white p-5">
          <p className="text-eyebrow text-navy/60 uppercase mb-3">Le mie associazioni</p>
          <div className="space-y-3">
            {memberships!.map((m: any) => {
              const status = m.association_profiles?.verification_status;
              const slug = m.association_profiles?.slug;
              const canOpenWorkspace = WORKSPACE_ROLES.includes(m.role) && status === "verified" && slug;

              return (
                <div key={m.id} className="flex items-center justify-between gap-3 rounded-md px-3 py-2">
                  <div className="flex items-center gap-2">
                    {canOpenWorkspace ? (
                      <Link href={`/association/${slug}`} className="text-body text-navy font-medium hover:text-petrol underline underline-offset-2 decoration-1">
                        {m.association_profiles?.name ?? "—"}
                      </Link>
                    ) : (
                      <span className="text-body text-ink font-medium">{m.association_profiles?.name ?? "—"}</span>
                    )}
                    {status === "pending_verification" && (
                      <span className="text-eyebrow px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 uppercase">In attesa</span>
                    )}
                    {status === "rejected" && (
                      <span className="text-eyebrow px-2 py-0.5 rounded-full bg-red-100 text-red-600 uppercase">Non approvata</span>
                    )}
                  </div>
                  <EditableRole membershipId={m.id} currentTitle={m.title} roleFallback={ROLE_LABELS[m.role] ?? m.role} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
