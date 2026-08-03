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
 * Mostra la meccanica reale dell'onboarding, nell'ordine vero: si parte da cosa
 * cerchi, poi le esperienze (dal CV), i dati del corso, lo sblocco della
 * candidatura, gli esami dal libretto (facoltativi), competenze, lingue e il
 * profilo personale, dove ✦ Migliora con MIRA riscrive in inglese quello che lo
 * studente ha buttato giù in italiano. Chiude il reveal della card.
 *
 * Il motore (timing, cursore, cornice, pausa, reduced-motion) sta in
 * `demo-reel.tsx`; qui vivono solo le scene dello studente.
 */

/** I sei blocchi che contano nella percentuale: gate ed esami non ne fanno parte. */
const ORDER: Exclude<StudentBlock, "reveal" | "gate" | "esami">[] = [
  "disponibilita",
  "esperienze",
  "studi",
  "competenze",
  "lingue",
  "profilo",
];

const TITLE_KEY: Record<(typeof ORDER)[number], string> = {
  disponibilita: "availability",
  esperienze: "experience",
  studi: "studies",
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

/** Riga "etichetta · valore" dei blocchi a campi (disponibilità, studi). */
function FieldRow({ label, value, i = 0 }: { label: string; value?: string; i?: number }) {
  return (
    <div className="flex items-baseline gap-2 py-[3px]" style={{ animation: "mira-pop .4s var(--ease-out) both", animationDelay: `${i * 70}ms` }}>
      <span className="w-[62px] shrink-0 text-[9px] text-ink-tertiary">{label}</span>
      {value ? (
        <span className="text-[11px] leading-snug text-ink">{value}</span>
      ) : (
        <span className="h-2 flex-1 rounded bg-border" />
      )}
    </div>
  );
}

/** L'interruttore "in cerca / aperto a opportunità" del blocco disponibilità. */
function Toggle({ label, on }: { label: string; on: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] text-ink-secondary">{label}</span>
      <span className={`flex h-3.5 w-6 shrink-0 items-center rounded-full px-[2px] transition-colors ${on ? "justify-end bg-petrol" : "justify-start bg-border-strong"}`}>
        <span className="h-2.5 w-2.5 rounded-full bg-white" />
      </span>
    </div>
  );
}

/** Il riquadro che "legge" un file caricato (CV, libretto). */
function Scanning({ label }: { label: string }) {
  return (
    <div className="relative h-16 overflow-hidden rounded-md bg-navy-50">
      <div className="absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-petrol/25 to-transparent" style={{ animation: "mira-scan 1.1s var(--ease-in-out) infinite" }} />
      <div className="flex h-full items-center justify-center">
        <span className="text-[11px] text-ink-secondary">{label}</span>
      </div>
    </div>
  );
}

