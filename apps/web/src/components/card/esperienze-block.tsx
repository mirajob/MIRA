"use client";

import { ListBlock, type ListFieldConfig } from "./list-block";
import type { CardBlockStatus, EsperienzaItem } from "@mira/types";

const fields: ListFieldConfig<EsperienzaItem>[] = [
  { key: "titolo", label: "Titolo / ruolo", placeholder: "es. Analista M&A" },
  { key: "organizzazione", label: "Organizzazione", placeholder: "es. Nome azienda o associazione" },
  { key: "periodo", label: "Periodo", placeholder: "es. giugno 2024 – presente" },
  { key: "descrizione", label: "Cosa hai fatto concretamente", type: "textarea", placeholder: "2-3 righe su cosa hai fatto tu" },
];

export function EsperienzeBlock({ items, status }: { items: EsperienzaItem[]; status: CardBlockStatus }) {
  return (
    <ListBlock
      blockType="esperienze"
      title="Esperienze"
      items={items}
      status={status}
      fields={fields}
      emptyLabel="Nessuna esperienza ancora. Aggiungine una."
      emptyItem={(): EsperienzaItem => ({
        id: crypto.randomUUID(),
        titolo: "",
        ruolo: "",
        organizzazione: "",
        periodo: "",
        descrizione: "",
        verified: false,
        origin: "manual",
      })}
    />
  );
}
