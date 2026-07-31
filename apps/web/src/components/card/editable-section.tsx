"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { EditingSectionContext } from "./editing-section-context";

/**
 * Mostra `view` (sola lettura) di default, con un link "Modifica" che apre il form editabile.
 *
 * Un solo pulsante per chiudere: "Salva modifiche" dentro l'intestazione del blocco salva,
 * conferma e richiude (via EditingSectionContext). Il vecchio "Fatto" in fondo è stato tolto
 * perché con due pulsanti non si capiva quale dei due salvasse davvero.
 */
export function EditableSection({ view, edit }: { view: React.ReactNode; edit: React.ReactNode }) {
  const t = useTranslations("CardBlocks");
  const [editing, setEditing] = useState(false);
  const router = useRouter();

  const ctx = useMemo(
    () => ({
      close: () => {
        setEditing(false);
        router.refresh();
      },
    }),
    [router]
  );

  if (editing) {
    return <EditingSectionContext.Provider value={ctx}>{edit}</EditingSectionContext.Provider>;
  }

  return (
    <div className="relative">
      {view}
      <button
        onClick={() => setEditing(true)}
        className="absolute top-4 right-5 text-xs font-medium text-ink-tertiary hover:text-petrol transition-colors"
      >
        {t("edit")}
      </button>
    </div>
  );
}
