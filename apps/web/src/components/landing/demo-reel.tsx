"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Motore generico dei reel dimostrativi della landing.
 *
 * È agnostico rispetto allo scenario: gestisce timing dei frame, loop, cursore
 * finto, cornice del dispositivo (telefono o browser), controllo pausa,
 * prefers-reduced-motion, in-view e il fallback statico. Le SCENE (cosa mostra
 * ogni frame) le fornisce lo scenario via `renderFrame` / `renderStatic`.
 *
 * Uno stesso motore, N scenari: studente (telefono), associazione e azienda
 * (browser). Vedi `landing-demo.tsx` e `association-demo.tsx`.
 *
 * Principi condivisi:
 * - Static-first: senza JS o con reduced-motion si vede `renderStatic()` (lo stato
 *   finale), fermo. L'animazione è un enhancement post-mount e solo in vista.
 * - Nessun autoplay non fermabile: controllo pausa (WCAG 2.2.2) + stop fuori vista.
 * - Leggero: solo CSS + un piccolo motore a frame, nessuna libreria d'animazione.
 */

export type CursorTarget =
  | "upload"
  | "confirm"
  | "improve"
  | "publish"
  | "candidate"
  | "invite"
  | "contact"
  | "send"
  | null;

export interface BaseFrame {
  cursor?: CursorTarget;
  /** Se true, il cursore fa un "tap" verso la fine del frame. */
  tap?: boolean;
  duration: number;
}

export type SetTarget = (name: CursorTarget) => (el: HTMLElement | null) => void;

export type Device = "phone" | "laptop";

interface DemoReelProps<F extends BaseFrame> {
  frames: F[];
  device: Device;
  /** URL fittizia mostrata nella barra del browser (device === "laptop"). */
  url?: string;
  /** Riga meter/breadcrumb opzionale in cima allo schermo. */
  renderMeter?: (frame: F) => React.ReactNode;
  /** La scena animata del frame corrente. */
  renderFrame: (frame: F, ctx: { setTarget: SetTarget }) => React.ReactNode;
  /** Stato finale statico: fallback no-JS / reduced-motion. */
  renderStatic: () => React.ReactNode;
  pauseLabel: string;
  playLabel: string;
}

export function DemoReel<F extends BaseFrame>({
  frames,
  device,
  url,
  renderMeter,
  renderFrame,
  renderStatic,
  pauseLabel,
  playLabel,
}: DemoReelProps<F>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const targetsRef = useRef<Record<string, HTMLElement | null>>({});

  const [mounted, setMounted] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [index, setIndex] = useState(0);
  const [cursor, setCursor] = useState({ x: 0, y: 0, visible: false, tapping: false });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e) setInView(e.isIntersecting);
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const animating = mounted && !reduced;
  const playing = animating && inView && !userPaused;
  const lastFrame = frames[frames.length - 1]!;
  const frame: F = (animating ? frames[index] : undefined) ?? lastFrame;

  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(() => setIndex((i) => (i + 1) % frames.length), frame.duration);
    return () => clearTimeout(id);
  }, [index, playing, frame.duration, frames.length]);

  const setTarget: SetTarget = (name) => (el) => {
    if (name) targetsRef.current[name] = el;
  };

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
    const raf = requestAnimationFrame(() => requestAnimationFrame(measureCursor));
    let tapId: ReturnType<typeof setTimeout> | undefined;
    if (frame.tap && playing) {
      tapId = setTimeout(
        () => setCursor((c) => (c.visible ? { ...c, tapping: true } : c)),
        Math.max(0, frame.duration - 650),
      );
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

  const pauseButton = animating ? (
    <button
      type="button"
      onClick={() => setUserPaused((p) => !p)}
      aria-label={userPaused ? playLabel : pauseLabel}
      className="flex h-6 w-6 items-center justify-center rounded-full bg-white/70 text-navy shadow-sm backdrop-blur transition-colors hover:bg-white"
    >
      {userPaused ? (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
      ) : (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
      )}
    </button>
  ) : null;

  const screen = (
    <div className="flex h-full flex-col">
      {renderMeter && <div className="shrink-0">{renderMeter(frame)}</div>}
      <div ref={bodyRef} className="relative flex-1 overflow-hidden">
        {animating ? renderFrame(frame, { setTarget }) : renderStatic()}
        {cursor.visible && <FakeCursor x={cursor.x} y={cursor.y} tapping={cursor.tapping} />}
      </div>
    </div>
  );

  return (
    <div ref={rootRef} className={device === "phone" ? "relative mx-auto w-full max-w-[300px]" : "relative mx-auto w-full max-w-[500px]"}>
      <style>{KEYFRAMES}</style>
      {device === "phone" ? (
        <div className="relative rounded-[2.6rem] bg-navy p-[10px] shadow-2xl ring-1 ring-black/10">
          <div className="absolute left-1/2 top-[10px] z-20 h-[22px] w-[110px] -translate-x-1/2 rounded-b-2xl bg-navy" />
          <div className="relative overflow-hidden rounded-[2.05rem] bg-cream" style={{ aspectRatio: "300 / 600" }}>
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between px-4 pt-4 pb-1">
                <span className="font-display text-[15px] tracking-tight text-navy">MIRA</span>
                {pauseButton}
              </div>
              <div className="min-h-0 flex-1">{screen}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-2xl ring-1 ring-black/5">
          {/* barra browser */}
          <div className="flex items-center gap-2 border-b border-border bg-navy-50 px-3 py-2">
            <span className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
              <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
              <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
            </span>
            <span className="mx-auto max-w-[60%] truncate rounded-md bg-white px-3 py-0.5 text-[10px] text-ink-tertiary">
              {url ?? "app.mirajob.cloud"}
            </span>
            {pauseButton}
          </div>
          <div className="relative bg-cream" style={{ aspectRatio: "16 / 10" }}>
            {screen}
          </div>
        </div>
      )}
    </div>
  );
}

