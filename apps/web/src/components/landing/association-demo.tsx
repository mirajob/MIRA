"use client";

import { useTranslations } from "next-intl";
import { DemoReel, Typewriter, SectionLabel, type SetTarget } from "./demo-reel";
import { associationData, associationFrames, type AssocFrame } from "./association-scenario";
import { studentData } from "./demo-scenario";

/**
 * Scenario ASSOCIAZIONE (cornice browser/laptop). Le scene vivono qui; il motore
 * (timing, cursore, cornice, pausa, reduced-motion) sta in `demo-reel.tsx`.
 */

type T = ReturnType<typeof useTranslations>;

export function AssociationDemo() {
  const t = useTranslations("AssociationDemo");
  const a = associationData;

  const renderMeter = () => (
    <div className="flex items-center gap-2 border-b border-border bg-white px-3.5 py-2">
      <span className="flex h-5 w-5 items-center justify-center rounded bg-navy text-[10px] font-semibold text-white">{a.monogram}</span>
      <span className="text-[11px] font-medium text-navy">{a.name}</span>
      <span className="ml-auto text-[9px] tracking-[0.14em] text-navy/40 uppercase">{t("dashboard")}</span>
    </div>
  );

  const renderFrame = (frame: AssocFrame, { setTarget }: { setTarget: SetTarget }) => (
    <div className="absolute inset-0 overflow-hidden p-3.5">
      <AssocScene frame={frame} t={t} setTarget={setTarget} />
    </div>
  );

  return (
    <DemoReel
      frames={associationFrames}
      device="laptop"
      renderMeter={renderMeter}
      renderFrame={renderFrame}
      renderStatic={() => (
        <div className="absolute inset-0 overflow-hidden p-3.5">
          <Pipeline t={t} />
        </div>
      )}
      pauseLabel={t("pause")}
      playLabel={t("play")}
    />
  );
}

function GuideBar({ text, typing, duration }: { text: string; typing?: boolean; duration?: number }) {
  return (
    <div className="mb-2.5 flex items-start gap-2 rounded-lg border border-petrol/25 bg-petrol-50/70 px-3 py-2" style={{ animation: "mira-pop .4s var(--ease-out) both" }}>
      <span className="mt-[1px] text-petrol" aria-hidden="true">✦</span>
      <p className="text-[12px] leading-snug text-ink">
        {typing ? <Typewriter text={text} duration={duration ?? 900} caret={false} /> : text}
      </p>
    </div>
  );
}

