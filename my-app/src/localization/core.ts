import { en } from "./locales/en";
import { ja } from "./locales/ja";
import { isLocale, type Locale, type Parameters } from "./types";
export type TranslationKey = keyof typeof en;
export function translate(
  locale: Locale,
  key: TranslationKey,
  values: Parameters = {},
): string {
  const dictionary = locale === "ja" ? ja : en;
  const template = dictionary[key] ?? en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (token, name) =>
    Object.hasOwn(values, name) ? String(values[name]) : token,
  );
}
export const localeTag = (locale: Locale) =>
  locale === "ja" ? "ja-JP" : "en-US";
export const safeLocale = (value: unknown): Locale =>
  isLocale(value) ? value : "en";
export function formatDate(locale: Locale, value: string, time = false) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return time
    ? date.toLocaleString(localeTag(locale))
    : date.toLocaleDateString(localeTag(locale));
}
export function formatMonth(locale: Locale, month: string) {
  return new Date(`${month}-15T12:00:00Z`)
    .toLocaleDateString(localeTag(locale), {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    })
    .toUpperCase();
}

/** A saved calendar day must not shift to the previous day in the device timezone. */
export function formatCalendarDay(locale: Locale, day: string) {
  const date = new Date(`${day}T12:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== day
  )
    return "—";
  return date.toLocaleDateString(localeTag(locale), {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
export function formatZonedDate(
  locale: Locale,
  value: string,
  timeZone: string,
) {
  try {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "—";
    return date.toLocaleString(localeTag(locale), {
      timeZone,
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return "—";
  }
}