function FakeCursor({ x, y, tapping }: { x: number; y: number; tapping: boolean }) {
  return (
    <div
      className="pointer-events-none absolute z-30"
      style={{
        left: x,
        top: y,
        transform: "translate(-3px, -2px)",
        transition: "left .55s var(--ease-out), top .55s var(--ease-out)",
      }}
    >
      {tapping && (
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
        style={{ transform: tapping ? "scale(.82)" : "scale(1)", transition: "transform .18s var(--ease-out)" }}
      >
        <path d="M5 3l14 8-6 1.5L10 19z" fill="#0A1F33" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper visivi condivisi tra gli scenari
// ---------------------------------------------------------------------------

export function Caret() {
  return (
    <span
      className="inline-block w-[2px] h-[1em] -mb-[2px] bg-petrol ml-[1px] align-middle"
      style={{ animation: "mira-blink 1s step-end infinite" }}
    />
  );
}

/** Testo che si scrive da solo, lettera per lettera, entro una durata. */
export function Typewriter({ text, duration, caret = true, className }: { text: string; duration: number; caret?: boolean; className?: string }) {
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

export function Chip({ children, i = 0, tone = "petrol" }: { children: React.ReactNode; i?: number; tone?: "petrol" | "muted" }) {
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

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[9px] tracking-[0.14em] text-navy/50 uppercase mb-1">{children}</p>;
}

export function Panel({ children, i = 0, className = "" }: { children: React.ReactNode; i?: number; className?: string }) {
  return (
    <div
      className={`rounded-lg border border-border bg-white px-3.5 py-3 shadow-sm ${className}`}
      style={{ animation: "mira-pop .45s var(--ease-out) both", animationDelay: `${i * 60}ms` }}
    >
      {children}
    </div>
  );
}

export function Guide({ text, typing, duration }: { text: string; typing?: boolean; duration?: number }) {
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

const KEYFRAMES = `
@keyframes mira-blink { 0%,100%{opacity:1} 50%{opacity:0} }
@keyframes mira-pop { from{opacity:0;transform:translateY(6px) scale(.97)} to{opacity:1;transform:none} }
@keyframes mira-scan { from{transform:translateY(-120%)} to{transform:translateY(360%)} }
@keyframes mira-ripple { from{opacity:.5;transform:scale(.3)} to{opacity:0;transform:scale(1.7)} }
@keyframes mira-cardin { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
@keyframes mira-slidein { from{opacity:0;transform:translateX(10px)} to{opacity:1;transform:none} }
`;
