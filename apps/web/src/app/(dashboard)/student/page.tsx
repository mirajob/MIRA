import { getUserContext } from "@/lib/auth";
import { createServerClient } from "@mira/supabase/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageBar } from "@/components/page-bar";

// Il libretto si può ricaricare anche da qui (HeaderBlock): il parsing usa un modello ad
// alto reasoning effort per la massima accuratezza su voti/esami, che può superare il
// timeout di default delle funzioni serverless.
export const maxDuration = 120;
import { ensureCardBlocksExist } from "@/lib/actions/card-blocks";
import { missingCardSections } from "@/lib/card-completeness";
import { EditableSection } from "@/components/card/editable-section";
import { MiraCardLayout } from "@/components/card/mira-card-layout";
import { MiraCardDocument } from "@/components/card-view/mira-card-document";
import { ProfileViewSwitcher } from "@/components/card-view/profile-view-switcher";
import { HeaderBlock, HeaderView } from "@/components/card/header-block";
import { DisponibilitaBlock, DisponibilitaView } from "@/components/card/disponibilita-block";
import { EsperienzeBlock, EsperienzeView } from "@/components/card/esperienze-block";
import { CompetenzeBlock, CompetenzeView } from "@/components/card/competenze-block";
import { LingueBlock } from "@/components/card/lingue-block";
import { EsamiBlock, EsamiView } from "@/components/card/esami-block";
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
    .select("id, onboarding_completed")
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

  const cardT = await getTranslations("CardBlocks");

  const esperienzeItems = (esperienze?.prose_content as EsperienzeProseContent | undefined)?.items ?? [];
  const competenzeData = (competenze?.prose_content as CompetenzeProseContent | undefined) ?? { items: [], soft_skills: [] };
  const lingueItems = (lingue?.prose_content as LingueProseContent | undefined)?.items ?? [];
  const autodescrizioneTesto = (autodescrizione?.prose_content as AutodescrizioneProseContent | undefined)?.testo ?? null;
  const interessiTesto = (interessi?.prose_content as InteressiProseContent | undefined)?.testo ?? null;
  const pianoData = pianoCarriera?.prose_content as PianoCarrieraProseContent | undefined;
  const formazioneItems = (formazione?.prose_content as FormazioneProseContent | undefined)?.items ?? [];

  // Cosa manca si decide sul CONTENUTO, non sullo stato del blocco: un blocco confermato ma
  // vuoto (Conferma premuto senza scrivere niente) è a tutti gli effetti un buco nella card,
  // e con il controllo sullo stato non veniva segnalato da nessuna parte.
  const missingKeys = missingCardSections({
    disponibilita: disponibilita?.prose_content as DisponibilitaProseContent | undefined,
    esperienze: esperienzeItems,
    esami: formazioneItems,
    competenze: competenzeData.items,
    lingue: lingueItems,
    profiloPersonale: autodescrizioneTesto,
    pianoCarriera: pianoData?.testo ?? null,
  });

  const missing = new Set(missingKeys);
  const missingSections = missingKeys.map((key) =>
    cardT(`titles.${key}`)
  );

  const t = await getTranslations("StudentHome");

  return (
    <div className="space-y-4">
      <PageBar title={t("greeting") + (name ? `, ${name}` : "")} />
      <p className="text-body-sm text-ink-secondary">{t("cardPurpose")}</p>

      <ProfileViewSwitcher
        missingSections={missingSections}
        card={
          <MiraCardDocument
            viewer="self"
            displayName={ctx.profile.full_name}
            avatarUrl={(ctx.profile as { avatar_url?: string | null }).avatar_url ?? null}
            header={header ? { data: header.prose_content as HeaderProseContent, visibility: header.visibility as HeaderVisibility } : undefined}
            disponibilita={disponibilita ? { data: disponibilita.prose_content as DisponibilitaProseContent } : undefined}
            esperienze={esperienze ? { data: { items: esperienzeItems } } : undefined}
            formazione={formazione ? { data: { items: formazioneItems } } : undefined}
            competenze={competenze ? { data: competenzeData } : undefined}
            lingue={lingue ? { data: { items: lingueItems } } : undefined}
            interessi={interessi ? { data: { testo: interessiTesto } } : undefined}
            autodescrizione={autodescrizione ? { data: { testo: autodescrizioneTesto } } : undefined}
            pianoCarriera={pianoData ? { data: pianoData } : undefined}
          />
        }
        edit={
      <MiraCardLayout
        name={ctx.profile.full_name}
        masthead={
          <>
            {header && (
              <EditableSection
                view={
                  <HeaderView data={header.prose_content as HeaderProseContent} />
                }
                edit={
                  <HeaderBlock
                    proseContent={header.prose_content as HeaderProseContent}
                    status={header.status}
                    formazioneItems={formazioneItems}
                    showEsami={false}
                  />
                }
              />
            )}
            {disponibilita && (
              <EditableSection
                missing={missing.has("disponibilita")}
                view={
                  <DisponibilitaView
                    disponibilita={disponibilita.prose_content as DisponibilitaProseContent}
                  />
                }
                edit={
                  <DisponibilitaBlock
                    disponibilita={disponibilita.prose_content as DisponibilitaProseContent}
                    status={disponibilita.status}
                  />
                }
              />
            )}
          </>
        }
        left={
          <>
            {autodescrizione && (
              <EditableSection
                missing={missing.has("profiloPersonale")}
                view={<ProseView title={cardT("titles.profiloPersonale")} testo={autodescrizioneTesto} serif />}
                edit={
                  <ProseBlock
                    blockType="autodescrizione"
                    title={cardT("titles.profiloPersonale")}
                    testo={autodescrizioneTesto}
                    status={autodescrizione.status}
                    serif
                    intro={t("autodescrizioneIntro")}
                    placeholder={cardT("profiloPersonalePlaceholder")}
                  />
                }
              />
            )}
            {esperienze && (
              <EditableSection
                missing={missing.has("esperienze")}
                view={<EsperienzeView items={esperienzeItems} />}
                edit={<EsperienzeBlock items={esperienzeItems} status={esperienze.status} />}
              />
            )}
          </>
        }
        right={
          <>
            {/* Stesso ordine della card: prima gli esami (cosa hai studiato), poi le
                competenze (cosa sai usare), poi lingue e piano. */}
            {formazione && (
              <EditableSection
                missing={missing.has("esami")}
                view={<EsamiView formazioneItems={formazioneItems} />}
                edit={
                  <EsamiBlock
                    formazioneItems={formazioneItems}
                    status={formazione.status}
                    livello={(header?.prose_content as HeaderProseContent | undefined)?.livello ?? null}
                    mediaVoti={(header?.prose_content as HeaderProseContent | undefined)?.media_voti ?? null}
                    visibility={header?.visibility as HeaderVisibility}
                  />
                }
              />
            )}
            {competenze && (
              <EditableSection
                missing={missing.has("competenze")}
                view={<CompetenzeView data={competenzeData} />}
                edit={<CompetenzeBlock data={competenzeData} status={competenze.status} />}
              />
            )}
            {lingue && (
              <EditableSection
                missing={missing.has("lingue")}
                view={
                  <div className="p-4">
                    <p className="text-eyebrow text-navy/60 uppercase mb-2">{cardT("titles.lingue")}</p>
                    {lingueItems.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {lingueItems.map((it) => (
                          <span key={it.id} className="text-xs px-2 py-0.5 rounded-full bg-petrol-50 text-petrol-700">
                            {it.lingua} {it.livello}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-body-sm text-ink-tertiary italic">{cardT("lingue.emptyView")}</p>
                    )}
                  </div>
                }
                edit={<LingueBlock items={lingueItems} status={lingue.status} />}
              />
            )}
            {pianoCarriera && (
              <EditableSection
                missing={missing.has("pianoCarriera")}
                view={<ProseView title={cardT("titles.pianoCarriera")} testo={pianoData?.testo ?? null} />}
                edit={
                  <ProseBlock
                    blockType="piano_carriera"
                    title={cardT("titles.pianoCarriera")}
                    testo={pianoData?.testo ?? null}
                    stato={pianoData?.stato}
                    status={pianoCarriera.status}
                    placeholder={cardT("disponibilita.pianoPlaceholder")}
                  />
                }
              />
            )}
            {/* Interessi è legacy (confluito nel Profilo personale): resta visibile
                solo per gli utenti pre-rework che hanno già un testo, per non perdere dati. */}
            {interessi && interessiTesto && (
              <EditableSection
                view={<ProseView title={cardT("titles.interessi")} testo={interessiTesto} />}
                edit={
                  <ProseBlock
                    blockType="interessi"
                    title={cardT("titles.interessi")}
                    testo={interessiTesto}
                    status={interessi.status}
                    placeholder={cardT("interessiPlaceholder")}
                  />
                }
              />
            )}
          </>
        }
      />
        }
      />
    </div>
  );
}
