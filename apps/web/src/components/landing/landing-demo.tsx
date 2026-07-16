"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  studentData,
  studentFrames,
  TOTAL_BLOCKS,
  type Frame,
  type StudentBlock,
  type CursorTarget,
} from "./demo-scenario";

/**
 * Reel dimostrativo della landing: un finto telefono in cui gira la meccanica reale
 * di MIRA lato studente — la guida di MIRA, i campi che si compilano da soli, il
 * cursore finto che tocca i bottoni — fino al reveal della MIRA Card completa. Poi
 * riparte in loop.
 *
 * Principi:
 * - Static-first: senza JS o con prefers-reduced-motion si vede la card completa,
 *   ferma. L'animazione è un enhancement che parte solo dopo il mount e in vista.
 * - Nessun autoplay non fermabile: c'è un controllo pausa (WCAG 2.2.2) e il reel si
 *   ferma quando esce dallo schermo.
 * - Leggero: solo CSS + un piccolo motore a frame, nessuna libreria d'animazione.
 *
 * Il contenuto della card è sempre in inglese; la "cornice" (guida, bottoni) segue
 * la lingua dell'interfaccia via next-intl.
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

// ---------------------------------------------------------------------------
// Piccoli helper visivi
// ---------------------------------------------------------------------------

function Caret() {
  return (
    <span
      className="inline-block w-[2px] h-[1em] -mb-[2px] bg-petrol ml-[1px] align-middle"
      style={{ animation: "mira-blink 1s step-end infinite" }}
    />
  );
}

/** Testo che si scrive da solo, lettera per lettera, entro una durata. */
function Typewriter({ text, duration, caret = true, className }: { text: string; duration: number; caret?: boolean; className?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    if (!text) return;
    const per = Math.max(16, duration / text.length);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setN(i);
      if (i >= text.length) clearInterval(id);
    }, per);
    return () => clearInterval(id);
  }, [text, duration]);
  return (
    <span className={className}>
      {text.slice(0, n)}
      {caret && n < text.length && <Caret />}
    </span>
  );
}

