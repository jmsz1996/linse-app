export type Locale = "en" | "es";

export const LOCALE_COOKIE = "linse_locale";
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALES: Locale[] = ["en", "es"];

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "es";
}

/**
 * Resolve the active locale. An explicit cookie choice always wins; otherwise
 * fall back to the browser's primary `Accept-Language` (Spanish → es, else en).
 */
export function resolveLocale(
  cookieValue?: string | null,
  acceptLanguage?: string | null
): Locale {
  if (isLocale(cookieValue)) return cookieValue;
  const primary = acceptLanguage?.split(",")[0]?.trim().toLowerCase() ?? "";
  if (primary.startsWith("es")) return "es";
  return DEFAULT_LOCALE;
}
