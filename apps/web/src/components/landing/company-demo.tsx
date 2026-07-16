"use client";

import { useTranslations } from "next-intl";
import { DemoReel, Typewriter, SectionLabel, type SetTarget } from "./demo-reel";
import { companyData, companyFrames, type CompanyFrame, type MatchDimension } from "./company-scenario";
import { studentData } from "./demo-scenario";

/**
 * Scenario AZIENDA (cornice browser/laptop). Le scene vivono qui; il motore sta in
 * `demo-reel.tsx`. Niente punteggi numerici: si mostra il motivo del match. I
 * candidati sono anonimi per codice finché non accettano il contatto.
 */

type T = ReturnType<typeof useTranslations>;

const DIM_CLASS: Record<MatchDimension, string> = {
  both: "bg-success-bg text-success",
  skills: "bg-petrol-50 text-petrol-700",
  availability: "bg-warning-bg text-warning",
};

export function CompanyDemo() {
  const t = useTranslations("CompanyDemo");
  const co = companyData;

  const renderMeter = () => (
    <div className="flex items-center gap-2 border-b border-border bg-white px-3.5 py-2">
      <span className="flex h-5 w-5 items-center justify-center rounded bg-navy text-[10px] font-semibold text-white">{co.monogram}</span>
      <span className="text-[11px] font-medium text-navy">{co.name}</span>
      <span className="ml-auto text-[9px] tracking-[0.14em] text-navy/40 uppercase">{t("talentSearch")}</span>
    </div>
  );

  const renderFrame = (frame: CompanyFrame, { setTarget }: { setTarget: SetTarget }) => (
    <div className="absolute inset-0 overflow-hidden p-3.5">
      <CompanyScene frame={frame} t={t} setTarget={setTarget} />
    </div>
  );

  return (
    <DemoReel
      frames={companyFrames}
      device="laptop"
      renderMeter={renderMeter}
      renderFrame={renderFrame}
      renderStatic={() => (
        <div className="absolute inset-0 overflow-hidden p-3.5">
          <Conversations t={t} />
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

function DimChip({ dim, t }: { dim: MatchDimension; t: T }) {
  const label = dim === "both" ? t("dimBoth") : dim === "skills" ? t("dimSkills") : t("dimAvailability");
  return <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${DIM_CLASS[dim]}`}>{label}</span>;
}

function CompanyScene({ frame, t, setTarget }: { frame: CompanyFrame; t: T; setTarget: SetTarget }) {
  const co = companyData;
  const { block, phase } = frame;

  // ——— RICERCA ———
  if (block === "search") {
    if (phase === "compose") {
      return (
        <div className="mx-auto max-w-[400px]">
          <GuideBar text={t("guide.compose")} />
          <div className="rounded-lg border border-petrol/40 bg-white px-3 py-2.5 shadow-sm">
            <SectionLabel>{t("newSearch")}</SectionLabel>
            <p className="text-[12px] leading-snug text-ink">
              <Typewriter text={co.brief} duration={2600} />
            </p>
          </div>
        </div>
      );
    }
    // results
    return (
      <div className="mx-auto max-w-[440px]">
        <GuideBar text={t("guide.results")} />
        <div className="space-y-1.5">
          {co.candidates.map((cnd, i) => {
            const isFirst = i === 0;
            return (
              <div
                key={cnd.code}
                ref={isFirst ? setTarget("candidate") : undefined}
                className={`rounded-lg border bg-white px-3 py-2 shadow-sm ${isFirst ? "border-petrol/40" : "border-border"}`}
                style={pop(i)}
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-50 text-[8px] font-semibold text-navy">{cnd.code}</span>
                  <span className="text-[10px] text-ink-secondary">{cnd.degree}</span>
                  <span className="ml-auto"><DimChip dim={cnd.dimension} t={t} /></span>
                </div>
                <p className="mt-1 text-[10px] leading-snug text-ink">
                  <span className="text-ink-tertiary">{t("whyMatch")}: </span>
                  {cnd.reason}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ——— DETTAGLIO (anonimo) ———
  if (block === "detail") {
    const d = co.detail;
    const chips = [...studentData.availability.slice(0, 2), ...studentData.academicSkills.slice(0, 2)];
    return (
      <div className="grid h-full grid-cols-[1fr_1.1fr] gap-3">
        {/* Card anonima */}
        <div className="flex flex-col rounded-lg border border-border bg-white px-3 py-2.5 shadow-sm" style={{ animation: "mira-slidein .4s var(--ease-out) both" }}>
          <div className="flex items-baseline justify-between">
            <p className="font-display text-[13px] text-navy">{d.code}</p>
            <span className="text-[7px] tracking-[0.16em] text-navy/40 uppercase">MIRA Card</span>
          </div>
          <p className="mt-0.5 text-[9px] text-ink-secondary">{d.degree}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {chips.map((s) => (
              <span key={s} className="rounded-full bg-petrol-50 px-1.5 py-0.5 text-[8px] text-petrol-700">{s}</span>
            ))}
          </div>
          <div className="mt-2 border-t border-border pt-2">
            <SectionLabel>{t("interests")}</SectionLabel>
            <p className="text-[9px] leading-snug text-ink">{d.interests}</p>
          </div>
        </div>

        {/* Motivo del match + contatto */}
        <div className="flex flex-col gap-2">
          <GuideBar text={t("guide.detail")} />
          <div className="flex-1 rounded-lg border border-border bg-white px-3 py-2.5 shadow-sm" style={{ animation: "mira-slidein .4s var(--ease-out) both", animationDelay: "80ms" }}>
            <SectionLabel>{t("whyMatch")}</SectionLabel>
            <p className="text-[10px] leading-snug text-ink-secondary">{d.reason}</p>
          </div>
          <button ref={setTarget("contact")} type="button" className="rounded-md bg-navy py-2 text-[11px] font-medium text-white">
            {t("requestContact")}
          </button>
        </div>
      </div>
    );
  }

  // ——— CHAT (contatto accettato → nome svelato) ———
  if (block === "chat") {
    const d = co.detail;
    const showCase = phase === "case";
    return (
      <div className="mx-auto flex h-full max-w-[400px] flex-col">
        {/* header con nome svelato */}
        <div className="mb-2 flex items-center gap-2" style={{ animation: "mira-pop .4s var(--ease-out) both" }}>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-50 text-[9px] font-semibold text-navy">
            {d.revealedName.split(" ").map((w) => w[0]).join("")}
          </span>
          <div>
            <p className="text-[11px] font-medium text-ink">{d.revealedName}</p>
            <span className="text-[8px] text-success">{t("contactAccepted")}</span>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <div className="ml-auto max-w-[80%] rounded-lg rounded-br-sm bg-navy px-2.5 py-1.5 text-[10px] leading-snug text-white" style={pop(0)}>
            {co.chat.companyMsg}
          </div>
          <div className="mr-auto max-w-[80%] rounded-lg rounded-bl-sm border border-border bg-white px-2.5 py-1.5 text-[10px] leading-snug text-ink" style={pop(1)}>
            {phase === "reply" ? <Typewriter text={co.chat.candidateMsg} duration={1600} /> : co.chat.candidateMsg}
          </div>
          {showCase && (
            <div className="ml-auto flex max-w-[80%] items-center gap-1.5 rounded-lg rounded-br-sm border border-petrol/40 bg-petrol-50 px-2.5 py-1.5 text-[10px] font-medium text-petrol-700" style={{ animation: "mira-pop .35s var(--ease-out) both" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
              {co.chat.businessCase}
            </div>
          )}
        </div>

        <button ref={setTarget("send")} type="button" className="mt-2 rounded-md bg-navy py-1.5 text-[11px] font-medium text-white">
          {t("sendCase")}
        </button>
      </div>
    );
  }

  // ——— REVEAL: conversazioni ———
  return <Conversations t={t} />;
}

function Conversations({ t }: { t: T }) {
  const statusLabel: Record<string, string> = {
    interviewProposed: t("interviewProposed"),
    contacted: t("contacted"),
    awaitingReply: t("awaitingReply"),
  };
  const statusTone: Record<string, string> = {
    interviewProposed: "text-success",
    contacted: "text-petrol-700",
    awaitingReply: "text-ink-tertiary",
  };
  return (
    <div className="mx-auto flex h-full max-w-[400px] flex-col">
      <p className="mb-2 text-[11px] font-medium text-navy">{t("conversationsTitle")}</p>
      <div className="space-y-1.5">
        {companyData.conversations.map((cv, i) => (
          <div key={cv.name} className="flex items-center gap-2.5 rounded-lg border border-border bg-white px-3 py-2 shadow-sm" style={pop(i)}>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-50 text-[9px] font-semibold text-navy">
              {cv.revealed ? cv.name.split(" ").map((w) => w[0]).join("") : cv.name}
            </span>
            <span className="text-[11px] font-medium text-ink">{cv.name}</span>
            <span className={`ml-auto text-[9px] font-medium ${statusTone[cv.status]}`}>{statusLabel[cv.status]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function pop(i: number): React.CSSProperties {
  return { animation: "mira-pop .4s var(--ease-out) both", animationDelay: `${i * 70}ms` };
}
