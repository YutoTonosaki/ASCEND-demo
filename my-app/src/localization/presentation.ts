import { translate } from "./core";
import type { Locale } from "./types";
import { displayKeys } from "./display-keys";
import { exerciseNames } from "./exercise-names";
/** Existing canonical metadata/errors are adapted at the display boundary only. */
export function displayValue(locale: Locale, value: string): string {
  const key = displayKeys[value];
  return key ? translate(locale, key) : value;
}
export function displayError(locale: Locale, value: string): string {
  if (locale === "en") return value;
  return displayKeys[value] ? displayValue(locale, value) : translate(locale, "error.generic");
}
export function exerciseName(locale: Locale, value: {id:string;name:string;isCustom?:boolean}): string {
  const known = exerciseNames[value.id];
  // Preserve custom names and snapshots whose original name differs from the catalog mapping.
  return locale === "ja" && !value.isCustom && known?.en === value.name ? known.ja : value.name;
}
