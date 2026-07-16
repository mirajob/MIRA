"use client";

import { useTranslations } from "next-intl";
import {
  DemoReel,
  Typewriter,
  Chip,
  SectionLabel,
  Panel,
  Guide,
  type SetTarget,
} from "./demo-reel";
import {
  studentData,
  studentFrames,
  TOTAL_BLOCKS,
  type Frame,
  type StudentBlock,
} from "./demo-scenario";

/**
 * Scenario STUDENTE del reel della landing (cornice telefono).
 *
 * Mostra la meccanica reale dell'onboarding: la guida di MIRA, i campi che si
 * compilano da soli, il cursore finto che tocca i bottoni, "Migliora con MIRA"
 * che riscrive il testo grezzo in inglese — fino al reveal della MIRA Card
 * completa. Il motore (timing, cursore, cornice, pausa, reduced-motion) sta in
 * `demo-reel.tsx`; qui vivono solo le scene dello studente.
 */

const ORDER: Exclude<StudentBlock, "reveal">[] = [
  "header",
  "esperienze",
  "disponibilita",
  "competenze",
  "lingue",
  "profilo",
];

const TITLE_KEY: Record<Exclude<StudentBlock, "reveal">, string> = {
  header: "header",
  esperienze: "experience",
  disponibilita: "availability",
  competenze: "skills",
  lingue: "languages",
  profilo: "profile",
};

type T = ReturnType<typeof useTranslations>;

