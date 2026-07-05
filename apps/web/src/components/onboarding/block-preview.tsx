"use client";

import type {
  CardBlockStatus,
  HeaderProseContent,
  FormazioneItem,
  EsperienzaItem,
  DisponibilitaProseContent,
} from "@mira/types";

export function BlockPreviewShell({
  title,
  status,
  children,
  onConfirm,
  onCorrect,
  confirming,
}: {
  title: string;
  status: CardBlockStatus;
  children: React.ReactNode;
  onConfirm?: () => void;
  onCorrect?: () => void;
  confirming?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 transition-colors ${
        status === "approved"
          ? "border-border bg-white"
          : status === "draft"
            ? "border-warning/40 bg-warning-bg/30"
            : "border-dashed border-border-strong bg-transparent"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-eyebrow text-ink-tertiary uppercase">{title}</p>
        {status === "approved" && (
          <span className="text-xs px-2 py-0.5 rounded bg-success-bg text-success font-medium">Approvato</span>
        )}
        {status === "draft" && (
          <span className="text-xs px-2 py-0.5 rounded bg-warning-bg text-warning font-medium">Bozza</span>
        )}
      </div>

      {status !== "empty" ? (
        children
      ) : (
        <p className="text-body-sm text-ink-tertiary italic">In attesa...</p>
      )}

      {status === "draft" && onConfirm && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={onConfirm}
            disabled={confirming}
            className="text-xs font-medium text-white bg-petrol rounded-md px-3 py-1.5 hover:bg-petrol-700 transition-colors disabled:opacity-50"
          >
            Conferma
          </button>
          {onCorrect && (
            <button
              onClick={onCorrect}
              className="text-xs text-ink-secondary border border-border rounded-md px-3 py-1.5 hover:border-border-strong transition-colors"
            >
              Correggi
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function HeaderPreview({ data }: { data: HeaderProseContent }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-body-sm">
      <dt className="text-ink-tertiary">Corso</dt>
      <dd className="text-ink">{data.corso ?? "—"}</dd>
      <dt className="text-ink-tertiary">Anno</dt>
      <dd className="text-ink">{data.anno ? `${data.anno}°` : "—"}</dd>
      {data.media_voti != null && (
        <>
          <dt className="text-ink-tertiary">Media</dt>
          <dd className="text-ink">
            {Number(data.media_voti).toFixed(1)}/30{" "}
            <span className="text-xs text-success font-medium">verificata</span>
          </dd>
        </>
      )}
    </dl>
  );
}

export function FormazionePreview({ items }: { items: FormazioneItem[] }) {
  return (
    <div className="space-y-1">
      {items.slice(0, 5).map((it) => (
        <div key={it.id} className="flex items-center justify-between gap-2 text-body-sm">
          <span className="text-ink truncate">{it.esame}</span>
          <span className="text-ink-secondary whitespace-nowrap">
            {it.voto} <span className="text-xs text-success font-medium">verificata</span>
          </span>
        </div>
      ))}
      {items.length > 5 && <p className="text-xs text-ink-tertiary">+{items.length - 5} altri esami</p>}
    </div>
  );
}

export function EsperienzePreview({ items }: { items: EsperienzaItem[] }) {
  return (
    <div className="space-y-2">
      {items.map((it) => (
        <div key={it.id}>
          <p className="text-body-sm font-medium text-ink">{it.titolo || it.organizzazione || "Esperienza"}</p>
          <p className="text-xs text-ink-secondary">{it.descrizione}</p>
        </div>
      ))}
    </div>
  );
}

export function DisponibilitaPreview({ data }: { data: DisponibilitaProseContent }) {
  const pills = [data.cosa_cerca, data.da_quando, data.dove, data.vincoli].filter(Boolean) as string[];
  return (
    <div className="flex flex-wrap gap-2">
      {pills.map((p, i) => (
        <span key={i} className="text-xs px-2 py-1 rounded bg-petrol-50 text-petrol font-medium">
          {p}
        </span>
      ))}
    </div>
  );
}