function AssocScene({ frame, t, setTarget }: { frame: AssocFrame; t: T; setTarget: SetTarget }) {
  const a = associationData;
  const { block, phase } = frame;

  // ——— CICLO: componi e pubblica ———
  if (block === "cycle") {
    if (phase === "compose") {
      return (
        <div className="mx-auto max-w-[360px]">
          <GuideBar text={t("guide.compose")} />
          <div className="rounded-lg border border-petrol/40 bg-white px-3 py-2.5 shadow-sm">
            <SectionLabel>{t("newCycle")}</SectionLabel>
            <p className="text-[12px] leading-snug text-ink">
              <Typewriter text={a.compose} duration={2400} />
            </p>
          </div>
        </div>
      );
    }
    // building → publish
    return (
      <div className="mx-auto max-w-[420px]">
        <GuideBar text={t("guide.building")} />
        <div className="rounded-lg border border-border bg-white px-3.5 py-3 shadow-sm" style={{ animation: "mira-pop .45s var(--ease-out) both" }}>
          <p className="font-display text-[14px] text-navy">{a.cycleTitle}</p>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <SectionLabel>{t("positions")}</SectionLabel>
              <div className="flex flex-wrap gap-1">
                {a.roles.map((r, i) => (
                  <span key={r} className="rounded-full bg-petrol-50 px-2 py-0.5 text-[10px] text-petrol-700" style={pop(i)}>{r}</span>
                ))}
              </div>
              <div className="mt-2">
                <SectionLabel>{t("requirements")}</SectionLabel>
                <ul className="space-y-0.5">
                  {a.requirements.map((r, i) => (
                    <li key={r} className="flex items-center gap-1 text-[10px] text-ink-secondary" style={pop(i + 2)}>
                      <span className="text-petrol">•</span> {r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div>
              <SectionLabel>{t("questions")}</SectionLabel>
              <ul className="space-y-1">
                {a.questions.map((q, i) => (
                  <li key={q} className="rounded-md border border-border bg-paper px-2 py-1 text-[10px] text-ink" style={pop(i + 4)}>{q}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[10px] text-ink-tertiary">{a.openWindow}</span>
            <button ref={setTarget("publish")} type="button" className="rounded-md bg-navy px-4 py-1.5 text-[11px] font-medium text-white">
              {t("publish")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ——— CANDIDATURE: elenco ———
  if (block === "candidates") {
    return (
      <div className="mx-auto max-w-[420px]">
        <GuideBar text={t("guide.candidates")} />
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-medium text-navy">{t("applications")} · {a.cycleTitle}</p>
          <span className="rounded-full bg-success-bg px-2 py-0.5 text-[9px] font-semibold text-success">{t("newCount", { n: a.candidates.length })}</span>
        </div>
        <div className="space-y-1.5">
          {a.candidates.map((cnd, i) => {
            const isFirst = i === 0;
            return (
              <div
                key={cnd.name}
                ref={isFirst ? setTarget("candidate") : undefined}
                className={`flex items-center gap-2.5 rounded-lg border bg-white px-3 py-2 shadow-sm ${isFirst ? "border-petrol/40" : "border-border"}`}
                style={pop(i)}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-50 text-[10px] font-semibold text-navy">
                  {cnd.name.split(" ").map((w) => w[0]).join("")}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium text-ink">{cnd.name}</p>
                  <p className="text-[9px] text-ink-tertiary">{cnd.role}</p>
                </div>
                <span className="ml-auto text-[10px] font-semibold text-petrol">{cnd.match}% {t("match")}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ——— DETTAGLIO CANDIDATO: card + risposte + valutazione AI ———
  if (block === "detail") {
    const d = a.detail;
    const invited = phase === "invite";
    const chips = [...studentData.availability.slice(0, 2), ...studentData.academicSkills.slice(0, 2)];
    return (
      <div className="grid h-full grid-cols-[1fr_1.15fr] gap-3">
        {/* MIRA Card mini */}
        <div className="flex flex-col rounded-lg border border-border bg-white px-3 py-2.5 shadow-sm" style={{ animation: "mira-slidein .4s var(--ease-out) both" }}>
          <div className="flex items-baseline justify-between">
            <p className="font-display text-[13px] text-navy">{d.name}</p>
            <span className="text-[7px] tracking-[0.16em] text-navy/40 uppercase">MIRA Card</span>
          </div>
          <p className="mt-0.5 text-[9px] text-ink-secondary">{d.course}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {chips.map((s) => (
              <span key={s} className="rounded-full bg-petrol-50 px-1.5 py-0.5 text-[8px] text-petrol-700">{s}</span>
            ))}
          </div>
          <div className="mt-2 border-t border-border pt-2">
            <SectionLabel>{t("motivation")}</SectionLabel>
            <p className="text-[9px] leading-snug text-ink">“{d.motivationA}”</p>
          </div>
        </div>

        {/* Valutazione AI + azione */}
        <div className="flex flex-col gap-2">
          <GuideBar text={t("guide.detail")} />
          <div className="flex-1 rounded-lg border border-border bg-white px-3 py-2.5 shadow-sm" style={{ animation: "mira-slidein .4s var(--ease-out) both", animationDelay: "80ms" }}>
            <div className="flex items-center justify-between">
              <SectionLabel>{t("aiEvaluation")}</SectionLabel>
              <span className="rounded-full bg-petrol-50 px-2 py-0.5 text-[10px] font-semibold text-petrol-700">{d.evalScore}/10 · {t("strongFit")}</span>
            </div>
            <ul className="mt-1.5 space-y-1">
              {d.evalBullets.map((b) => (
                <li key={b} className="flex items-start gap-1 text-[9px] leading-snug text-ink-secondary">
                  <span className="mt-[1px] text-petrol">•</span> {b}
                </li>
              ))}
            </ul>
          </div>
          {invited ? (
            <div className="flex items-center justify-center gap-1.5 rounded-md border border-success/40 bg-success-bg py-2 text-[11px] font-medium text-success" style={{ animation: "mira-pop .35s var(--ease-out) both" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
              {t("interviewSent")}
            </div>
          ) : (
            <button ref={setTarget("invite")} type="button" className="rounded-md bg-navy py-2 text-[11px] font-medium text-white">
              {t("inviteInterview")}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ——— PIPELINE (reveal) ———
  return <Pipeline t={t} />;
}

function Pipeline({ t }: { t: T }) {
  const p = associationData.pipeline;
  const columns: { key: string; title: string; names: string[]; tone: string }[] = [
    { key: "review", title: t("colReview"), names: p.review, tone: "text-ink-secondary" },
    { key: "interview", title: t("colInterview"), names: p.interview, tone: "text-petrol-700" },
    { key: "accepted", title: t("colAccepted"), names: p.accepted, tone: "text-success" },
  ];
  return (
    <div className="flex h-full flex-col">
      <p className="mb-2 text-[11px] font-medium text-navy">{t("pipelineTitle")}</p>
      <div className="grid flex-1 grid-cols-3 gap-2">
        {columns.map((col, ci) => (
          <div key={col.key} className="flex flex-col rounded-lg bg-navy-50/60 p-2" style={pop(ci)}>
            <div className="mb-1.5 flex items-center justify-between">
              <span className={`text-[9px] font-semibold uppercase tracking-[0.1em] ${col.tone}`}>{col.title}</span>
              <span className="text-[9px] text-ink-tertiary">{col.names.length}</span>
            </div>
            <div className="space-y-1.5">
              {col.names.map((name, i) => (
                <div key={name} className="flex items-center gap-1.5 rounded-md border border-border bg-white px-2 py-1.5 shadow-sm" style={pop(ci + i + 1)}>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-50 text-[8px] font-semibold text-navy">
                    {name.split(" ").map((w) => w[0]).join("")}
                  </span>
                  <span className="truncate text-[9px] font-medium text-ink">{name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function pop(i: number): React.CSSProperties {
  return { animation: "mira-pop .4s var(--ease-out) both", animationDelay: `${i * 70}ms` };
}
