"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  saveCycleBlock,
  reopenCycleBlock,
  closeCycleEditing,
  publishCycleCard,
  discardCycleDraft,
  suggestCycleQuestions,
  loadCycleCard,
} from "@/lib/actions/cycle-card";
import {
  CYCLE_BLOCK_ORDER,
  CYCLE_BLOCK_VISIBILITY,
  cycleProgressPct,
} from "@/lib/cycle-card";
import type { CycleBlock, CycleCardState, CyclePosition } from "@/lib/cycle-card";
import type { CycleBlockPayload } from "@/lib/actions/cycle-card";

/**
 * La card del ciclo: si costruisce come la MIRA Card dello studente (MIRA guida sopra, un
 * blocco alla volta sotto) e, a blocchi completati, resta consultabile tutta in una
 * schermata sola con Modifica per blocco e anteprima di cio' che vede il candidato.
 */
export function CycleCardFlow({ initialState }: { initialState: CycleCardState }) {
  const t = useTranslations("CycleCard");
  const c = useTranslations("Common");
  const router = useRouter();

  const [state, setState] = useState<CycleCardState>(initialState);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidateView, setCandidateView] = useState(false);

  const isBuilding = state.phase !== "done";
  const progressPct = cycleProgressPct(state.approved);
  // Un ciclo chiuso resta consultabile ma non si modifica piu': le candidature ricevute
  // sono state scritte contro quelle domande e quei criteri.
  const readOnly = state.status === "closed" || state.status === "archived";

  async function refresh() {
    const { state: fresh, error: loadError } = await loadCycleCard(state.cycleId);
    if (fresh) setState(fresh);
    else if (loadError) setError(loadError);
  }

  async function handleSave(block: CycleBlock, payload: CycleBlockPayload) {
    setBusy(true);
    setError(null);
    const result = await saveCycleBlock(state.cycleId, block, payload);
    if (result?.error) setError(result.error);
    else await refresh();
    setBusy(false);
  }

  async function handleReopen(block: CycleBlock) {
    setBusy(true);
    await reopenCycleBlock(state.cycleId, block);
    await refresh();
    setBusy(false);
  }

  async function handleCloseEditing() {
    setBusy(true);
    await closeCycleEditing(state.cycleId);
    await refresh();
    setBusy(false);
  }

  async function handlePublish() {
    setBusy(true);
    setError(null);
    const result = await publishCycleCard(state.cycleId);
    if (result?.error) setError(result.error);
    else {
      await refresh();
      router.refresh();
    }
    setBusy(false);
  }

  async function handleDiscard() {
    if (!window.confirm(t("discardConfirm"))) return;
    setBusy(true);
    const result = await discardCycleDraft(state.cycleId);
    if (result?.error) {
      setError(result.error);
      setBusy(false);
      return;
    }
    router.push(`/association/${state.slug}/cycles`);
    router.refresh();
  }

  // -------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      <Header
        state={state}
        isBuilding={isBuilding}
        progressPct={progressPct}
        candidateView={candidateView}
        onToggleView={() => setCandidateView((v) => !v)}
        t={t}
      />

      {error && (
        <div className="rounded-md border border-error/30 bg-error-bg px-4 py-2.5">
          <p className="text-body-sm text-error">{error}</p>
        </div>
      )}

      {CYCLE_BLOCK_ORDER.map((block) => {
        const isActive = block === state.phase;
        const isApproved = state.approved.includes(block);
        const internal = CYCLE_BLOCK_VISIBILITY[block] === "internal";

        // In costruzione si vede solo il blocco attivo piu' quelli gia' confermati: i
        // futuri compaiono quando arriva il loro turno.
        if (isBuilding && !isActive && !isApproved) return null;
        // In anteprima candidato spariscono i blocchi interni.
        if (!isBuilding && candidateView && internal) return null;

        if (isActive) {
          return (
            <div key={block} className="space-y-2.5">
              <MiraGuide text={t(`guide.${block}`, { association: state.associationName })} />
              <BlockEditor
                block={block}
                state={state}
                busy={busy}
                onSave={(payload) => handleSave(block, payload)}
                onCancel={isBuilding ? undefined : handleCloseEditing}
                t={t}
                c={c}
              />
            </div>
          );
        }

        if (isBuilding) {
          return <CollapsedRow key={block} label={t(`blocks.${block}`)} doneLabel={t("done")} />;
        }

        return (
          <CardSection
            key={block}
            block={block}
            state={state}
            canEdit={!candidateView && !readOnly}
            busy={busy}
            onEdit={() => handleReopen(block)}
            t={t}
          />
        );
      })}

      {!isBuilding && (
        <Footer
          state={state}
          busy={busy}
          onPublish={handlePublish}
          onDiscard={handleDiscard}
          t={t}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------- */

function Header({
  state,
  isBuilding,
  progressPct,
  candidateView,
  onToggleView,
  t,
}: {
  state: CycleCardState;
  isBuilding: boolean;
  progressPct: number;
  candidateView: boolean;
  onToggleView: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  if (isBuilding) {
    return (
      <div className="rounded-lg border border-border bg-white px-5 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-eyebrow text-navy/60 uppercase">{t("buildingTitle")}</p>
          <span className="text-xs font-semibold text-ink tabular-nums">{progressPct}%</span>
        </div>
        <div className="mt-2 h-1.5 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-petrol rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    );
  }

  const isOpen = state.status === "open";

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-h2 text-navy truncate">{state.data.nome}</h2>
          <span
            className={`inline-flex shrink-0 items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${
              isOpen ? "bg-success-bg text-success" : "bg-navy-50 text-ink-tertiary"
            }`}
          >
            {t(`status.${state.status}`)}
          </span>
        </div>
        <p className="mt-0.5 text-body-sm text-ink-secondary">
          {candidateView ? t("candidateViewHint") : t("boardViewHint")}
        </p>
      </div>
      <button
        onClick={onToggleView}
        className="shrink-0 text-body-sm text-navy border border-border rounded-md px-3 py-1.5 hover:border-border-strong transition-colors duration-100"
      >
        {candidateView ? t("backToBoardView") : t("previewAsCandidate")}
      </button>
    </div>
  );
}

function MiraGuide({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-petrol/25 bg-petrol-50/60 px-4 py-3">
      <p className="text-eyebrow text-petrol uppercase mb-1.5 flex items-center gap-1.5">
        <span aria-hidden="true">✦</span> MIRA
      </p>
      <p className="text-body text-ink whitespace-pre-wrap">{text}</p>
    </div>
  );
}

function CollapsedRow({ label, doneLabel }: { label: string; doneLabel: string }) {
  return (
    <div className="rounded-lg border border-border bg-white px-5 py-2.5 flex items-center justify-between">
      <p className="text-eyebrow text-navy/60 uppercase">{label}</p>
      <span className="text-xs px-2 py-0.5 rounded bg-success-bg text-success font-medium">{doneLabel}</span>
    </div>
  );
}

/** La riga che dice al board se un blocco lo vedono anche gli studenti. */
function VisibilityNote({ block, t }: { block: CycleBlock; t: ReturnType<typeof useTranslations> }) {
  const internal = CYCLE_BLOCK_VISIBILITY[block] === "internal";
  return (
    <p className={`text-body-sm ${internal ? "text-warning" : "text-ink-tertiary"}`}>
      {internal ? t("visibility.internal") : t("visibility.candidate")}
    </p>
  );
}

/* ------------------------------------------------------------------------- */

function CardSection({
  block,
  state,
  canEdit,
  busy,
  onEdit,
  t,
}: {
  block: CycleBlock;
  state: CycleCardState;
  canEdit: boolean;
  busy: boolean;
  onEdit: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const internal = CYCLE_BLOCK_VISIBILITY[block] === "internal";

  return (
    <div className="rounded-lg border border-border bg-white px-5 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-eyebrow text-navy/60 uppercase flex items-center gap-2">
          {t(`blocks.${block}`)}
          {internal && (
            <span className="text-[10px] normal-case px-1.5 py-0.5 rounded bg-warning-bg text-warning font-medium">
              {t("internalBadge")}
            </span>
          )}
        </p>
        {canEdit && (
          <button
            onClick={onEdit}
            disabled={busy}
            className="text-body-sm text-petrol hover:text-petrol-700 transition-colors duration-100 disabled:opacity-40"
          >
            {t("edit")}
          </button>
        )}
      </div>
      <div className="mt-1.5">
        <BlockSummary block={block} state={state} t={t} />
      </div>
    </div>
  );
}

function BlockSummary({
  block,
  state,
  t,
}: {
  block: CycleBlock;
  state: CycleCardState;
  t: ReturnType<typeof useTranslations>;
}) {
  const d = state.data;
  const empty = <p className="text-body-sm text-ink-tertiary italic">{t("emptyBlock")}</p>;

  switch (block) {
    case "nome":
      return <p className="text-body text-ink">{d.nome || "—"}</p>;
    case "descrizione":
      return d.descrizione ? (
        <p className="text-body text-ink whitespace-pre-wrap">{d.descrizione}</p>
      ) : (
        empty
      );
    case "date":
      return (
        <p className="text-body text-ink tabular-nums">
          {d.opensAt || d.closesAt
            ? t("dateRange", { from: d.opensAt || "—", to: d.closesAt || "—" })
            : t("noDates")}
        </p>
      );
    case "posizioni":
      if (d.candidaturaGenerica) return <p className="text-body text-ink">{t("genericApplication")}</p>;
      if (d.posizioni.length === 0) return empty;
      return (
        <ul className="space-y-1">
          {d.posizioni.map((p, i) => (
            <li key={i} className="text-body text-ink">
              {p.name}
              {p.description && <span className="text-ink-secondary"> — {p.description}</span>}
            </li>
          ))}
        </ul>
      );
    case "profilo":
      return d.profilo ? (
        <p className="text-body text-ink whitespace-pre-wrap">{d.profilo}</p>
      ) : (
        empty
      );
    case "domande":
      if (d.nessunaDomanda || d.domande.length === 0)
        return <p className="text-body text-ink">{t("noQuestions")}</p>;
      return (
        <ol className="space-y-1 list-decimal list-inside">
          {d.domande.map((q) => (
            <li key={q.id} className="text-body text-ink">
              {q.text}
            </li>
          ))}
        </ol>
      );
  }
}

/* ------------------------------------------------------------------------- */

const inputClass =
  "w-full px-3 py-2 rounded-md bg-paper border border-border text-body text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-petrol transition-colors duration-200 disabled:opacity-50";

function BlockEditor({
  block,
  state,
  busy,
  onSave,
  onCancel,
  t,
  c,
}: {
  block: CycleBlock;
  state: CycleCardState;
  busy: boolean;
  onSave: (payload: CycleBlockPayload) => void;
  onCancel?: () => void;
  t: ReturnType<typeof useTranslations>;
  c: ReturnType<typeof useTranslations>;
}) {
  const d = state.data;

  const [nome, setNome] = useState(d.nome);
  const [descrizione, setDescrizione] = useState(d.descrizione);
  const [opensAt, setOpensAt] = useState(d.opensAt);
  const [closesAt, setClosesAt] = useState(d.closesAt);
  const [posizioni, setPosizioni] = useState<CyclePosition[]>(
    d.posizioni.length > 0 ? d.posizioni : [{ name: "", description: "" }]
  );
  const [generica, setGenerica] = useState(d.candidaturaGenerica);
  const [profilo, setProfilo] = useState(d.profilo);
  const [domande, setDomande] = useState<Array<{ text: string; required: boolean }>>(
    d.domande.length > 0 ? d.domande.map((q) => ({ text: q.text, required: q.required })) : [{ text: "", required: true }]
  );
  const [nessunaDomanda, setNessunaDomanda] = useState(d.nessunaDomanda);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  async function handleSuggest() {
    setSuggesting(true);
    setSuggestError(null);
    const result = await suggestCycleQuestions(state.cycleId);
    if (result?.error) setSuggestError(result.error);
    else if (result?.domande) {
      setDomande(result.domande.map((text: string) => ({ text, required: true })));
      setNessunaDomanda(false);
    }
    setSuggesting(false);
  }

  function submit() {
    switch (block) {
      case "nome":
        return onSave({ nome });
      case "descrizione":
        return onSave({ descrizione });
      case "date":
        return onSave({ opensAt, closesAt });
      case "posizioni":
        return onSave({ posizioni, candidaturaGenerica: generica });
      case "profilo":
        return onSave({ profilo });
      case "domande":
        return onSave({ domande, nessunaDomanda });
    }
  }

  return (
    <div className="rounded-lg border border-border bg-white px-5 py-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-eyebrow text-navy/60 uppercase">{t(`blocks.${block}`)}</p>
        <VisibilityNote block={block} t={t} />
      </div>

      {block === "nome" && (
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder={t("placeholders.nome")}
          maxLength={120}
          className={inputClass}
          autoFocus
        />
      )}

      {block === "descrizione" && (
        <textarea
          value={descrizione}
          onChange={(e) => setDescrizione(e.target.value)}
          placeholder={t("placeholders.descrizione")}
          rows={5}
          className={inputClass}
        />
      )}

      {block === "date" && (
        <div className="flex flex-wrap gap-3">
          <label className="flex-1 min-w-[10rem] space-y-1">
            <span className="text-body-sm text-ink-secondary">{t("opensLabel")}</span>
            <input type="date" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} className={inputClass} />
          </label>
          <label className="flex-1 min-w-[10rem] space-y-1">
            <span className="text-body-sm text-ink-secondary">{t("closesLabel")}</span>
            <input type="date" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} className={inputClass} />
          </label>
        </div>
      )}

      {block === "posizioni" && (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-body-sm text-ink">
            <input type="checkbox" checked={generica} onChange={(e) => setGenerica(e.target.checked)} />
            {t("genericLabel")}
          </label>

          {!generica && (
            <div className="space-y-2">
              {posizioni.map((p, i) => (
                <div key={i} className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={p.name}
                    onChange={(e) =>
                      setPosizioni((prev) => prev.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                    }
                    placeholder={t("placeholders.positionName")}
                    className={`${inputClass} flex-1 min-w-[9rem]`}
                  />
                  <input
                    type="text"
                    value={p.description ?? ""}
                    onChange={(e) =>
                      setPosizioni((prev) => prev.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))
                    }
                    placeholder={t("placeholders.positionDescription")}
                    className={`${inputClass} flex-[2] min-w-[11rem]`}
                  />
                  {posizioni.length > 1 && (
                    <button
                      onClick={() => setPosizioni((prev) => prev.filter((_, j) => j !== i))}
                      className="text-body-sm text-ink-tertiary hover:text-error transition-colors px-2"
                      aria-label={t("removePosition")}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setPosizioni((prev) => [...prev, { name: "", description: "" }])}
                className="text-body-sm text-petrol hover:text-petrol-700 transition-colors"
              >
                {t("addPosition")}
              </button>
            </div>
          )}
        </div>
      )}

      {block === "profilo" && (
        <textarea
          value={profilo}
          onChange={(e) => setProfilo(e.target.value)}
          placeholder={t("placeholders.profilo")}
          rows={7}
          className={inputClass}
        />
      )}

      {block === "domande" && (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-body-sm text-ink">
            <input
              type="checkbox"
              checked={nessunaDomanda}
              onChange={(e) => setNessunaDomanda(e.target.checked)}
            />
            {t("noQuestionsLabel")}
          </label>

          {!nessunaDomanda && (
            <div className="space-y-2">
              {domande.map((q, i) => (
                <div key={i} className="flex gap-2">
                  <textarea
                    value={q.text}
                    onChange={(e) =>
                      setDomande((prev) => prev.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))
                    }
                    placeholder={t("placeholders.question")}
                    rows={2}
                    className={`${inputClass} flex-1`}
                  />
                  {domande.length > 1 && (
                    <button
                      onClick={() => setDomande((prev) => prev.filter((_, j) => j !== i))}
                      className="text-body-sm text-ink-tertiary hover:text-error transition-colors px-2"
                      aria-label={t("removeQuestion")}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setDomande((prev) => [...prev, { text: "", required: true }])}
                  className="text-body-sm text-petrol hover:text-petrol-700 transition-colors"
                >
                  {t("addQuestion")}
                </button>
                <button
                  onClick={handleSuggest}
                  disabled={suggesting}
                  className="text-body-sm text-petrol hover:text-petrol-700 transition-colors disabled:opacity-40"
                >
                  {suggesting ? t("suggesting") : t("suggestQuestions")}
                </button>
              </div>
              {suggestError && <p className="text-body-sm text-error">{suggestError}</p>}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          onClick={submit}
          disabled={busy}
          className="bg-navy text-white px-4 py-2 rounded-md text-body-sm hover:bg-navy-700 transition-colors duration-100 disabled:opacity-40"
        >
          {busy ? c("saving") : t("confirmBlock")}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={busy}
            className="text-body-sm text-ink-secondary border border-border rounded-md px-4 py-2 hover:border-border-strong transition-colors duration-100 disabled:opacity-40"
          >
            {c("cancel")}
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------- */

function Footer({
  state,
  busy,
  onPublish,
  onDiscard,
  t,
}: {
  state: CycleCardState;
  busy: boolean;
  onPublish: () => void;
  onDiscard: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  if (state.status !== "draft") return null;

  return (
    <div className="rounded-lg border border-petrol/30 bg-white px-5 py-4">
      <p className="text-body text-ink">{t("readyToPublish")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={onPublish}
          disabled={busy}
          className="bg-navy text-white px-4 py-2 rounded-md text-body-sm hover:bg-navy-700 transition-colors duration-100 disabled:opacity-40"
        >
          {t("publish")}
        </button>
        <button
          onClick={onDiscard}
          disabled={busy}
          className="text-body-sm text-ink-secondary border border-border rounded-md px-4 py-2 hover:border-border-strong transition-colors duration-100 disabled:opacity-40"
        >
          {t("discard")}
        </button>
      </div>
    </div>
  );
}
