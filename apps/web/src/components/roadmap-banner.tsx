"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { dismissRoadmap } from "@/lib/actions/chat-profile";

export function RoadmapBanner() {
  const t = useTranslations("RoadmapBanner");
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  async function handleDismiss() {
    setVisible(false);
    await dismissRoadmap();
  }

  return (
    <div className="rounded-lg border-2 border-petrol/30 bg-petrol-50 p-6 space-y-4">
      <h2 className="font-sans text-h3 text-navy">{t("heading")}</h2>

      <div className="space-y-3 text-body text-ink">
        <div>
          <p className="font-medium text-navy">{t("orientamento.title")}</p>
          <p className="text-body-sm text-ink-secondary">
            {t("orientamento.body")}
          </p>
        </div>

        <div>
          <p className="font-medium text-navy">{t("simulazioni.title")}</p>
          <p className="text-body-sm text-ink-secondary">
            {t("simulazioni.body")}
          </p>
        </div>

        <div>
          <p className="font-medium text-navy">{t("matching.title")}</p>
          <p className="text-body-sm text-ink-secondary">
            {t("matching.body")}
          </p>
        </div>

        <div>
          <p className="font-medium text-navy">{t("crescita.title")}</p>
          <p className="text-body-sm text-ink-secondary">
            {t("crescita.body")}
          </p>
        </div>
      </div>

      <p className="text-body-sm font-medium text-petrol-700">
        {t("closing")}
      </p>

      <button
        onClick={handleDismiss}
        className="text-body-sm text-navy border border-border rounded-md px-4 py-2 hover:bg-white transition-colors duration-100"
      >
        {t("dismiss")}
      </button>
    </div>
  );
}
