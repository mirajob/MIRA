"use client";

import { useTranslations } from "next-intl";
import { ListBlock, type ListFieldConfig } from "./list-block";
import type { CardBlockStatus, LinguaItem } from "@mira/types";

export function LingueBlock({
  items,
  status,
  onApproved,
}: {
  items: LinguaItem[];
  status: CardBlockStatus;
  onApproved?: () => void;
}) {
  const t = useTranslations("CardBlocks");
  const fields: ListFieldConfig<LinguaItem>[] = [
    { key: "lingua", label: t("lingue.linguaLabel"), placeholder: t("lingue.linguaPlaceholder") },
    { key: "livello", label: t("lingue.livelloLabel"), placeholder: t("lingue.livelloPlaceholder") },
    { key: "certificazione", label: t("lingue.certificazioneLabel"), placeholder: t("lingue.certificazionePlaceholder") },
  ];
  return (
    <ListBlock
      blockType="lingue"
      title={t("titles.lingue")}
      items={items}
      status={status}
      onApproved={onApproved}
      fields={fields}
      emptyLabel={t("lingue.emptyAdd")}
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
