"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { updateHeaderVisibility } from "@/lib/actions/card-blocks";
import type { HeaderVisibility } from "@mira/types";

/**
 * I due interruttori sulla visibilità della media. Governano anche i voti dei singoli
 * esami, quindi compaiono sia nell'Header sia accanto al caricamento del libretto: è lì
 * che lo studente si chiede "e i miei voti chi li vede?".
 */
export function MediaVisibilityToggles({ visibility }: { visibility: HeaderVisibility }) {
  const t = useTranslations("CardBlocks");
  const [vis, setVis] = useState<HeaderVisibility>(
    visibility?.media_voti ? visibility : { media_voti: { associazioni: false, aziende: false } }
  );

  useEffect(() => {
    if (visibility?.media_voti) setVis(visibility);
  }, [visibility]);

  async function toggle(key: keyof HeaderVisibility["media_voti"]) {
    const next = { media_voti: { ...vis.media_voti, [key]: !vis.media_voti[key] } };
    setVis(next);
    await updateHeaderVisibility(next);
  }

  return (
    <div className="space-y-3">
      <p className="text-body-sm font-medium text-ink">{t("header.visibilitaTitle")}</p>
      {(["associazioni", "aziende"] as const).map((key) => (
        <label key={key} className="flex items-center justify-between gap-4 cursor-pointer">
          <span className="text-body-sm text-ink-secondary">
            {t(key === "associazioni" ? "header.visibilitaAssociazioni" : "header.visibilitaAziende")}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={vis.media_voti[key]}
            onClick={() => toggle(key)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
              vis.media_voti[key] ? "bg-petrol" : "bg-border"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                vis.media_voti[key] ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </label>
      ))}
    </div>
  );
}