function Chip({ children, i = 0, tone = "petrol" }: { children: React.ReactNode; i?: number; tone?: "petrol" | "muted" }) {
  const cls = tone === "petrol" ? "bg-petrol-50 text-petrol-700" : "bg-border/40 text-ink-secondary";
  return (
    <span
      className={`text-[11px] px-2 py-0.5 rounded-full ${cls}`}
      style={{ animation: "mira-pop .4s var(--ease-out) both", animationDelay: `${i * 70}ms` }}
    >
      {children}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[9px] tracking-[0.14em] text-navy/50 uppercase mb-1">{children}</p>;
}

/** Il pannello bianco che ospita i campi di un blocco. */
function Panel({ children, i = 0 }: { children: React.ReactNode; i?: number }) {
  return (
    <div
      className="rounded-lg border border-border bg-white px-3.5 py-3 shadow-sm"
      style={{ animation: "mira-pop .45s var(--ease-out) both", animationDelay: `${i * 60}ms` }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principale
// ---------------------------------------------------------------------------

export function LandingDemo() {
  const t = useTranslations("LandingDemo");

  const rootRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const targetsRef = useRef<Record<string, HTMLElement | null>>({});

  const [mounted, setMounted] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [index, setIndex] = useState(0);
  const [cursor, setCursor] = useState<{ x: number; y: number; visible: boolean; tapping: boolean }>({
    x: 0,
    y: 0,
    visible: false,
    tapping: false,
  });

  // Enhancement solo dopo il mount (static-first).
  useEffect(() => setMounted(true), []);

  // prefers-reduced-motion → card statica.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  // Gira solo quando è in vista (performance).
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      const e = entries[0];
      if (e) setInView(e.isIntersecting);
    }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const animating = mounted && !reduced;
  const playing = animating && inView && !userPaused;
  const REVEAL: Frame = { block: "reveal", phase: "card", approved: TOTAL_BLOCKS, cursor: null, duration: 0 };
  const frame: Frame = (animating ? studentFrames[index] : undefined) ?? REVEAL;

  // Motore: avanza al frame successivo dopo la sua durata, poi ricomincia.
  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(() => setIndex((i) => (i + 1) % studentFrames.length), frame.duration);
    return () => clearTimeout(id);
  }, [index, playing, frame.duration]);

  const setTarget = (name: CursorTarget) => (el: HTMLElement | null) => {
    if (name) targetsRef.current[name] = el;
  };

  // Posiziona il cursore finto sul bersaglio del frame e programma il "tap".
  const measureCursor = useCallback(() => {
    const container = bodyRef.current;
    const name = frame.cursor;
    if (!container || !name) {
      setCursor((c) => ({ ...c, visible: false, tapping: false }));
      return;
    }
    const el = targetsRef.current[name];
    if (!el) return;
    const cr = container.getBoundingClientRect();
    const tr = el.getBoundingClientRect();
    setCursor({
      x: tr.left - cr.left + tr.width / 2,
      y: tr.top - cr.top + tr.height / 2,
      visible: true,
      tapping: false,
    });
  }, [frame.cursor]);

  useEffect(() => {
    if (!animating) return;
    // doppio rAF: aspetta che l'editor del frame sia dipinto prima di misurare.
    const raf = requestAnimationFrame(() => requestAnimationFrame(measureCursor));
    let tapId: ReturnType<typeof setTimeout> | undefined;
    if (frame.tap && playing) {
      tapId = setTimeout(() => setCursor((c) => (c.visible ? { ...c, tapping: true } : c)), Math.max(0, frame.duration - 650));
    }
    return () => {
      cancelAnimationFrame(raf);
      if (tapId) clearTimeout(tapId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, animating, playing]);

  useEffect(() => {
    if (!animating) return;
    const on = () => measureCursor();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, [animating, measureCursor]);

  const approved = frame.approved;
  const pct = Math.round((approved / TOTAL_BLOCKS) * 100);
  const isReveal = frame.block === "reveal";

  return (
    <div ref={rootRef} className="relative mx-auto w-full max-w-[300px]">
      {/* keyframes locali, così il reel è autosufficiente */}
      <style>{KEYFRAMES}</style>

      {/* Cornice telefono */}
      <div className="relative rounded-[2.6rem] bg-navy p-[10px] shadow-2xl ring-1 ring-black/10">
        {/* notch */}
        <div className="absolute left-1/2 top-[10px] z-20 h-[22px] w-[110px] -translate-x-1/2 rounded-b-2xl bg-navy" />

        <div className="relative overflow-hidden rounded-[2.05rem] bg-cream" style={{ aspectRatio: "300 / 600" }}>
          <div className="flex h-full flex-col">
            {/* Barra di stato / brand */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <span className="font-display text-[15px] tracking-tight text-navy">MIRA</span>
              {animating && (
                <button
                  type="button"
                  onClick={() => setUserPaused((p) => !p)}
                  aria-label={userPaused ? t("play") : t("pause")}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-white/70 text-navy shadow-sm backdrop-blur transition-colors hover:bg-white"
                >
                  {userPaused ? (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                  ) : (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
                  )}
                </button>
              )}
            </div>

            {/* Avanzamento */}
            <div className="px-4 pb-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[9px] tracking-[0.14em] text-navy/50 uppercase">{t("progressTitle")}</span>
                <span className="text-[10px] font-semibold text-ink tabular-nums">{pct}%</span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-border">
                <div className="h-full rounded-full bg-petrol transition-all duration-700 ease-out" style={{ width: `${pct}%` }} />
              </div>
            </div>

            {/* Corpo */}
            <div ref={bodyRef} className="relative flex-1 overflow-hidden">
              {isReveal ? (
                <DemoCard t={t} />
              ) : (
                <>
                  {/* stack ancorato in basso: il blocco attivo resta sempre visibile,
                      i confermati si accumulano sopra e sfumano in alto */}
                  <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-3.5">
                    {ORDER.slice(0, approved).map((b) => (
                      <ApprovedRow key={b} title={t(`titles.${TITLE_KEY[b]}`)} label={t("confirmed")} />
                    ))}
                    <ActiveScene frame={frame} t={t} setTarget={setTarget} />
                  </div>
                  {/* sfumatura in alto */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-cream to-transparent" />
                </>
              )}

              {/* Cursore finto */}
              {cursor.visible && (
                <div
                  className="pointer-events-none absolute z-30"
                  style={{
                    left: cursor.x,
                    top: cursor.y,
                    transform: "translate(-3px, -2px)",
                    transition: "left .55s var(--ease-out), top .55s var(--ease-out)",
                  }}
                >
                  {cursor.tapping && (
                    <span
                      className="absolute -left-2 -top-2 h-8 w-8 rounded-full bg-petrol/30"
                      style={{ animation: "mira-ripple .6s var(--ease-out) both" }}
                    />
                  )}
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    className="drop-shadow-md"
                    style={{ transform: cursor.tapping ? "scale(.82)" : "scale(1)", transition: "transform .18s var(--ease-out)" }}
                  >
                    <path d="M5 3l14 8-6 1.5L10 19z" fill="#0A1F33" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Righe confermate
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

// ---------------------------------------------------------------------------
// Scena del blocco attivo
// ---------------------------------------------------------------------------

type SetTarget = (name: CursorTarget) => (el: HTMLElement | null) => void;
type T = ReturnType<typeof useTranslations>;

function Guide({ text, typing, duration }: { text: string; typing?: boolean; duration?: number }) {
  return (
    <div className="rounded-lg border border-petrol/25 bg-petrol-50/70 px-3.5 py-2.5" style={{ animation: "mira-pop .4s var(--ease-out) both" }}>
      <p className="mb-1 flex items-center gap-1 text-[9px] tracking-[0.14em] text-petrol uppercase">
        <span aria-hidden="true">✦</span> MIRA
      </p>
      <p className="text-[12px] leading-snug text-ink">
        {typing ? <Typewriter text={text} duration={duration ?? 900} caret={false} /> : text}
      </p>
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
    // filled
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
    // improved
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

function DemoCard({ t }: { t: T }) {
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

const KEYFRAMES = `
@keyframes mira-blink { 0%,100%{opacity:1} 50%{opacity:0} }
@keyframes mira-pop { from{opacity:0;transform:translateY(6px) scale(.97)} to{opacity:1;transform:none} }
@keyframes mira-scan { from{transform:translateY(-120%)} to{transform:translateY(360%)} }
@keyframes mira-ripple { from{opacity:.5;transform:scale(.3)} to{opacity:0;transform:scale(1.7)} }
@keyframes mira-cardin { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
`;
