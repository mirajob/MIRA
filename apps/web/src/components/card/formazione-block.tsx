"use client";

import { ListBlock, type ListFieldConfig } from "./list-block";
import type { CardBlockStatus, FormazioneItem } from "@mira/types";

const fields: ListFieldConfig<FormazioneItem>[] = [
  { key: "esame", label: "Esame" },
  { key: "voto", label: "Voto" },
  { key: "cfu", label: "CFU" },
  { key: "anno", label: "Anno accademico" },
];

export function FormazioneBlock({
  items,
  status,
  onApproved,
}: {
  items: FormazioneItem[];
  status: CardBlockStatus;
  onApproved?: () => void;
}) {
  return (
    <ListBlock
      blockType="formazione"
      title="Formazione"
      items={items}
      status={status}
      onApproved={onApproved}
      fields={fields}
      readOnly
      emptyLabel="Nessun esame registrato. Carica il libretto per vederli qui."
      emptyItem={(): FormazioneItem => ({
        id: crypto.randomUUID(),
        esame: "",
        voto: null,
        cfu: null,
        anno: null,
        semestre: null,
        verified: true,
        origin: "transcript",
      })}
    />
  );
}
