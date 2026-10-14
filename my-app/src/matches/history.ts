import type { RewardData } from "../rewards/domain";
import type { MatchRewardTransaction, RewardOwner } from "../rewards/matches";
import { matchRewardId } from "../rewards/matches";
import { MATCH_REWARD_COINS } from "../config/rewards";
import {
  matchStatus,
  type Match,
  type MatchData,
  type MatchStatus,
} from "./domain";
import type { Season } from "../seasons/domain";

export interface PaymentView {
  state: "ineligible" | "pending" | "paid" | "unavailable";
  expected: number;
  confirmed: number | null;
}
export interface MatchHistoryItem {
  match: Match;
  status: MatchStatus;
  payment: PaymentView;
}
const belongs = (match: Match, owner: RewardOwner) =>
  match.playerId === owner.playerId &&
  match.careerStartedAt === owner.careerStartedAt;

/** Already validated Provider documents are the only input. No I/O or reconciliation. */
export function historyItems(
  data: MatchData,
  owner: RewardOwner,
  rewards: RewardData | null,
  status: (match: Match) => MatchStatus,
): MatchHistoryItem[] {
  const payments = new Map<string, MatchRewardTransaction>();
  for (const tx of rewards?.transactions ?? []) {
    if (tx.type !== "match-result") continue;
    if (payments.has(tx.matchId)) throw Error("Duplicate payment evidence");
    payments.set(tx.matchId, tx);
  }
  return data.matches
    .filter((m) => belongs(m, owner))
    .slice()
    .sort((a, b) =>
      b.week.weekId < a.week.weekId
        ? -1
        : b.week.weekId > a.week.weekId
          ? 1
          : a.id < b.id
            ? -1
            : a.id > b.id
              ? 1
              : 0,
    )
    .map((match) => {
      const result = match.result;
      let payment: PaymentView = {
        state: "ineligible",
        expected: 0,
        confirmed: 0,
      };
      if (result) {
        const expected = MATCH_REWARD_COINS[result.outcome],
          tx = payments.get(match.id);
        if (
          tx &&
          (tx.id !== matchRewardId(match.id) ||
            tx.resultId !== result.id ||
            tx.playerId !== match.playerId ||
            tx.careerStartedAt !== match.careerStartedAt ||
            tx.outcome !== result.outcome ||
            tx.resolvedAt !== result.resolvedAt ||
            tx.amount !== expected)
        )
          throw Error("Inconsistent payment evidence");
        payment = {
          state: !rewards ? "unavailable" : tx ? "paid" : "pending",
          expected,
          confirmed: !rewards ? null : (tx?.amount ?? 0),
        };
      }
      return { match, status: status(match), payment };
    });
}
export const historyAt = (
  data: MatchData,
  owner: RewardOwner,
  rewards: RewardData | null,
  now: string,
) => historyItems(data, owner, rewards, (m) => matchStatus(m, now));
/** Canonical Monday is already in the frozen Match calendar. Never resolve this through Date/timezone. */
export const matchMonth = (match: Match) => match.week.weekId.slice(0, 7);
export function seasonMatches(
  items: readonly MatchHistoryItem[],
  season: Season,
): MatchHistoryItem[] {
  return items.filter(
    ({ match }) =>
      matchMonth(match) === season.monthId && belongs(match, season),
  );
}
export function matchStatistics(
  items: readonly MatchHistoryItem[],
  paymentsAvailable: boolean,
) {
  const unique = [
    ...new Map(items.map((item) => [item.match.id, item])).values(),
  ];
  const count = (outcome: "WIN" | "DRAW" | "LOSS") =>
    unique.filter((i) => i.match.result?.outcome === outcome).length;
  const wins = count("WIN"),
    draws = count("DRAW"),
    losses = count("LOSS"),
    played = wins + draws + losses;
  return {
    played,
    wins,
    draws,
    losses,
    skipped: unique.filter((i) => i.status === "SKIPPED").length,
    winRate: played ? (wins / played) * 100 : null,
    expectedCoins: unique.reduce((n, i) => n + i.payment.expected, 0),
    confirmedCoins:
      paymentsAvailable &&
      unique.every((i) => i.payment.state !== "unavailable")
        ? unique.reduce((n, i) => n + (i.payment.confirmed ?? 0), 0)
        : null,
  };
}