export function LandingDemo() {
  const t = useTranslations("LandingDemo");

  const renderMeter = (frame: Frame) => {
    const pct = Math.round((frame.approved / TOTAL_BLOCKS) * 100);
    return (
      <div className="px-4 pb-2 pt-1">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[9px] tracking-[0.14em] text-navy/50 uppercase">{t("progressTitle")}</span>
          <span className="text-[10px] font-semibold text-ink tabular-nums">{pct}%</span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-petrol transition-all duration-700 ease-out" style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  };

  const renderFrame = (frame: Frame, { setTarget }: { setTarget: SetTarget }) => {
    if (frame.block === "reveal") return <DemoCard />;
    return (
      <>
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-3.5">
          {ORDER.slice(0, frame.approved).map((b) => (
            <ApprovedRow key={b} title={t(`titles.${TITLE_KEY[b]}`)} label={t("confirmed")} />
          ))}
          <ActiveScene frame={frame} t={t} setTarget={setTarget} />
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-cream to-transparent" />
      </>
    );
  };

  return (
    <DemoReel
      frames={studentFrames}
      device="phone"
      renderMeter={renderMeter}
      renderFrame={renderFrame}
      renderStatic={() => <DemoCard />}
      pauseLabel={t("pause")}
      playLabel={t("play")}
    />
  );
}

// ---------------------------------------------------------------------------

function ApprovedRow({ title, label }: { title: string; label: string }) {
  return (
    <div
      className="flex items-center justify-between rounded-lg border border-border bg-white/70 px-3 py-1.5"
      style={{ animation: "mira-pop .4s var(--ease-out) both" }}
    >
      <span className="text-[9px] tracking-[0.12em] text-navy/55 uppercase">{title}</span>
      <span className="flex items-center gap-1 text-[9px] font-semibold text-success">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
        {label}
      </span>
    </div>
  );
}

function ConfirmButton({ setTarget, label }: { setTarget: SetTarget; label: string }) {
  return (
    <button ref={setTarget("confirm")} type="button" className="mt-2.5 w-full rounded-md bg-navy py-2 text-[12px] font-medium text-white">
      {label}
    </button>
  );
}

function ActiveScene({ frame, t, setTarget }: { frame: Frame; t: T; setTarget: SetTarget }) {
  const { block, phase } = frame;

  // ——— HEADER ———
  if (block === "header") {
    if (phase === "intro") {
      return (
        <div className="space-y-2">
          <Guide text={t("guide.headerIntro", { name: studentData.name.split(" ")[0] ?? studentData.name })} typing duration={900} />
          <Panel>
            <SectionLabel>{t("titles.header")}</SectionLabel>
            <div className="space-y-1.5">
              <div className="h-2 w-4/5 rounded bg-border" />
              <div className="h-2 w-3/5 rounded bg-border" />
            </div>
            <button ref={setTarget("upload")} type="button" className="mt-2.5 w-full rounded-md bg-navy py-2 text-[12px] font-medium text-white">
              {t("uploadTranscript")}
            </button>
          </Panel>
        </div>
      );
    }
    if (phase === "uploading") {
      return (
        <div className="space-y-2">
          <Guide text={t("guide.headerUploading")} />
          <Panel>
            <div className="relative h-16 overflow-hidden rounded-md bg-navy-50">
              <div className="absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-petrol/25 to-transparent" style={{ animation: "mira-scan 1.1s var(--ease-in-out) infinite" }} />
              <div className="flex h-full items-center justify-center gap-1.5">
                <span className="text-[11px] text-ink-secondary">{t("reading")}</span>
              </div>
            </div>
          </Panel>
        </div>
      );
    }
    return (
      <div className="space-y-2">
        <Guide text={t("guide.headerFilled")} />
        <Panel>
          <SectionLabel>{t("titles.header")}</SectionLabel>
          <p className="text-[12px] font-medium text-ink" style={{ animation: "mira-pop .4s var(--ease-out) both" }}>{studentData.header.course}</p>
          <p className="text-[11px] text-ink-secondary" style={{ animation: "mira-pop .4s var(--ease-out) both", animationDelay: "80ms" }}>{studentData.header.university}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5" style={{ animation: "mira-pop .4s var(--ease-out) both", animationDelay: "160ms" }}>
            <Chip>{studentData.header.level}</Chip>
            <Chip i={1}>{studentData.header.year}</Chip>
            <span className="text-[11px] font-semibold text-ink">{studentData.header.average}</span>
          </div>
          <ConfirmButton setTarget={setTarget} label={t("confirm")} />
        </Panel>
      </div>
    );
  }

  // ——— ESPERIENZE ———
  if (block === "esperienze") {
    if (phase === "ask") {
      return (
        <div className="space-y-2">
          <Guide text={t("guide.expAsk")} typing duration={800} />
          <Panel>
            <div className="min-h-[52px] rounded-md border border-border bg-paper px-2.5 py-2 text-[12px] text-ink-tertiary">{t("expPlaceholder")}</div>
          </Panel>
        </div>
      );
    }
    if (phase === "typing") {
      return (
        <div className="space-y-2">
          <Guide text={t("guide.expAsk")} />
          <Panel>
            <div className="min-h-[52px] rounded-md border border-petrol/40 bg-white px-2.5 py-2 text-[12px] text-ink">
              <Typewriter text={studentData.experienceRaw} duration={2000} />
            </div>
          </Panel>
        </div>
      );
    }
    if (phase === "improve") {
      return (
        <div className="space-y-2">
          <Guide text={t("guide.expImprove")} />
          <Panel>
            <div className="min-h-[52px] rounded-md border border-border bg-paper px-2.5 py-2 text-[12px] text-ink">{studentData.experienceRaw}</div>
            <button ref={setTarget("improve")} type="button" className="mt-2.5 w-full rounded-md border border-petrol bg-petrol-50 py-2 text-[12px] font-medium text-petrol-700">
              {t("improve")}
            </button>
          </Panel>
        </div>
      );
    }
    return (
      <div className="space-y-2">
        <Guide text={t("guide.expImproved")} />
        <Panel>
          <SectionLabel>{t("titles.experience")}</SectionLabel>
          <div style={{ animation: "mira-pop .45s var(--ease-out) both" }}>
            <p className="text-[12px] font-medium text-ink leading-snug">{studentData.experienceRefined}</p>
            <p className="mt-0.5 text-[10px] text-ink-tertiary">{studentData.experienceOrg}</p>
          </div>
          <ConfirmButton setTarget={setTarget} label={t("confirm")} />
        </Panel>
      </div>
    );
  }

  // ——— DISPONIBILITÀ E PIANO ———
  if (block === "disponibilita") {
    if (phase === "ask") {
      return (
        <div className="space-y-2">
          <Guide text={t("guide.availability")} typing duration={900} />
          <Panel><div className="h-10 rounded-md bg-navy-50" /></Panel>
        </div>
      );
    }
    return (
      <div className="space-y-2">
        <Guide text={t("guide.availability")} />
        <Panel>
          <SectionLabel>{t("titles.availability")}</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {studentData.availability.map((a, i) => (
              <Chip key={a} i={i}>{a}</Chip>
            ))}
          </div>
          <p className="mt-1.5 text-[10px] text-ink-tertiary" style={{ animation: "mira-pop .4s var(--ease-out) both", animationDelay: "300ms" }}>{studentData.availabilityNote}</p>
          <div className="mt-2 border-t border-border pt-2" style={{ animation: "mira-pop .4s var(--ease-out) both", animationDelay: "400ms" }}>
            <SectionLabel>{t("planLabel")}</SectionLabel>
            <p className="text-[11px] leading-snug text-ink-secondary">{studentData.plan}</p>
          </div>
          <ConfirmButton setTarget={setTarget} label={t("confirm")} />
        </Panel>
      </div>
    );
  }

  // ——— COMPETENZE ———
  if (block === "competenze") {
    return (
      <div className="space-y-2">
        <Guide text={t("guide.skills")} />
        <Panel>
          <SectionLabel>{t("academicLabel")}</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {studentData.academicSkills.map((s, i) => (
              <Chip key={s} i={i}>{s}</Chip>
            ))}
          </div>
          <div className="mt-2">
            <SectionLabel>{t("hardLabel")}</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {studentData.hardSkills.map((s, i) => (
                <Chip key={s} i={i + studentData.academicSkills.length} tone="muted">{s}</Chip>
              ))}
            </div>
          </div>
          <ConfirmButton setTarget={setTarget} label={t("confirm")} />
        </Panel>
      </div>
    );
  }

  // ——— LINGUE ———
  if (block === "lingue") {
    return (
      <div className="space-y-2">
        <Guide text={t("guide.languages")} />
        <Panel>
          <SectionLabel>{t("titles.languages")}</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {studentData.languages.map((l, i) => (
              <Chip key={l} i={i}>{l}</Chip>
            ))}
          </div>
          <ConfirmButton setTarget={setTarget} label={t("confirm")} />
        </Panel>
      </div>
    );
  }

  // ——— PROFILO PERSONALE ———
  return (
    <div className="space-y-2">
      <Guide text={t("guide.profile")} />
      <Panel>
        <SectionLabel>{t("titles.profile")}</SectionLabel>
        <p className="font-display text-[12px] italic leading-relaxed text-ink">
          <Typewriter text={studentData.personalProfile} duration={2600} caret={false} />
        </p>
        <ConfirmButton setTarget={setTarget} label={t("confirm")} />
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reveal: MIRA Card completa (statica, in inglese)
// ---------------------------------------------------------------------------

function DemoCard() {
  const d = studentData;
  let step = 0;
  const rise = () => ({ animation: "mira-cardin .5s var(--ease-out) both", animationDelay: `${(step++) * 90}ms` });
  return (
    <div className="absolute inset-0 overflow-hidden px-3.5 py-3">
      <div className="flex h-full flex-col rounded-xl border border-border bg-white px-3.5 py-3 shadow-sm">
        <div className="flex items-baseline justify-between" style={rise()}>
          <h3 className="font-display text-[16px] leading-tight text-navy">{d.name}</h3>
          <span className="text-[8px] tracking-[0.18em] text-navy/40 uppercase">MIRA Card</span>
        </div>
        <p className="mt-0.5 text-[11px] text-ink" style={rise()}>
          {d.header.course}
          <span className="text-ink-tertiary"> · {d.header.average}</span>
        </p>

        <div className="mt-2 border-t border-border pt-2" style={rise()}>
          <SectionLabel>Availability</SectionLabel>
          <div className="flex flex-wrap gap-1">
            {d.availability.slice(0, 4).map((a) => (
              <span key={a} className="rounded-full bg-petrol-50 px-1.5 py-0.5 text-[9px] text-petrol-700">{a}</span>
            ))}
          </div>
        </div>

        <div className="mt-2" style={rise()}>
          <SectionLabel>Experience</SectionLabel>
          <p className="text-[10px] leading-snug text-ink">{d.experienceRefined}</p>
        </div>

        <div className="mt-2" style={rise()}>
          <SectionLabel>Skills</SectionLabel>
          <div className="flex flex-wrap gap-1">
            {[...d.academicSkills.slice(0, 2), ...d.hardSkills.slice(0, 2)].map((s) => (
              <span key={s} className="rounded-full bg-petrol-50 px-1.5 py-0.5 text-[9px] text-petrol-700">{s}</span>
            ))}
          </div>
        </div>

        <div className="mt-2" style={rise()}>
          <SectionLabel>Languages</SectionLabel>
          <p className="text-[10px] text-ink-secondary">{d.languages.join("  ·  ")}</p>
        </div>

        <div className="mt-2 border-t border-border pt-2" style={rise()}>
          <SectionLabel>Personal profile</SectionLabel>
          <p className="font-display text-[10px] italic leading-relaxed text-ink line-clamp-4">{d.personalProfile}</p>
        </div>
      </div>
    </div>
  );
}
