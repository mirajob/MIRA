"use client";

import { useTranslations } from "next-intl";
import { ListBlock, ListView, type ListFieldConfig } from "./list-block";
import { MiraImproveButton } from "./mira-improve-button";
import { miraImproveEsperienza } from "@/lib/actions/onboarding-flow";
import type { CardBlockStatus, EsperienzaItem } from "@mira/types";

export function EsperienzeBlock({
  items,
  status,
  onApproved,
}: {
  items: EsperienzaItem[];
  status: CardBlockStatus;
  onApproved?: () => void;
}) {
  const t = useTranslations("CardBlocks");
  const fields: ListFieldConfig<EsperienzaItem>[] = [
    { key: "titolo", label: t("esperienze.titoloLabel"), placeholder: t("esperienze.titoloPlaceholder"), maxLength: 80 },
    { key: "organizzazione", label: t("esperienze.organizzazioneLabel"), placeholder: t("esperienze.organizzazionePlaceholder"), maxLength: 80 },
    { key: "periodo", label: t("esperienze.periodoLabel"), placeholder: t("esperienze.periodoPlaceholder"), maxLength: 40 },
    { key: "descrizione", label: t("esperienze.descrizioneLabel"), type: "textarea", placeholder: t("esperienze.descrizionePlaceholder"), maxLength: 300 },
  ];
  return (
    <ListBlock
      blockType="esperienze"
      title={t("titles.esperienze")}
      items={items}
      status={status}
      onApproved={onApproved}
      fields={fields}
      emptyLabel={t("esperienze.emptyAdd")}
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
      itemExtra={(item, index, updateItem) => (
        <div className="mt-2">
          <MiraImproveButton
            getText={() => item.descrizione}
            improve={async (text) =>
              (await miraImproveEsperienza({ titolo: item.titolo, organizzazione: item.organizzazione, descrizione: text }))
                .descrizione
            }
            onImproved={(text) => updateItem(index, "descrizione", text)}
          />
        </div>
      )}
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
  const t = useTranslations("CardBlocks");
  return (
    <ListView
      title={t("titles.esperienze")}
      items={items}
      emptyLabel={t("esperienze.emptyView")}
      renderItem={(it) => (
        <div>
          <p className="text-body-sm font-medium text-ink">{it.titolo || it.organizzazione}</p>
          <p className="text-body-sm text-ink-secondary">{it.descrizione}</p>
        </div>
      )}
    />
  );
}
