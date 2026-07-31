"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { CardBlockStatus } from "@mira/types";

/**
 * Mostra `view` (sola lettura) di default, con un link "Modifica" che passa a `edit`
 * (il form editabile esistente). "Fatto" richiude e ricarica la pagina server-side —
 * i componenti edit chiamano già revalidatePath("/student") al salvataggio, quindi
 * router.refresh() qui basta a far vedere subito il dato aggiornato nella vista.
 *
 * Se il blocco non è confermato lo dice apertamente: una sezione vuota o in bozza non
 * arriva ad associazioni e aziende, e prima di questo avviso niente lo segnalava
 * (lo studente vedeva il contenuto sul proprio Profilo e lo dava per pubblicato).
 */
export function EditableSection({
  view,
  edit,
  status,
}: {
  view: React.ReactNode;
  edit: React.ReactNode;
  status?: CardBlockStatus;
}) {
  const t = useTranslations("CardBlocks");
  const [editing, setEditing] = useState(false);
  const router = useRouter();

  if (editing) {
    return (
      <div>
        {edit}
        <div className="px-5 py-3 border-t border-border">
          <button
            onClick={() => {
              setEditing(false);
              router.refresh();
            }}
            className="text-body-sm font-medium text-petrol hover:text-petrol-700 transition-colors"
          >
            {t("done")}
          </button>
        </div>
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
      {status && status !== "approved" && (
        <button
          onClick={() => setEditing(true)}
          className="mx-4 mb-3 flex w-[calc(100%-2rem)] items-center gap-2 rounded-md border border-warning/30 bg-warning-bg px-3 py-2 text-left transition-colors hover:border-warning/60"
        >
          <span className="text-body-sm text-warning">
            {t(status === "empty" ? "notPublishedEmpty" : "notPublishedDraft")}
          </span>
        </button>
      )}
    </div>
  );
}
