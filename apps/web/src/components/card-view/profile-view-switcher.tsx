"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Sul Profilo studente la card documento è la vista di default (la card "come la vedono
 * gli altri"); la vista a blocchi editabili si apre solo con "Modifica". Entrambi i
 * sottoalberi arrivano già renderizzati dal Server Component della pagina.
 *
 * L'avviso su cosa manca vive qui e non nella pagina perché deve poter aprire la modifica
 * con un click: mandare all'onboarding non serviva a niente, perché quel percorso guarda lo
 * stato dei blocchi e considera finito chi ha confermato sezioni vuote.
 */
export function ProfileViewSwitcher({
  card,
  edit,
  missingSections = [],
}: {
  card: React.ReactNode;
  edit: React.ReactNode;
  /** Nomi già tradotti delle sezioni ancora vuote. */
  missingSections?: string[];
}) {
  const t = useTranslations("StudentHome");
  const [mode, setMode] = useState<"card" | "edit">("card");

  return (
    <div className="space-y-3">
      {missingSections.length > 0 && (
        <button
          type="button"
          onClick={() => setMode("edit")}
          className="block w-full rounded-lg border border-error/30 bg-error-bg px-4 py-3 text-left transition-colors hover:border-error/60"
        >
          <p className="text-body-sm font-medium text-error">
            {t("incompleteTitle", { count: missingSections.length })}
          </p>
          <p className="mt-0.5 text-body-sm text-error/80">
            {t("incompleteBody", { sections: missingSections.join(", ") })}
          </p>
        </button>
      )}

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
