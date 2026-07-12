"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Sul Profilo studente la card documento è la vista di default (la card "come la vedono
 * gli altri"); la vista a blocchi editabili si apre solo con "Modifica". Entrambi i
 * sottoalberi arrivano già renderizzati dal Server Component della pagina.
 */
export function ProfileViewSwitcher({ card, edit }: { card: React.ReactNode; edit: React.ReactNode }) {
  const t = useTranslations("StudentHome");
  const [mode, setMode] = useState<"card" | "edit">("card");

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setMode((m) => (m === "card" ? "edit" : "card"))}
          className={`rounded-md px-4 py-2 text-label transition-colors duration-100 ${
            mode === "card"
              ? "bg-navy text-white hover:bg-navy-700"
              : "border border-border bg-white text-navy hover:bg-navy-50"
          }`}
        >
          {mode === "card" ? t("editCard") : t("backToCard")}
        </button>
      </div>
      {mode === "card" ? card : edit}
    </div>
  );
}
