import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, resolveLocale, type Locale } from "@/lib/i18n";
import { dictionaries, type Dict } from "@/lib/i18n/dictionaries";

// Server-only (uses next/headers). Reads the locale cookie, falling back to the
// request's Accept-Language on first visit.
export async function getLocale(): Promise<Locale> {
  const [jar, hdrs] = await Promise.all([cookies(), headers()]);
  return resolveLocale(jar.get(LOCALE_COOKIE)?.value, hdrs.get("accept-language"));
}

export async function getDict(): Promise<Dict> {
  return dictionaries[await getLocale()];
}

export function dateLocale(locale: Locale): string {
  return locale === "es" ? "es-MX" : "en-US";
}
