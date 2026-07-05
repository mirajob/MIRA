"use client";

import { ListBlock, ListView, type ListFieldConfig } from "./list-block";
import { originLabel } from "@/lib/origin-label";
import type { CardBlockStatus, CompetenzaItem } from "@mira/types";

const fields: ListFieldConfig<CompetenzaItem>[] = [
  { key: "testo", label: "Competenza (una riga)", type: "textarea", placeholder: "es. Sa leggere e interpretare un bilancio" },
  {
    key: "tipo",
    label: "Tipo",
    type: "select",
    options: [
      { value: "teorica", label: "Teorica" },
      { value: "applicata", label: "Applicata" },
    ],
  },
  { key: "evidenza_ref", label: "Evidenza (esame o esperienza collegata)", placeholder: "es. Financial Accounting" },
];

export function CompetenzeBlock({
  items,
  status,
  onApproved,
}: {
  items: CompetenzaItem[];
  status: CardBlockStatus;
  onApproved?: () => void;
}) {
  return (
    <ListBlock
      blockType="competenze"
      title="Competenze"
      items={items}
      status={status}
      onApproved={onApproved}
      fields={fields}
      emptyLabel="Nessuna competenza ancora. Ogni competenza deve avere un'evidenza collegata."
      emptyItem={(): CompetenzaItem => ({
        id: crypto.randomUUID(),
        testo: "",
        tipo: null,
        evidenza_ref: null,
        verified: false,
        origin: "manual",
      })}
    />
  );
}

/**
 * Resa di sola lettura, riusata dal Profilo (default) e dalla vista associazione/azienda.
 * Il renderItem resta interno a questo componente client (vedi nota in EsperienzeView).
 */
export function CompetenzeView({ items }: { items: CompetenzaItem[] }) {
  return (
    <ListView
      title="Competenze · ognuna con la sua evidenza"
      items={items}
      emptyLabel="Nessuna competenza ancora."
      renderItem={(it) => (
        <div className="flex items-start justify-between gap-2 text-body-sm">
          <span className="text-ink">
            {it.testo}
            {it.evidenza_ref && <span className="text-ink-tertiary"> → {it.evidenza_ref}</span>}
          </span>
          <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-navy-50 text-navy-700">
            {originLabel(it.origin)}
          </span>
        </div>
      )}
    />
  );
}
