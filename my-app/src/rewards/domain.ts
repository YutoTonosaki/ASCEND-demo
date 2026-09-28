import {
  DAILY_WORKOUT_COINS,
  WEEKLY_CONSISTENCY_COINS,
  WEEKLY_TARGET_DAYS,
} from "../config/rewards";
import { isSession } from "../sessions/domain";
import type { WorkoutSession } from "../types/session";
export interface RewardIntent {
  sessionId: string;
  playerId: string | null;
  completedAt: string;
  localDay: string;
  weekId: string;
  offsetMinutes: number;
}
export interface RewardTransaction extends RewardIntent {
  id: string;
  type: "daily-workout" | "weekly-consistency";
  amount: number;
  createdAt: string;
}
export interface RewardData {
  version: 1;
  receipts: RewardIntent[];
  transactions: RewardTransaction[];
}
export const emptyRewards = (): RewardData => ({
  version: 1,
  receipts: [],
  transactions: [],
});
const pad = (n: number) => String(n).padStart(2, "0");
export function localDay(date: Date): string {
  if (!Number.isFinite(date.getTime()))
    throw new Error("Invalid completion date");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function calendar(day: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("Invalid local day");
  const d = new Date(`${day}T12:00:00Z`);
  if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== day)
    throw new Error("Invalid calendar day");
  return d;
}
/** Monday's calendar date is the week identity, including across ISO week-years. */
export function weekId(day: string): string {
  const d = calendar(day);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
export function captureReward(
  session: WorkoutSession,
  playerId: string | null,
): RewardIntent {
  if (!isSession(session) || session.status !== "completed")
    throw new Error("Rewards require a saved completed workout");
  const date = new Date(session.completedAt),
    day = localDay(date);
  return {
    sessionId: session.id,
    playerId,
    completedAt: session.completedAt,
    localDay: day,
    weekId: weekId(day),
    offsetMinutes: date.getTimezoneOffset(),
  };
}
// One local user; optional Player initialization must not create another daily allowance.
export const rewardId = (type: RewardTransaction["type"], period: string) =>
  JSON.stringify(["local-player", period, type]);
export const balance = (data: RewardData) =>
  data.transactions.reduce((sum, tx) => sum + tx.amount, 0);
export function weeklyDays(data: RewardData, week: string): number {
  return Math.min(
    WEEKLY_TARGET_DAYS,
    new Set(
      data.receipts.filter((r) => r.weekId === week).map((r) => r.localDay),
    ).size,
  );
}
export function applyReward(
  data: RewardData,
  intent: RewardIntent,
): RewardData {
  if (data.receipts.some((r) => r.sessionId === intent.sessionId)) return data;
  const next: RewardData = {
    version: 1,
    receipts: [...data.receipts, { ...intent }],
    transactions: data.transactions.map((t) => ({ ...t })),
  };
  function add(
    type: RewardTransaction["type"],
    period: string,
    amount: number,
  ) {
    const id = rewardId(type, period);
    if (!next.transactions.some((t) => t.id === id))
      next.transactions.push({
        ...intent,
        id,
        type,
        amount,
        createdAt: intent.completedAt,
      });
  }
  add("daily-workout", intent.localDay, DAILY_WORKOUT_COINS);
  if (weeklyDays(next, intent.weekId) >= WEEKLY_TARGET_DAYS)
    add("weekly-consistency", intent.weekId, WEEKLY_CONSISTENCY_COINS);
  return next;
}
export function sessionRewards(data: RewardData, sessionId: string) {
  const index = data.receipts.findIndex((r) => r.sessionId === sessionId);
  if (index < 0) return null;
  const receipt = data.receipts[index],
    transactions = data.transactions.filter((t) => t.sessionId === sessionId);
  return {
    receipt,
    transactions,
    total: transactions.reduce((n, t) => n + t.amount, 0),
    days: weeklyDays(
      { ...data, receipts: data.receipts.slice(0, index + 1) },
      receipt.weekId,
    ),
  };
}
export function validIntent(value: unknown): value is RewardIntent {
  if (!value || typeof value !== "object") return false;
  const r = value as RewardIntent;
  try {
    if (
      typeof r.sessionId !== "string" ||
      !r.sessionId.trim() ||
      (r.playerId !== null &&
        (typeof r.playerId !== "string" || !r.playerId.trim())) ||
      typeof r.completedAt !== "string" ||
      new Date(r.completedAt).toISOString() !== r.completedAt ||
      !Number.isInteger(r.offsetMinutes) ||
      Math.abs(r.offsetMinutes) > 840 ||
      weekId(r.localDay) !== r.weekId
    )
      return false;
    const wall = new Date(Date.parse(r.completedAt) - r.offsetMinutes * 60000);
    return (
      `${wall.getUTCFullYear()}-${pad(wall.getUTCMonth() + 1)}-${pad(wall.getUTCDate())}` ===
      r.localDay
    );
  } catch {
    return false;
  }
}
/** Replaying only reward receipts validates the ledger; it never scans workout history. */
export function parseRewards(raw: string | null): RewardData {
  if (raw === null) return emptyRewards();
  try {
    const d = JSON.parse(raw);
    if (
      d?.version !== 1 ||
      !Array.isArray(d.receipts) ||
      !Array.isArray(d.transactions)
    )
      throw Error();
    let expected = emptyRewards();
    for (const r of d.receipts) {
      if (
        !validIntent(r) ||
        expected.receipts.some((x) => x.sessionId === r.sessionId)
      )
        throw Error();
      expected = applyReward(expected, r);
    }
    // Reject altered amounts, dangling transactions, duplicate IDs, inconsistent weekly awards.
    if (
      JSON.stringify(expected.transactions) !==
        JSON.stringify(d.transactions) ||
      !Number.isSafeInteger(balance(expected))
    )
      throw Error();
    return expected;
  } catch {
    throw new Error(
      "Rewards could not be read. Saved data is preserved; retry without resetting.",
    );
  }
}
