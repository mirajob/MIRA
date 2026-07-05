"use client";

import { ListBlock, type ListFieldConfig } from "./list-block";
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

export function CompetenzeBlock({ items, status }: { items: CompetenzaItem[]; status: CardBlockStatus }) {
  return (
    <ListBlock
      blockType="competenze"
      title="Competenze"
      items={items}
      status={status}
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