function ActiveScene({ frame, t, setTarget }: { frame: Frame; t: T; setTarget: SetTarget }) {
  const { block, phase } = frame;
  const d = studentData;

  // ——— DISPONIBILITÀ E PIANO · la prima cosa che MIRA chiede ———
  if (block === "disponibilita") {
    const filled = phase === "filled";
    return (
      <div className="space-y-2">
        <Guide
          text={filled ? t("guide.availabilityPlan") : t("guide.availabilityIntro", { name: d.name.split(" ")[0] ?? d.name })}
          typing={!filled}
          duration={1100}
        />
        <Panel>
          <SectionLabel>{t("titles.availability")}</SectionLabel>
          <Toggle label={t("seekingToggle")} on />
          <div className="mt-1.5 border-t border-border pt-1.5">
            <FieldRow label={t("fields.cosaCerca")} value={filled ? d.availability.cosaCerca : undefined} i={0} />
            <FieldRow label={t("fields.ambito")} value={filled ? d.availability.ambito : undefined} i={1} />
            <FieldRow label={t("fields.periodo")} value={filled ? d.availability.periodo : undefined} i={2} />
            <FieldRow label={t("fields.dove")} value={filled ? d.availability.dove : undefined} i={3} />
          </div>
          {filled && (
            <div className="mt-2 border-t border-border pt-2" style={{ animation: "mira-pop .4s var(--ease-out) both", animationDelay: "320ms" }}>
              <SectionLabel>{t("planLabel")}</SectionLabel>
              <p className="text-[11px] leading-snug text-ink-secondary">{d.plan}</p>
            </div>
          )}
          {filled && <ConfirmButton setTarget={setTarget} label={t("confirm")} />}
        </Panel>
      </div>
    );
  }

  // ——— ESPERIENZE · tre strade, il CV è la più veloce ———
  if (block === "esperienze") {
    if (phase === "ask") {
      return (
        <div className="space-y-2">
          <Guide text={t("guide.experienceAsk")} typing duration={1000} />
          <Panel>
            <button ref={setTarget("upload")} type="button" className="w-full rounded-md bg-navy py-2 text-[12px] font-medium text-white">
              {t("uploadCV")}
            </button>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              <button type="button" className="rounded-md border border-border bg-white py-1.5 text-[11px] text-ink-secondary">
                {t("linkedinOption")}
              </button>
              <button type="button" className="rounded-md border border-border bg-white py-1.5 text-[11px] text-ink-secondary">
                {t("manualOption")}
              </button>
            </div>
          </Panel>
        </div>
      );
    }
    if (phase === "reading") {
      return (
        <div className="space-y-2">
          <Guide text={t("guide.experienceReading")} />
          <Panel>
            <Scanning label={t("readingCV")} />
          </Panel>
        </div>
      );
    }
    return (
      <div className="space-y-2">
        <Guide text={t("guide.experienceFilled", { count: d.experiences.length })} />
        <Panel>
          <SectionLabel>{t("titles.experience")}</SectionLabel>
          <div className="space-y-2">
            {d.experiences.map((exp, i) => (
              <div key={exp.title} style={{ animation: "mira-pop .45s var(--ease-out) both", animationDelay: `${i * 110}ms` }}>
                <p className="text-[11px] font-medium leading-snug text-ink">{exp.title}</p>
                <p className="text-[10px] text-ink-tertiary">{exp.org} · {exp.period}</p>
              </div>
            ))}
          </div>
          <ConfirmButton setTarget={setTarget} label={t("confirm")} />
        </Panel>
      </div>
    );
  }

  // ——— STUDI · università e livello arrivano dalla registrazione ———
  if (block === "studi") {
    return (
      <div className="space-y-2">
        <Guide text={t("guide.studies")} />
        <Panel>
          <SectionLabel>{t("titles.studies")}</SectionLabel>
          <FieldRow label={t("fields.universita")} value={d.studi.university} i={0} />
          <FieldRow label={t("fields.livello")} value={d.studi.level} i={1} />
          <FieldRow label={t("fields.corso")} value={d.studi.course} i={2} />
          <FieldRow label={t("fields.anni")} value={d.studi.years} i={3} />
          <ConfirmButton setTarget={setTarget} label={t("confirm")} />
        </Panel>
      </div>
    );
  }

  // ——— GATE · con questi tre blocchi ci si candida già ———
  if (block === "gate") {
    return (
      <div className="space-y-2">
        <div
          className="rounded-lg border border-success/40 bg-success-bg px-3.5 py-3"
          style={{ animation: "mira-pop .45s var(--ease-out) both" }}
        >
          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-success">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            {t("gateTitle")}
          </p>
          <p className="mt-1 text-[11px] leading-snug text-ink">{t("gateBody", { pct: 50 })}</p>
        </div>
        <Panel>
          <button ref={setTarget("confirm")} type="button" className="w-full rounded-md bg-navy py-2 text-[12px] font-medium text-white">
            {t("gateContinue")}
          </button>
          <button type="button" className="mt-1.5 w-full rounded-md border border-border bg-white py-1.5 text-[11px] text-ink-secondary">
            {t("gateExit")}
          </button>
        </Panel>
      </div>
    );
  }

  // ——— ESAMI · facoltativi, dal libretto ———
  if (block === "esami") {
    if (phase === "ask") {
      return (
        <div className="space-y-2">
          <Guide text={t("guide.exams")} typing duration={1000} />
          <Panel>
            <button ref={setTarget("upload")} type="button" className="w-full rounded-md bg-navy py-2 text-[12px] font-medium text-white">
              {t("uploadTranscript")}
            </button>
            <button type="button" className="mt-1.5 w-full rounded-md border border-border bg-white py-1.5 text-[11px] text-ink-secondary">
              {t("skipStep")}
            </button>
          </Panel>
        </div>
      );
    }
    if (phase === "reading") {
      return (
        <div className="space-y-2">
          <Guide text={t("guide.examsReading")} />
          <Panel>
            <Scanning label={t("readingTranscript")} />
          </Panel>
        </div>
      );
    }
    return (
      <div className="space-y-2">
        <Guide text={t("guide.examsFilled")} />
        <Panel>
          <div className="flex items-center justify-between">
            <SectionLabel>{t("titles.exams")}</SectionLabel>
            <span className="text-[11px] font-semibold text-ink">{studentData.average}</span>
          </div>
          <div className="space-y-1">
            {d.exams.map((ex, i) => (
              <div
                key={ex.name}
                className="flex items-baseline justify-between gap-2"
                style={{ animation: "mira-pop .4s var(--ease-out) both", animationDelay: `${i * 80}ms` }}
              >
                <span className="truncate text-[11px] text-ink">{ex.name}</span>
                <span className="text-[10px] tabular-nums text-ink-secondary">{ex.grade}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 border-t border-border pt-2">
            <Toggle label={t("showAverage")} on />
          </div>
          <ConfirmButton setTarget={setTarget} label={t("confirm")} />
        </Panel>
      </div>
    );
  }

  // ——— COMPETENZE · solo pratiche, con il livello ———
  if (block === "competenze") {
    return (
      <div className="space-y-2">
        <Guide text={t("guide.skills")} />
        <Panel>
          <SectionLabel>{t("titles.skills")}</SectionLabel>
          <div className="space-y-1">
            {d.hardSkills.map((s, i) => (
              <div
                key={s.name}
                className="flex items-center justify-between gap-2"
                style={{ animation: "mira-pop .4s var(--ease-out) both", animationDelay: `${i * 80}ms` }}
              >
                <span className="truncate text-[11px] text-ink">{s.name}</span>
                <span className="shrink-0 rounded-full bg-petrol-50 px-1.5 py-0.5 text-[9px] text-petrol-700">{s.level}</span>
              </div>
            ))}
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
            {d.languages.map((l, i) => (
              <Chip key={l} i={i}>{l}</Chip>
            ))}
          </div>
          <ConfirmButton setTarget={setTarget} label={t("confirm")} />
        </Panel>
      </div>
    );
  }

  // ——— PROFILO PERSONALE · scrivi come parli, MIRA lo riscrive ———
  if (phase === "typing") {
    return (
      <div className="space-y-2">
        <Guide text={t("guide.profileAsk")} />
        <Panel>
          <div className="min-h-[56px] rounded-md border border-petrol/40 bg-white px-2.5 py-2 text-[12px] text-ink">
            <Typewriter text={d.personalProfileRaw} duration={2100} />
          </div>
        </Panel>
      </div>
    );
  }
  if (phase === "improve") {
    return (
      <div className="space-y-2">
        <Guide text={t("guide.profileImprove")} />
        <Panel>
          <div className="min-h-[56px] rounded-md border border-border bg-paper px-2.5 py-2 text-[12px] text-ink">
            {d.personalProfileRaw}
          </div>
          <button ref={setTarget("improve")} type="button" className="mt-2.5 w-full rounded-md border border-petrol bg-petrol-50 py-2 text-[12px] font-medium text-petrol-700">
            {t("improve")}
          </button>
        </Panel>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <Guide text={t("guide.profileImproved")} />
      <Panel>
        <SectionLabel>{t("titles.profile")}</SectionLabel>
        <p className="font-display text-[12px] italic leading-relaxed text-ink line-clamp-6">
          {d.personalProfile}
        </p>
        <ConfirmButton setTarget={setTarget} label={t("confirm")} />
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reveal: MIRA Card completa (statica, in inglese)
// ---------------------------------------------------------------------------

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-petrol-50 px-1.5 py-0.5 text-[8px] leading-tight text-petrol-700">{children}</span>;
}

function DemoCard() {
  const d = studentData;
  let step = 0;
  const rise = () => ({ animation: "mira-cardin .5s var(--ease-out) both", animationDelay: `${(step++) * 90}ms` });
  return (
    <div className="absolute inset-0 overflow-hidden px-3 py-2.5">
      <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-white shadow-sm">
        {/* ——— Masthead: studi a sinistra, disponibilità etichettata a destra ———
            Stessa impaginazione del documento vero (mira-card-document.tsx), in miniatura. */}
        <div className="px-3 pt-3 pb-2.5">
          <div className="flex items-start justify-between gap-2" style={rise()}>
            <h3 className="font-display text-[15px] leading-tight text-navy">{d.name}</h3>
            <span className="mt-[3px] shrink-0 text-[6px] tracking-[0.2em] text-navy/40 uppercase">MIRA Card</span>
          </div>
          <div className="mt-1.5 grid grid-cols-[1fr_92px] gap-x-2.5">
            <div className="min-w-0" style={rise()}>
              <p className="text-[9px] leading-snug text-ink">
                <span className="font-medium">{d.studi.course}</span>
                <span className="text-ink-secondary"> · {d.studi.university}</span>
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[8px] text-ink-secondary">
                <span>{d.studi.level}</span>
                <span>{d.studi.years}</span>
                <span className="font-medium text-ink">{d.average}</span>
              </div>
            </div>
            <div className="min-w-0 border-l border-border pl-2.5" style={rise()}>
              <SectionLabel>Availability</SectionLabel>
              <div className="flex flex-wrap gap-1">
                {d.availabilityPills.slice(0, 3).map((a) => (
                  <Pill key={a}>{a}</Pill>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border" />

        {/* ——— Due colonne tematiche: a sinistra chi è e cosa ha fatto, a destra studi e strumenti ——— */}
        <div className="grid flex-1 grid-cols-[1fr_92px] gap-x-2.5 px-3 py-2.5">
          <div className="min-w-0 space-y-2.5">
            <div style={rise()}>
              <SectionLabel>Personal profile</SectionLabel>
              <p className="font-display text-[9px] italic leading-relaxed text-ink line-clamp-5">{d.personalProfile}</p>
            </div>
            <div style={rise()}>
              <SectionLabel>Experience</SectionLabel>
              {d.experiences.map((exp) => (
                <div key={exp.title} className="mt-1 first:mt-0">
                  <p className="text-[9px] font-medium leading-snug text-ink line-clamp-2">{exp.title}</p>
                  <p className="text-[8px] text-ink-tertiary">{exp.org}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="min-w-0 space-y-2.5 border-l border-border pl-2.5">
            <div style={rise()}>
              <SectionLabel>Exams</SectionLabel>
              <p className="text-[9px] text-petrol">{d.exams.length} exams ▸</p>
            </div>
            <div style={rise()}>
              <SectionLabel>Skills</SectionLabel>
              <p className="text-[9px] text-petrol">{d.hardSkills.length} skills ▸</p>
            </div>
            <div style={rise()}>
              <SectionLabel>Languages</SectionLabel>
              <div className="flex flex-wrap gap-1">
                {d.languages.map((l) => (
                  <Pill key={l}>{l.replace(" · ", " ")}</Pill>
                ))}
              </div>
            </div>
            <div style={rise()}>
              <SectionLabel>Career plan</SectionLabel>
              <p className="text-[8px] leading-relaxed text-ink line-clamp-4">{d.plan}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
