"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { MiraGuide } from "@/components/mira-guide";
import { guideProgressPct, nextGuideStep } from "@/lib/association-guide";
import type { GuideStep, GuideStepState } from "@/lib/association-guide";
import { skipGuideStep, unskipGuideStep, dismissGuide, reopenGuide } from "@/lib/actions/association-guide";

/**
 * La Panoramica: MIRA accoglie il board e lo accompagna tappa per tappa. Ogni tappa mostra
 * il suo stato (fatta / da fare / saltata) e un pulsante che porta dove serve. Le tappe si
 * possono saltare e riprendere; la guida si puo' chiudere quando e' tutto pronto.
 */
export function GuidedHome({
  associationId,
  associationName,
  steps,
  dismissed,
}: {
  associationId: string;
  associationName: string;
  steps: GuideStepState[];
  dismissed: boolean;
}) {
  const t = useTranslations("GuidedHome");
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const progressPct = guideProgressPct(steps);
  const next = nextGuideStep(steps);
  const allSettled = steps.every((s) => s.done || s.skipped);
  const allDone = steps.every((s) => s.done);

  async function run(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    await fn();
    router.refresh();
    setBusy(null);
  }

  // Guida chiusa e non tutto fatto: una barra sottile per riaprirla, senza invadere.
  if (dismissed && !allDone) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-white px-4 py-3">
        <p className="text-body-sm text-ink-secondary">{t("dismissedBar", { pct: progressPct })}</p>
        <button
          onClick={() => run("reopen", () => reopenGuide(associationId))}
          disabled={busy !== null}
          className="text-body-sm text-petrol hover:text-petrol-700 transition-colors disabled:opacity-40"
        >
          {t("reopen")}
        </button>
      </div>
    );
  }

  const introText = allDone
    ? t("introDone", { name: associationName })
    : t("intro", { name: associationName });

  return (
    <div className="space-y-4">
      <MiraGuide text={introText} />

      {!allDone && (
        <div className="rounded-lg border border-border bg-white px-5 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-eyebrow text-navy/60 uppercase">{t("progressTitle")}</p>
            <span className="text-xs font-semibold text-ink tabular-nums">{progressPct}%</span>
          </div>
          <div className="mt-2 h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-petrol rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      <ol className="space-y-2.5">
        {steps.map((s, i) => (
          <StepRow
            key={s.step}
            index={i + 1}
            state={s}
            isNext={s.step === next}
            busy={busy !== null}
            onSkip={() => run(`skip-${s.step}`, () => skipGuideStep(associationId, s.step))}
            onResume={() => run(`resume-${s.step}`, () => unskipGuideStep(associationId, s.step))}
            t={t}
          />
        ))}
      </ol>

      {allSettled && !allDone && (
        <p className="text-body-sm text-ink-tertiary">{t("someSkipped")}</p>
      )}

      {!allDone && (
        <button
          onClick={() => run("dismiss", () => dismissGuide(associationId))}
          disabled={busy !== null}
          className="text-body-sm text-ink-tertiary hover:text-ink-secondary transition-colors disabled:opacity-40"
        >
          {t("dismiss")}
        </button>
      )}
    </div>
  );
}

function StepRow({
  index,
  state,
  isNext,
  busy,
  onSkip,
  onResume,
  t,
}: {
  index: number;
  state: GuideStepState;
  isNext: boolean;
  busy: boolean;
  onSkip: () => void;
  onResume: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const { step, done, skipped } = state;

  const badge = done
    ? { label: t("statusDone"), cls: "bg-success-bg text-success" }
    : skipped
      ? { label: t("statusSkipped"), cls: "bg-navy-50 text-ink-tertiary" }
      : { label: t("statusTodo"), cls: "bg-warning-bg text-warning" };

  return (
    <li
      className={`rounded-lg border bg-white px-5 py-4 ${
        isNext ? "border-petrol/40" : "border-border"
      }`}
    >
      <div className="flex items-start gap-3">
        <StepMarker index={index} done={done} skipped={skipped} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-body font-medium text-navy">{t(`steps.${step}.title`)}</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${badge.cls}`}>
              {badge.label}
            </span>
          </div>
          <p className="mt-0.5 text-body-sm text-ink-secondary">{t(`steps.${step}.body`)}</p>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Link
              href={state.href}
              className={`rounded-md px-4 py-2 text-body-sm transition-colors duration-100 ${
                done
                  ? "border border-border text-navy hover:border-border-strong"
                  : "bg-navy text-white hover:bg-navy-700"
              }`}
            >
              {done ? t(`steps.${step}.ctaDone`) : t(`steps.${step}.cta`)}
            </Link>

            {!done &&
              (skipped ? (
                <button
                  onClick={onResume}
                  disabled={busy}
                  className="text-body-sm text-petrol hover:text-petrol-700 transition-colors disabled:opacity-40"
                >
                  {t("resume")}
                </button>
              ) : (
                <button
                  onClick={onSkip}
                  disabled={busy}
                  className="text-body-sm text-ink-tertiary hover:text-ink-secondary transition-colors disabled:opacity-40"
                >
                  {t("skip")}
                </button>
              ))}
          </div>
        </div>
      </div>
    </li>
  );
}

function StepMarker({ index, done, skipped }: { index: number; done: boolean; skipped: boolean }) {
  if (done) {
    return (
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success-bg text-success">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    );
  }
  return (
    <div
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-body-sm font-medium ${
        skipped ? "bg-navy-50 text-ink-tertiary" : "border border-petrol/40 text-petrol"
      }`}
    >
      {index}
    </div>
  );
}
