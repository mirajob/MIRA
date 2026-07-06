"use client";

import { ListBlock, ListView, type ListFieldConfig } from "./list-block";
import type { CardBlockStatus, EsperienzaItem } from "@mira/types";

const fields: ListFieldConfig<EsperienzaItem>[] = [
  { key: "titolo", label: "Titolo / ruolo", placeholder: "es. Analista M&A" },
  { key: "organizzazione", label: "Organizzazione", placeholder: "es. Nome azienda o associazione" },
  { key: "periodo", label: "Periodo", placeholder: "es. giugno 2024 – presente" },
  { key: "descrizione", label: "Cosa hai fatto concretamente", type: "textarea", placeholder: "2-3 righe su cosa hai fatto tu" },
];

export function EsperienzeBlock({
  items,
  status,
  onApproved,
}: {
  items: EsperienzaItem[];
  status: CardBlockStatus;
  onApproved?: () => void;
}) {
  return (
    <ListBlock
      blockType="esperienze"
      title="Esperienze"
      items={items}
      status={status}
      onApproved={onApproved}
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

/**
 * Resa di sola lettura, riusata dal Profilo (default) e dalla vista associazione/azienda.
 * Il renderItem resta interno a questo componente client — passarlo da un Server Component
 * (student/page.tsx, candidate-card.tsx) come prop farebbe fallire la serializzazione RSC
 * ("Functions cannot be passed directly to Client Components").
 */
export function EsperienzeView({ items }: { items: EsperienzaItem[] }) {
  return (
    <ListView
      title="Esperienze"
      items={items}
      emptyLabel="Nessuna esperienza ancora."
      renderItem={(it) => (
        <div>
          <p className="text-body-sm font-medium text-ink">{it.titolo || it.organizzazione}</p>
          <p className="text-body-sm text-ink-secondary">{it.descrizione}</p>
        </div>
      )}
    />
  );
}
