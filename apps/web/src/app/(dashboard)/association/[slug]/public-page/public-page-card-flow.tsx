"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ASSOCIATION_CATEGORIES } from "@mira/domain";
import {
  savePageBlock,
  reopenPageBlock,
  closePageEditing,
  publishPublicPageCard,
  uploadPageLogo,
  loadPublicPageCard,
} from "@/lib/actions/public-page-card";
import { PAGE_BLOCK_ORDER, pageProgressPct } from "@/lib/public-page-card";
import type { PageBlock, PageCardState } from "@/lib/public-page-card";
import type { PageBlockPayload } from "@/lib/actions/public-page-card";

/**
 * La pagina pubblica come card: stesso motore del ciclo (MIRA guida sopra, blocchi sotto,
 * Modifica per blocco) piu' un'anteprima fedele di come la vedono gli studenti.
 */
export function PublicPageCardFlow({ initialState }: { initialState: PageCardState }) {
  const t = useTranslations("PageCard");
  const c = useTranslations("Common");
  const router = useRouter();

  const [state, setState] = useState<PageCardState>(initialState);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  const isBuilding = state.phase !== "done";
  const progressPct = pageProgressPct(state.approved);

  async function refresh() {
    const { state: fresh, error: loadError } = await loadPublicPageCard(state.associationId);
    if (fresh) setState(fresh);
    else if (loadError) setError(loadError);
  }

  async function handleSave(block: PageBlock, payload: PageBlockPayload) {
    setBusy(true);
    setError(null);
    const result = await savePageBlock(state.associationId, block, payload);
    if (result?.error) setError(result.error);
    else await refresh();
    setBusy(false);
  }

  async function handleReopen(block: PageBlock) {
    setBusy(true);
    await reopenPageBlock(state.associationId, block);
    await refresh();
    setBusy(false);
  }

  async function handleCloseEditing() {
    setBusy(true);
    await closePageEditing(state.associationId);
    await refresh();
    setBusy(false);
  }

  async function handlePublish() {
    setBusy(true);
    setError(null);
    const result = await publishPublicPageCard(state.associationId);
    if (result?.error) setError(result.error);
    else {
      await refresh();
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <Header
        state={state}
        isBuilding={isBuilding}
        progressPct={progressPct}
        preview={preview}
        onTogglePreview={() => setPreview((v) => !v)}
        t={t}
      />

      {error && (
        <div className="rounded-md border border-error/30 bg-error-bg px-4 py-2.5">
          <p className="text-body-sm text-error">{error}</p>
        </div>
      )}

      {!isBuilding && preview ? (
        <PagePreview state={state} t={t} />
      ) : (
        PAGE_BLOCK_ORDER.map((block) => {
          const isActive = block === state.phase;
          const isApproved = state.approved.includes(block);

          if (isBuilding && !isActive && !isApproved) return null;

          if (isActive) {
            return (
              <div key={block} className="space-y-2.5">
                <MiraGuide text={t(`guide.${block}`, { name: state.data.nome || t("yourAssociation") })} />
                <BlockEditor
                  block={block}
                  state={state}
                  busy={busy}
                  onSave={(payload) => handleSave(block, payload)}
                  onLogoUploaded={refresh}
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
              busy={busy}
              onEdit={() => handleReopen(block)}
              t={t}
            />
          );
        })
      )}

      {!isBuilding && !preview && (
        <Footer state={state} busy={busy} onPublish={handlePublish} t={t} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------- */

function Header({
  state,
  isBuilding,
  progressPct,
  preview,
  onTogglePreview,
  t,
}: {
  state: PageCardState;
  isBuilding: boolean;
  progressPct: number;
  preview: boolean;
  onTogglePreview: () => void;
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

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-h2 text-navy truncate">{t("heading")}</h2>
          <span
            className={`inline-flex shrink-0 items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${
              state.published ? "bg-success-bg text-success" : "bg-warning-bg text-warning"
            }`}
          >
            {state.published ? t("statusPublished") : t("statusDraft")}
          </span>
        </div>
        <p className="mt-0.5 text-body-sm text-ink-secondary">
          {preview ? t("previewHint") : t("boardHint")}
        </p>
      </div>
      <button
        onClick={onTogglePreview}
        className="shrink-0 text-body-sm text-navy border border-border rounded-md px-3 py-1.5 hover:border-border-strong transition-colors duration-100"
      >
        {preview ? t("backToEdit") : t("previewAsStudent")}
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

/* ------------------------------------------------------------------------- */

function CardSection({
  block,
  state,
  busy,
  onEdit,
  t,
}: {
  block: PageBlock;
  state: PageCardState;
  busy: boolean;
  onEdit: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="rounded-lg border border-border bg-white px-5 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-eyebrow text-navy/60 uppercase">{t(`blocks.${block}`)}</p>
        <button
          onClick={onEdit}
          disabled={busy}
          className="text-body-sm text-petrol hover:text-petrol-700 transition-colors duration-100 disabled:opacity-40"
        >
          {t("edit")}
        </button>
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
  block: PageBlock;
  state: PageCardState;
  t: ReturnType<typeof useTranslations>;
}) {
  const d = state.data;
  const empty = <p className="text-body-sm text-ink-tertiary italic">{t("emptyBlock")}</p>;

  switch (block) {
    case "identita":
      return (
        <div className="flex items-center gap-3">
          <Logo url={d.logoUrl} name={d.nome} />
          <div>
            <p className="text-body text-ink">{d.nome || "—"}</p>
            {d.categoria && <p className="text-body-sm text-ink-secondary">{categoryLabel(d.categoria)}</p>}
          </div>
        </div>
      );
    case "descrizione":
      if (!d.descrizioneBreve && !d.descrizioneLunga) return empty;
      return (
        <div className="space-y-1">
          {d.descrizioneBreve && <p className="text-body text-ink">{d.descrizioneBreve}</p>}
          {d.descrizioneLunga && (
            <p className="text-body-sm text-ink-secondary whitespace-pre-wrap line-clamp-3">{d.descrizioneLunga}</p>
          )}
        </div>
      );
    case "settori":
      if (d.settori.length === 0) return empty;
      return (
        <div className="flex flex-wrap gap-1.5">
          {d.settori.map((s) => (
            <span key={s} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-body-sm bg-navy-50 text-navy">
              {s}
            </span>
          ))}
        </div>
      );
    case "contatti":
      if (!d.sitoUrl && !d.email) return empty;
      return (
        <div className="space-y-0.5 text-body text-ink">
          {d.sitoUrl && <p className="truncate">{d.sitoUrl}</p>}
          {d.email && <p className="truncate">{d.email}</p>}
        </div>
      );
  }
}

/* ------------------------------------------------------------------------- */

/** Anteprima fedele della vetrina pubblica (association-public-profile.tsx). */
function PagePreview({ state, t }: { state: PageCardState; t: ReturnType<typeof useTranslations> }) {
  const d = state.data;
  return (
    <div className="rounded-lg border border-border bg-white px-6 py-8">
      <div className="flex items-start gap-4 mb-6">
        <Logo url={d.logoUrl} name={d.nome} size="lg" />
        <div>
          <h3 className="font-display text-display-md text-navy">{d.nome || t("yourAssociation")}</h3>
          {d.categoria && <p className="text-body text-ink-secondary mt-1">{categoryLabel(d.categoria)}</p>}
        </div>
      </div>

      {d.settori.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {d.settori.map((s) => (
            <span key={s} className="inline-flex items-center px-3 py-1 rounded-full text-body-sm font-medium bg-navy-50 text-navy">
              {s}
            </span>
          ))}
        </div>
      )}

      {d.descrizioneBreve && <p className="text-body-lg text-ink-secondary mb-4">{d.descrizioneBreve}</p>}
      {d.descrizioneLunga && (
        <div className="text-body text-ink mb-6 whitespace-pre-wrap">{d.descrizioneLunga}</div>
      )}

      {(d.sitoUrl || d.email) && (
        <div className="flex gap-4">
          {d.sitoUrl && <span className="text-petrol underline underline-offset-2 decoration-1 text-body">{t("preview.website")}</span>}
          {d.email && <span className="text-petrol underline underline-offset-2 decoration-1 text-body">{t("preview.contact")}</span>}
        </div>
      )}
    </div>
  );
}

function Logo({ url, name, size = "md" }: { url: string | null; name: string; size?: "md" | "lg" }) {
  const cls = size === "lg" ? "h-16 w-16 text-h2" : "h-11 w-11 text-body-lg";
  if (url) {
    return <img src={url} alt="" className={`${cls} rounded-lg object-cover shrink-0`} />;
  }
  return (
    <div className={`${cls} rounded-lg bg-navy text-white font-semibold flex items-center justify-center shrink-0`}>
      {(name || "?").charAt(0).toUpperCase()}
    </div>
  );
}

function categoryLabel(cat: string): string {
  return cat.charAt(0).toUpperCase() + cat.slice(1).replace(/_/g, " ");
}

/* ------------------------------------------------------------------------- */

const inputClass =
  "w-full px-3 py-2 rounded-md bg-paper border border-border text-body text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-petrol transition-colors duration-200 disabled:opacity-50";

function BlockEditor({
  block,
  state,
  busy,
  onSave,
  onLogoUploaded,
  onCancel,
  t,
  c,
}: {
  block: PageBlock;
  state: PageCardState;
  busy: boolean;
  onSave: (payload: PageBlockPayload) => void;
  onLogoUploaded: () => void | Promise<void>;
  onCancel?: () => void;
  t: ReturnType<typeof useTranslations>;
  c: ReturnType<typeof useTranslations>;
}) {
  const d = state.data;

  const [nome, setNome] = useState(d.nome);
  const [categoria, setCategoria] = useState(d.categoria);
  const [descrizioneBreve, setDescrizioneBreve] = useState(d.descrizioneBreve);
  const [descrizioneLunga, setDescrizioneLunga] = useState(d.descrizioneLunga);
  const [settori, setSettori] = useState(d.settori.join(", "));
  const [sitoUrl, setSitoUrl] = useState(d.sitoUrl);
  const [email, setEmail] = useState(d.email);
  const [uploading, setUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setLogoError(null);
    const formData = new FormData();
    formData.append("logo", file);
    const result = await uploadPageLogo(state.associationId, formData);
    if (result?.error) setLogoError(result.error);
    else await onLogoUploaded();
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function submit() {
    switch (block) {
      case "identita":
        return onSave({ nome, categoria });
      case "descrizione":
        return onSave({ descrizioneBreve, descrizioneLunga });
      case "settori":
        return onSave({ settori: settori.split(",").map((s) => s.trim()).filter(Boolean) });
      case "contatti":
        return onSave({ sitoUrl, email });
    }
  }

  return (
    <div className="rounded-lg border border-border bg-white px-5 py-4 space-y-3">
      <p className="text-eyebrow text-navy/60 uppercase">{t(`blocks.${block}`)}</p>

      {block === "identita" && (
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <Logo url={d.logoUrl} name={nome} size="lg" />
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleLogo}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="text-body-sm text-petrol hover:text-petrol-700 transition-colors disabled:opacity-40"
              >
                {uploading ? t("uploadingLogo") : d.logoUrl ? t("changeLogo") : t("uploadLogo")}
              </button>
              <p className="text-body-sm text-ink-tertiary mt-0.5">{t("logoHelper")}</p>
              {logoError && <p className="text-body-sm text-error mt-0.5">{logoError}</p>}
            </div>
          </div>

          <label className="block space-y-1">
            <span className="text-body-sm text-ink-secondary">{t("nameLabel")}</span>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder={t("placeholders.nome")}
              maxLength={120}
              className={inputClass}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-body-sm text-ink-secondary">{t("categoryLabel")}</span>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={inputClass}>
              <option value="">{t("categoryPlaceholder")}</option>
              {ASSOCIATION_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {categoryLabel(cat)}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {block === "descrizione" && (
        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-body-sm text-ink-secondary">{t("shortLabel")}</span>
            <textarea
              value={descrizioneBreve}
              onChange={(e) => setDescrizioneBreve(e.target.value)}
              placeholder={t("placeholders.short")}
              rows={2}
              maxLength={300}
              className={inputClass}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-body-sm text-ink-secondary">{t("longLabel")}</span>
            <textarea
              value={descrizioneLunga}
              onChange={(e) => setDescrizioneLunga(e.target.value)}
              placeholder={t("placeholders.long")}
              rows={7}
              className={inputClass}
            />
          </label>
        </div>
      )}

      {block === "settori" && (
        <label className="block space-y-1">
          <span className="text-body-sm text-ink-secondary">{t("sectorsLabel")}</span>
          <input
            type="text"
            value={settori}
            onChange={(e) => setSettori(e.target.value)}
            placeholder={t("placeholders.sectors")}
            className={inputClass}
          />
          <span className="text-body-sm text-ink-tertiary">{t("sectorsHelper")}</span>
        </label>
      )}

      {block === "contatti" && (
        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-body-sm text-ink-secondary">{t("websiteLabel")}</span>
            <input
              type="url"
              value={sitoUrl}
              onChange={(e) => setSitoUrl(e.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-body-sm text-ink-secondary">{t("emailLabel")}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("placeholders.email")}
              className={inputClass}
            />
          </label>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          onClick={submit}
          disabled={busy || uploading}
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
  t,
}: {
  state: PageCardState;
  busy: boolean;
  onPublish: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  if (state.published) {
    return (
      <div className="rounded-lg border border-border bg-white px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-body text-ink">{t("publishedInfo")}</p>
        <a
          href={`/associations/${state.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-body-sm text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700"
        >
          {t("viewPublicPage")}
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-petrol/30 bg-white px-5 py-4">
      <p className="text-body text-ink">{t("readyToPublish")}</p>
      <button
        onClick={onPublish}
        disabled={busy}
        className="mt-3 bg-navy text-white px-4 py-2 rounded-md text-body-sm hover:bg-navy-700 transition-colors duration-100 disabled:opacity-40"
      >
        {t("publish")}
      </button>
    </div>
  );
}
