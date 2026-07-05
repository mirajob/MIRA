"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Mostra `view` (sola lettura) di default, con un link "Modifica" che passa a `edit`
 * (il form editabile esistente). "Fatto" richiude e ricarica la pagina server-side —
 * i componenti edit chiamano già revalidatePath("/student") al salvataggio, quindi
 * router.refresh() qui basta a far vedere subito il dato aggiornato nella vista.
 */
export function EditableSection({ view, edit }: { view: React.ReactNode; edit: React.ReactNode }) {
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
            Fatto
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
        Modifica
      </button>
    </div>
  );
}
