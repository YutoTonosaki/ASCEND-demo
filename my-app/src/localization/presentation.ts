import { translate } from "./core";
import type { Locale } from "./types";
import { displayKeys } from "./display-keys";
import { exerciseNames, exerciseNameAliases } from "./exercise-names";
/** Existing canonical metadata/errors are adapted at the display boundary only. */
export function displayValue(locale: Locale, value: string): string {
  if (locale === "ja") {
    let m = value.match(/^Uses only your selected equipment for (.+)\.$/);
    if (m)
      return translate(locale, "coach.explanation.location", {
        location: displayValue(locale, m[1]),
      });
    m = value.match(
      /^(.+) was involved recently\. You can keep this focus, choose another, or rest\.$/,
    );
    if (m)
      return translate(locale, "coach.explanation.recentAreas", {
        areas: m[1]
          .split(", ")
          .map((x) => displayValue(locale, x))
          .join("・"),
      });
    m = value.match(
      /^Using (\d+) exercises? to fit the available library and time\.$/,
    );
    if (m) return translate(locale, "coach.explanation.count", { count: m[1] });
    m = value.match(
      /^(.+) is included as a secondary area, not a primary focus, in this library selection\.$/,
    );
    if (m)
      return translate(locale, "coach.explanation.secondary", {
        area: displayValue(locale, m[1]),
      });
  }
  const key = displayKeys[value];
  return key ? translate(locale, key) : value;
}
export function displayError(locale: Locale, value: string): string {
  if (locale === "en" || /[\u3000-\u9fff]/.test(value)) return value;
  return displayKeys[value]
    ? displayValue(locale, value)
    : translate(locale, "error.generic");
}
export function exerciseName(
  locale: Locale,
  value: { id: string; name: string; isCustom?: boolean },
): string {
  const known = Object.hasOwn(exerciseNames, value.id)
    ? exerciseNames[value.id]
    : undefined;
  // Preserve user names; an alias is accepted only for its known built-in identity.
  const matches =
    known &&
    (known.en === value.name ||
      (Object.hasOwn(exerciseNameAliases, value.id) &&
        exerciseNameAliases[value.id].includes(value.name)));
  return locale === "ja" && !value.isCustom && matches ? known.ja : value.name;
}

export function targetText(
  locale: Locale,
  actual: {
    type: string;
    reps?: number;
    seconds?: number;
    weightKg?: number | null;
  },
): string {
  if (actual.type === "time")
    return `${actual.seconds} ${translate(locale, "units.sec")}`;
  if (actual.type === "weight_reps")
    return `${actual.weightKg} kg × ${actual.reps}`;
  return `${actual.reps} ${translate(locale, "units.repsShort")}`;
}
