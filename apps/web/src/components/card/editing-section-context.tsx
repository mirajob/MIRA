"use client";

import { createContext, useContext } from "react";

/**
 * Permette al pulsante "Salva modifiche" (CardBlockHeader) di richiudere la sezione aperta
 * dal Profilo, senza che la pagina debba passare una callback ai blocchi.
 *
 * Serve un context e non una prop perché la pagina del Profilo è un Server Component: una
 * funzione passata come prop a un componente client non è serializzabile e fa esplodere il
 * render lato server. Il context invece si risolve nell'albero client, dove i blocchi
 * vengono montati come figli di EditableSection.
 *
 * Fuori dal Profilo (onboarding) il provider non c'è: `useEditingSection()` torna null e il
 * pulsante si limita a salvare e confermare.
 */
export interface EditingSectionValue {
  close: () => void;
}

export const EditingSectionContext = createContext<EditingSectionValue | null>(null);

export function useEditingSection(): EditingSectionValue | null {
  return useContext(EditingSectionContext);
}
