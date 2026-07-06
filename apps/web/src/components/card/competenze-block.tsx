"use client";

import { useState } from "react";
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

function CompetenzaRow({ it }: { it: CompetenzaItem }) {
  return (
    <div className="text-body-sm text-ink">
      {it.testo}
      {it.evidenza_ref && <span className="text-ink-tertiary"> → {it.evidenza_ref}</span>}
    </div>
  );
}

/**
 * Resa di sola lettura, riusata dal Profilo (default) e dalla vista associazione/azienda.
 * Le competenze "applicate" (da esperienze) restano sempre visibili — sono quelle più
 * rilevanti da mostrare subito. Le "teoriche" (da esami) sono raggruppate e collassate
 * di default, come gli esami nell'Header: da sole occupano troppo spazio per il loro peso.
 */
export function CompetenzeView({ items }: { items: CompetenzaItem[] }) {
  const [expanded, setExpanded] = useState(false);
  const applicate = items.filter((it) => it.tipo !== "teorica");
  const teoriche = items.filter((it) => it.tipo === "teorica");

  return (
    <div className="p-5">
      <p className="text-eyebrow text-navy/60 uppercase mb-2">Competenze</p>
      {items.length === 0 && <p className="text-body-sm text-ink-tertiary italic">Nessuna competenza ancora.</p>}

      {applicate.length > 0 && (
        <div className="space-y-2">
          {applicate.map((it) => (
            <CompetenzaRow key={it.id} it={it} />
          ))}
        </div>
      )}

      {teoriche.length > 0 && (
        <div className={applicate.length > 0 ? "mt-3 pt-3 border-t border-border" : ""}>
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-1.5 text-xs text-petrol hover:text-petrol-700 transition-colors"
          >
            <span>{expanded ? "▾" : "▸"}</span>
            <span>Competenze accademiche ({teoriche.length})</span>
          </button>
          {expanded && (
            <div className="mt-2 space-y-1">
              {teoriche.map((it) => (
                <CompetenzaRow key={it.id} it={it} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
