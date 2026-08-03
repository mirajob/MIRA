"use client";

import { useTranslations } from "next-intl";
import { DemoReel, Typewriter, SectionLabel, type SetTarget } from "./demo-reel";
import { associationData, associationFrames, type AssocFrame } from "./association-scenario";

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
          <Members t={t} />
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

  // ——— CANDIDATURE: arrivano già divise per fase ———
  if (block === "candidates") {
    return (
      <div className="mx-auto max-w-[420px]">
        <GuideBar text={t("guide.candidates")} />
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-medium text-navy">{t("applications")} · {a.cycleTitle}</p>
          <span className="rounded-full bg-success-bg px-2 py-0.5 text-[9px] font-semibold text-success">
            {t("newCount", { n: a.candidates.length })}
          </span>
        </div>
        <div className="space-y-1.5">
          {a.candidates.map((cnd, i) => (
            <div
              key={cnd.name}
              className="flex items-center gap-2.5 rounded-lg border border-border bg-white px-3 py-2 shadow-sm"
              style={pop(i)}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-50 text-[10px] font-semibold text-navy">
                {cnd.name.split(" ").map((w) => w[0]).join("")}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium text-ink">{cnd.name}</p>
                <p className="text-[9px] text-ink-tertiary">{cnd.role}</p>
              </div>
              <span className="ml-auto text-[9px] text-petrol">{t("openCard")}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ——— COLLOQUI: chi del board c'è, orario per orario ———
  if (block === "slots") {
    const r = a.round;
    return (
      <div className="mx-auto max-w-[420px]">
        <GuideBar text={t("guide.slots")} />
        <div className="rounded-lg border border-border bg-white px-3 py-2.5 shadow-sm">
          <div className="flex items-baseline gap-2">
            <span className="text-[9px] uppercase tracking-[0.14em] text-navy/50">{t("roundLabel")}</span>
            <p className="text-[12px] font-medium text-navy">{r.title}</p>
            <span className="ml-auto text-[9px] text-ink-tertiary">{r.mode} · {r.days}</span>
          </div>

          <div className="mt-2 space-y-1">
            {r.slots.map((slot, i) => (
              <div key={slot.time} className="flex items-center gap-2" style={pop(i)}>
                <span className="w-11 rounded bg-navy-50 py-0.5 text-center text-[10px] font-medium tabular-nums text-navy">
                  {slot.time}
                </span>
                <span className="flex gap-1">
                  {slot.people.map((initials) => (
                    <span
                      key={initials}
                      className="flex h-4 w-4 items-center justify-center rounded-full bg-petrol text-[7px] font-semibold text-white"
                    >
                      {initials}
                    </span>
                  ))}
                </span>
                <span className={`ml-auto text-[9px] ${slot.people.length ? "text-success" : "text-ink-tertiary"}`}>
                  {slot.people.length ? t("bookable") : t("nobodyThere")}
                </span>
              </div>
            ))}
          </div>

          <button
            ref={setTarget("invite")}
            type="button"
            className="mt-2.5 w-full rounded-md bg-navy py-1.5 text-[11px] font-medium text-white"
          >
            {t("inviteCandidates")}
          </button>
        </div>
      </div>
    );
  }

  // ——— PRENOTAZIONE: la sceglie il candidato, il resto parte da solo ———
  if (block === "booking") {
    const b = a.booking;
    return (
      <div className="mx-auto max-w-[400px]">
        <GuideBar text={t("guide.booking")} />
        <div
          className="rounded-lg border border-petrol/40 bg-white px-3 py-2.5 shadow-sm"
          style={{ animation: "mira-pop .4s var(--ease-out) both" }}
        >
          <p className="text-[11px] font-medium text-navy">{b.candidate}</p>
          <p className="mt-0.5 text-[12px] font-medium tabular-nums text-ink">{b.when}</p>
          <p className="text-[9px] text-ink-tertiary">{t("runBy", { name: b.interviewer })}</p>
          <p className="mt-1 truncate text-[9px] text-petrol">{b.link}</p>
        </div>
        <div className="mt-2 space-y-1">
          {["autoLink", "autoEmail", "autoCalendar"].map((key, i) => (
            <div
              key={key}
              className="flex items-center gap-1.5 rounded-md border border-success/30 bg-success-bg px-2 py-1 text-[9px] text-success"
              style={pop(i)}
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              {t(key)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ——— MEMBRI: chi entra sta nell'associazione, diviso in sezioni ———
  return <Members t={t} />;
}

function Members({ t }: { t: T }) {
  const sections = associationData.members;
  return (
    <div className="flex h-full flex-col">
      <GuideBar text={t("guide.members")} />
      <div className="grid flex-1 grid-cols-2 gap-2">
        {sections.map((section, si) => (
          <div key={section.section} className="flex flex-col rounded-lg bg-navy-50/60 p-2" style={pop(si)}>
            <span className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-navy/70">
              {section.section}
            </span>
            <div className="space-y-1.5">
              {section.people.map((name, i) => (
                <div
                  key={name}
                  className="flex items-center gap-1.5 rounded-md border border-border bg-white px-2 py-1.5 shadow-sm"
                  style={pop(si + i + 1)}
                >
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
