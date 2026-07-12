import { LocaleSwitcher } from "./locale-switcher";

/**
 * Selettore lingua in alto a destra per le pagine pubbliche "centrate" senza header
 * (invite, join, stati chiusi di apply): fixed, quindi si può inserire in un punto
 * qualsiasi dell'albero senza richiedere un genitore relative.
 */
export function CornerLocale() {
  return (
    <div className="fixed right-4 top-4 z-10">
      <LocaleSwitcher />
    </div>
  );
}
