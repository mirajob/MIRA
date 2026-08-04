import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

export const locales = ["it", "en"] as const;
export type Locale = (typeof locales)[number];
/**
 * Chi non dichiara niente (nessun cookie, nessun accept-language) vede l'italiano:
 * è la lingua del prodotto oggi, ed è la lingua di titoli e descrizioni per le
 * anteprime dei link. Prima il default era l'inglese e i crawler leggevano una
 * pagina in inglese con la descrizione in italiano: quando le due non combaciano,
 * Google butta via la descrizione e si scrive lui il riassunto. Chi ha il browser
 * in inglese continua a vedere l'inglese, quello lo dice accept-language.
 */
export const defaultLocale: Locale = "it";

const LOCALE_COOKIE = "NEXT_LOCALE";

export async function resolveLocale(): Promise<Locale> {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (cookieLocale === "it" || cookieLocale === "en") {
    return cookieLocale;
  }

  // La lingua del browser vale in entrambi i sensi: prima il default era l'inglese e
  // bastava controllare "it", ora che il default è l'italiano va riconosciuto anche
  // "en", altrimenti chi ha il browser in inglese si ritroverebbe il sito in italiano.
  const acceptLanguage = (await headers()).get("accept-language");
  const primaryLanguage = acceptLanguage?.split(",")[0]?.trim().toLowerCase();
  if (primaryLanguage?.startsWith("it")) return "it";
  if (primaryLanguage?.startsWith("en")) return "en";

  return defaultLocale;
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  const messages = (await import(`../../messages/${locale}.json`)).default;
  return { locale, messages };
});
