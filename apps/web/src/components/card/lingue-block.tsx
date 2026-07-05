"use client";

import { ListBlock, type ListFieldConfig } from "./list-block";
import type { CardBlockStatus, LinguaItem } from "@mira/types";

const fields: ListFieldConfig<LinguaItem>[] = [
  { key: "lingua", label: "Lingua", placeholder: "es. Inglese" },
  { key: "livello", label: "Livello", placeholder: "es. C1" },
  { key: "certificazione", label: "Certificazione (opzionale)", placeholder: "es. IELTS 7.5" },
];

export function LingueBlock({
  items,
  status,
  onApproved,
}: {
  items: LinguaItem[];
  status: CardBlockStatus;
  onApproved?: () => void;
}) {
  return (
    <ListBlock
      blockType="lingue"
      title="Lingue"
      items={items}
      status={status}
      onApproved={onApproved}
      fields={fields}
      emptyLabel="Nessuna lingua ancora. Aggiungine una."
      emptyItem={(): LinguaItem => ({
        id: crypto.randomUUID(),
        lingua: "",
        livello: "",
        certificazione: null,
        verified: false,
        origin: "manual",
      })}
    />
  );
}
