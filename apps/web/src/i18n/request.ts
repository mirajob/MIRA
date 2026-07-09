import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

export const locales = ["it", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

const LOCALE_COOKIE = "NEXT_LOCALE";

export async function resolveLocale(): Promise<Locale> {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (cookieLocale === "it" || cookieLocale === "en") {
    return cookieLocale;
  }

  const acceptLanguage = (await headers()).get("accept-language");
  const primaryLanguage = acceptLanguage?.split(",")[0]?.trim().toLowerCase();
  if (primaryLanguage?.startsWith("it")) {
    return "it";
  }

  return defaultLocale;
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  const messages = (await import(`../../messages/${locale}.json`)).default;
  return { locale, messages };
});
