import { isActual, isSession } from "../sessions/domain";
import { validCalendar } from "../seasons/calendar";
import type { SetTarget } from "../types/training";
import type { DailyXP, XPActivation, XPSessionInput } from "./types";

export const XP_PER_ELIGIBLE_SET = 15;
export const DAILY_XP_CAP = 60;

export function eligibleXPActual(actual: unknown, type: SetTarget["type"]): boolean {
  if (type !== "reps" && type !== "weight_reps" && type !== "time") return false;
  if (!isActual(actual, type)) return false;
  return actual.type === "time" ? actual.seconds >= 20 : actual.reps >= 5;
}

export const xpSetIdentity = (sessionId: string, setId: string) =>
  JSON.stringify([sessionId, setId]);
export const dailyXPAwardIdentity = (localDay: string) =>
  JSON.stringify(["local-player", localDay, "training-xp"]);

// Stable comparison includes all supplied evidence, independent of object key order.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(key =>
      `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

/** Complete activation-scope evidence is required, not merely the latest session. */
export function calculateDailyXP(
  inputs: readonly XPSessionInput[],
  activation: XPActivation,
  previouslyAwarded: Readonly<Record<string, number>> = {},
): DailyXP[] {
  if (!Number.isFinite(Date.parse(activation.activatedAt)) ||
      new Date(activation.activatedAt).toISOString() !== activation.activatedAt ||
      activation.excludedSessionIds.some(id => !id.trim() || id.trim() !== id || id.length > 150) ||
      new Set(activation.excludedSessionIds).size !== activation.excludedSessionIds.length) {
    throw new Error("Invalid XP activation context");
  }
  const excluded = new Set(activation.excludedSessionIds);
  const sessions = new Map<string, string>();
  const days = new Map<string, Set<string>>();
  for (const input of inputs) {
    const session = input.session;
    if (!isSession(session)) throw new Error("Invalid XP session evidence");
    const fingerprint = canonical(input);
    const existing = sessions.get(session.id);
    if (existing !== undefined) {
      if (existing !== fingerprint) throw new Error("Conflicting duplicate XP session");
      continue;
    }
    sessions.set(session.id, fingerprint);
    if (session.status !== "completed" || excluded.has(session.id) ||
        session.completedAt < activation.activatedAt) continue;
    const calendar = input.completionDay;
    if (!calendar || !validCalendar({
      at: session.completedAt, localDay: calendar.localDay,
      monthId: calendar.localDay.slice(0, 7), offsetMinutes: calendar.offsetMinutes,
    })) throw new Error("Invalid or missing XP completion-day context");
    const sets = days.get(calendar.localDay) ?? new Set<string>();
    for (const entry of session.exercises) {
      for (const set of entry.sets) {
        if (set.result && eligibleXPActual(set.result.actual, set.target.type)) {
          sets.add(xpSetIdentity(session.id, set.id));
        }
      }
    }
    days.set(calendar.localDay, sets);
  }
  for (const [day, amount] of Object.entries(previouslyAwarded)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) ||
        !validCalendar({ at: `${day}T12:00:00.000Z`, localDay: day,
          monthId: day.slice(0, 7), offsetMinutes: 0 }) ||
        !Number.isSafeInteger(amount) || amount < 0 || amount > DAILY_XP_CAP ||
        amount % XP_PER_ELIGIBLE_SET !== 0) {
      throw new Error("Invalid previously awarded daily XP");
    }
    if (!days.has(day)) days.set(day, new Set());
  }
  return [...days.keys()].sort().map(localDay => {
    const eligibleSetIds = [...days.get(localDay)!].sort();
    const entitlement = Math.min(eligibleSetIds.length, DAILY_XP_CAP / XP_PER_ELIGIBLE_SET) * XP_PER_ELIGIBLE_SET;
    const paid = Object.hasOwn(previouslyAwarded, localDay) ? previouslyAwarded[localDay] : 0;
    if (paid > entitlement) throw new Error("Daily XP exceeds supplied evidence");
    return { localDay, eligibleSetIds, eligibleSetCount: eligibleSetIds.length,
      entitlement, previouslyAwarded: paid, incrementalXP: entitlement - paid,
      awardId: dailyXPAwardIdentity(localDay) };
  });
}
