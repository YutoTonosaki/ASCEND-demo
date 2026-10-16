import { copy, type Match } from "../domain";
import { MATCH_REWARD_COINS } from "../../config/rewards";
import type { MatchHistoryItem } from "../history";

/** Inputs are validated saved Provider records. Detached, deeply immutable renderer contract. */
function freeze<T>(value: T): Readonly<T> {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
export function matchup(match: Match) {
  if (!match.weekEnd || match.skippedAt)
    throw Error("Saved Match snapshot required");
  return freeze(
    copy({
      id: match.id,
      player: {
        identity: "PLAYER" as const,
        club: match.club,
        ovr: match.weekEnd.ovr,
        ratings: match.weekEnd.ratings,
        bonus: match.weekEnd.weeklyBonus,
        power: match.result?.playerMatchPower ?? match.weekEnd.playerMatchPower,
      },
      rival: {
        ...match.rival,
        power:
          match.result?.rivalMatchPower ??
          match.rival.ovr + match.rival.condition,
      },
      week: match.week,
    }),
  );
}
export function completedPresentation(match: Match) {
  if (!match.result) throw Error("Durable completed result required");
  return freeze({
    ...matchup(match),
    result: copy(match.result),
    expectedReward: MATCH_REWARD_COINS[match.result.outcome],
  });
}
export type MatchPresentation = ReturnType<typeof completedPresentation>;
export type Matchup = ReturnType<typeof matchup>;
export function reportModel(item: MatchHistoryItem) {
  return {
    model: completedPresentation(item.match),
    payment: { ...item.payment },
  };
}
