import { validDate } from "../growth/domain";
import {
  matchId,
  resultId,
  type Match,
  type MatchData,
  type Outcome,
} from "../matches/domain";
import { MATCH_REWARD_COINS } from "../config/rewards";
import type { RewardData } from "./domain";

export interface RewardOwner {
  playerId: string;
  careerStartedAt: string;
}
export interface MatchRewardTransaction extends RewardOwner {
  type: "match-result";
  id: string;
  matchId: string;
  resultId: string;
  outcome: Outcome;
  amount: number;
  resolvedAt: string;
  createdAt: string;
}
export const matchRewardId = (id: string) =>
  JSON.stringify(["match", id, "result"]);
export function matchTransaction(
  match: Match,
  at: string,
): MatchRewardTransaction {
  const result = match.result;
  if (!result || match.skippedAt || !validDate(at) || at < result.resolvedAt)
    throw Error("A valid saved completed Match and award clock are required.");
  return {
    type: "match-result",
    id: matchRewardId(match.id),
    matchId: match.id,
    resultId: result.id,
    playerId: match.playerId,
    careerStartedAt: match.careerStartedAt,
    outcome: result.outcome,
    amount: MATCH_REWARD_COINS[result.outcome],
    resolvedAt: result.resolvedAt,
    createdAt: at,
  };
}
export function isMatchTransaction(
  value: unknown,
): value is MatchRewardTransaction {
  try {
    if (!value || typeof value !== "object") return false;
    const t = value as MatchRewardTransaction;
    const identity: unknown = JSON.parse(t.matchId);
    if (
      !Array.isArray(identity) ||
      identity.length !== 3 ||
      typeof identity[0] !== "string" ||
      !identity[0].trim() ||
      !validDate(identity[1]) ||
      typeof identity[2] !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(identity[2]) ||
      !validDate(`${identity[2]}T00:00:00.000Z`) ||
      new Date(`${identity[2]}T00:00:00.000Z`).getUTCDay() !== 1
    )
      return false;
    return (
      t.type === "match-result" &&
      t.matchId === matchId(identity[0], identity[1], identity[2]) &&
      t.id === matchRewardId(t.matchId) &&
      t.resultId === resultId(t.matchId) &&
      t.playerId === identity[0] &&
      t.careerStartedAt === identity[1] &&
      (t.outcome === "WIN" || t.outcome === "DRAW" || t.outcome === "LOSS") &&
      t.amount === MATCH_REWARD_COINS[t.outcome] &&
      validDate(t.resolvedAt) &&
      validDate(t.createdAt) &&
      t.createdAt >= t.resolvedAt
    );
  } catch {
    return false;
  }
}
/** A structurally valid transaction is not proof of a completed Match. Cross-check
 * durable evidence on every repository read/write that contains Match payments. */
export function validateMatchPayments(
  rewards: RewardData,
  matches: MatchData,
): void {
  for (const tx of rewards.transactions) {
    if (tx.type !== "match-result") continue;
    const match = matches.matches.find((m) => m.id === tx.matchId);
    if (
      !match?.result ||
      match.skippedAt ||
      match.playerId !== tx.playerId ||
      match.careerStartedAt !== tx.careerStartedAt ||
      match.result.id !== tx.resultId ||
      match.result.outcome !== tx.outcome ||
      match.result.resolvedAt !== tx.resolvedAt
    )
      throw Error(
        "Match reward evidence is unavailable or inconsistent. Saved data is preserved.",
      );
  }
}
export function applyMatchPayments(
  data: RewardData,
  matches: MatchData,
  owner: RewardOwner,
  at: string,
): RewardData {
  if (
    !owner.playerId.trim() ||
    !validDate(owner.careerStartedAt) ||
    matches.matches.some(
      (m) =>
        m.playerId !== owner.playerId ||
        m.careerStartedAt !== owner.careerStartedAt,
    )
  )
    throw Error("Match reward ownership mismatch. Saved data is preserved.");
  validateMatchPayments(data, matches);
  const unpaid = matches.matches.filter(
    (m) =>
      m.result && !data.transactions.some((t) => t.id === matchRewardId(m.id)),
  );
  if (!unpaid.length) return data;
  return {
    version: 2,
    receipts: data.receipts.map((r) => ({ ...r })),
    transactions: [
      ...data.transactions.map((t) => ({ ...t })),
      ...unpaid.map((m) => matchTransaction(m, at)),
    ],
  };
}
