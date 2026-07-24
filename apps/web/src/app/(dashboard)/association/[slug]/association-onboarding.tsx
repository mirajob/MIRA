"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { MiraGuide } from "@/components/mira-guide";
import { onboardingProgressPct } from "@/lib/association-guide";
import type { OnboardingStep } from "@/lib/association-guide";
import { advanceOnboarding, goBackOnboarding, finishOnboarding } from "@/lib/actions/association-guide";
import { startCycleBuild } from "@/lib/actions/cycle-card";
import { PublicPageCardFlow } from "./public-page/public-page-card-flow";
import { CycleCardFlow } from "./cycles/[cycleId]/cycle-card-flow";
import { TeamPanel } from "./board/team-panel";
import type { PageCardState } from "@/lib/public-page-card";
import type { CycleCardState } from "@/lib/cycle-card";
import type { TeamData } from "@/lib/association-team";

export interface OnboardingData {
  page?: PageCardState;
  team?: TeamData;
  cycle?: CycleCardState;
}

/**
 * L'onboarding guidato dell'associazione: MIRA accompagna il board a costruire le sezioni una
 * alla volta e in ordine, inline — come l'onboarding della MiraCard. Ogni tappa incorpora il
 * costruttore reale di quella sezione. "Avanti" passa alla successiva; oltre l'ultima, il
 * percorso si chiude e restano le sezioni normali.
 */
export function AssociationOnboarding({
  associationId,
  slug,
  associationName,
  inviteCode,
  stepName,
  stepIndex,
  totalSteps,
  data,
}: {
  associationId: string;
  slug: string;
  associationName: string;
  inviteCode: string | null;
  stepName: OnboardingStep;
  stepIndex: number;
  totalSteps: number;
  data: OnboardingData;
}) {
  const t = useTranslations("AssociationOnboarding");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const isLast = stepIndex >= totalSteps - 1;
  const progressPct = onboardingProgressPct(stepIndex);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    await fn();
    router.refresh();
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Barra di avanzamento del percorso */}
      <div className="rounded-lg border border-border bg-white px-5 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-eyebrow text-navy/60 uppercase">
            {t("stepCounter", { current: stepIndex + 1, total: totalSteps })}
          </p>
          <span className="text-xs font-semibold text-ink tabular-nums">{progressPct}%</span>
        </div>
        <div className="mt-2 h-1.5 bg-border rounded-full overflow-hidden">
          <div className="h-full bg-petrol rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* La voce di MIRA introduce la tappa */}
      <MiraGuide text={t(`steps.${stepName}.intro`, { name: associationName })} />

      {/* Il costruttore reale della sezione, inline */}
      <div>
        {stepName === "public_page" &&
          (data.page ? (
            <PublicPageCardFlow initialState={data.page} />
          ) : (
            <StepError text={t("loadError")} />
          ))}

        {stepName === "team" &&
          (data.team ? (
            <TeamPanel
              associationId={associationId}
              slug={slug}
              currentCode={inviteCode}
              people={data.team.people}
              sections={data.team.sections}
              pendingRequests={data.team.pendingRequests}
            />
          ) : (
            <StepError text={t("loadError")} />
          ))}

        {stepName === "cycles" && (
          <CyclesStep
            associationId={associationId}
            cycle={data.cycle}
            busy={busy}
            onCreate={() => run(() => startCycleBuild(associationId))}
            t={t}
          />
        )}
      </div>

      {/* Navigazione del percorso */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <div className="flex items-center gap-3">
          {stepIndex > 0 && (
            <button
              onClick={() => run(() => goBackOnboarding(associationId))}
              disabled={busy}
              className="text-body-sm text-ink-secondary hover:text-navy transition-colors disabled:opacity-40"
            >
              {t("back")}
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => run(() => finishOnboarding(associationId))}
            disabled={busy}
            className="text-body-sm text-ink-tertiary hover:text-ink-secondary transition-colors disabled:opacity-40"
          >
            {t("finishNow")}
          </button>
          <button
            onClick={() => run(() => advanceOnboarding(associationId))}
            disabled={busy}
            className="bg-navy text-white px-5 py-2.5 rounded-md text-body-sm hover:bg-navy-700 transition-colors duration-100 disabled:opacity-40"
          >
            {isLast ? t("finish") : t("next")}
          </button>
        </div>
      </div>
    </div>
  );
}

function StepError({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-error/30 bg-error-bg px-4 py-3">
      <p className="text-body-sm text-error">{text}</p>
    </div>
  );
}

function CyclesStep({
  cycle,
  busy,
  onCreate,
  t,
}: {
  associationId: string;
  cycle: CycleCardState | undefined;
  busy: boolean;
  onCreate: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  if (cycle) return <CycleCardFlow initialState={cycle} />;

  return (
    <div className="rounded-lg border border-border bg-white px-5 py-6 text-center">
      <p className="text-body text-ink-secondary">{t("steps.cycles.empty")}</p>
      <button
        onClick={onCreate}
        disabled={busy}
        className="mt-4 bg-navy text-white px-4 py-2 rounded-md text-body-sm hover:bg-navy-700 transition-colors duration-100 disabled:opacity-40"
      >
        {t("steps.cycles.create")}
      </button>
    </div>
  );
}
