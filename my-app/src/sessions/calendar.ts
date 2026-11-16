import { calendarContext, validCalendar } from "../seasons/calendar";
import type { CompletionContext } from "../types/session";

/** Missing IANA support must not prevent a factual workout completion. */
export function deviceTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/** All wall-calendar fields and the UTC instant come from this one Date. */
export function captureCompletionContext(
  date: Date,
  timeZone: string | null,
): CompletionContext {
  const calendar = calendarContext(date);
  const context: CompletionContext = {
    version: 1,
    completedAt: calendar.at,
    localDay: calendar.localDay,
    timeZone,
    offsetMinutes: calendar.offsetMinutes,
  };
  if (!isCompletionContext(context, calendar.at))
    throw new Error("Invalid workout completion calendar context.");
  return context;
}

export function isCompletionContext(
  value: unknown,
  completedAt: string,
): value is CompletionContext {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const c = value as Record<string, unknown>;
  if (
    c.version !== 1 ||
    c.completedAt !== completedAt ||
    typeof c.localDay !== "string" ||
    typeof c.offsetMinutes !== "number" ||
    !(c.timeZone === null ||
      (typeof c.timeZone === "string" && c.timeZone.trim() === c.timeZone &&
        c.timeZone.length > 0 && c.timeZone.length <= 150))
  ) return false;
  // Retain the captured IANA label as audit context. Historical validation uses
  // the captured offset, independent of the current device zone or tzdb version.
  return validCalendar({
    at: completedAt,
    localDay: c.localDay,
    monthId: c.localDay.slice(0, 7),
    offsetMinutes: c.offsetMinutes,
  });
}
