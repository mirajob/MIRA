"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

/**
 * Mostra `view` (sola lettura) di default, con un link "Modifica" che apre il form editabile.
 *
 * Un solo pulsante per chiudere: "Salva modifiche" dentro l'intestazione del blocco salva,
 * conferma e richiude (è `onSaved`). Il vecchio "Fatto" in fondo è stato tolto perché con due
 * pulsanti non si capiva quale dei due salvasse davvero.
 */
export function EditableSection({
  view,
  edit,
}: {
  view: React.ReactNode;
  /** Riceve la callback da passare al blocco come `onApproved`: salva, conferma e richiude. */
  edit: (onSaved: () => void) => React.ReactNode;
}) {
  const t = useTranslations("CardBlocks");
  const [editing, setEditing] = useState(false);
  const router = useRouter();

  if (editing) {
    return (
      <div>
        {edit(() => {
          setEditing(false);
          router.refresh();
        })}
      </div>
    );
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
