export const DEFAULT_TAG_COLOR = "#b08968";

export function guestCookieName(slug: string) {
  return `linse_guest_${slug}`;
}

export function localStorageKey(slug: string) {
  return `linse_recovery_${slug}`;
}
