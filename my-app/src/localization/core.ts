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
