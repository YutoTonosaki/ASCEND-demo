import { useMemo } from "react";
import { useCareer } from "../career/provider";
import { useGrowth } from "../growth/provider";
import { useRewards } from "../rewards/provider";
import { useMatches } from "./provider";
import { historyItems, type MatchHistoryItem } from "./history";

/** Read-only adapter. Opening a history/detail view never requests persistence. */
export function useMatchHistory() {
  const matches = useMatches(),
    rewards = useRewards(),
    career = useCareer(),
    growth = useGrowth();
  const playerId = growth.data?.player?.id;
  const careerStartedAt = career.data?.career?.clubHistory[0]?.joinedAt;
  const ownerValid =
    !!playerId &&
    !!careerStartedAt &&
    career.data?.career?.playerId === playerId;
  const sourceError = !!(matches.error || career.error || growth.error);
  return useMemo(() => {
    const unavailable = {
      items: [] as MatchHistoryItem[],
      state: "unavailable" as const,
      paymentsAvailable: false,
      owner: null,
    };
    if (
      sourceError ||
      (matches.data &&
        (!ownerValid ||
          matches.data.matches.some(
            (m) =>
              m.playerId !== playerId || m.careerStartedAt !== careerStartedAt,
          )))
    )
      return unavailable;
    if (!matches.data || !ownerValid || !playerId || !careerStartedAt)
      return {
        items: [] as MatchHistoryItem[],
        state: "loading" as const,
        paymentsAvailable: false,
        owner: null,
      };
    try {
      return {
        items: historyItems(
          matches.data,
          { playerId, careerStartedAt },
          rewards.error ? null : rewards.data,
          matches.status,
        ),
        state: "ready" as const,
        owner: { playerId, careerStartedAt },
        paymentsAvailable: !!rewards.data && !rewards.error,
      };
    } catch {
      return unavailable;
    }
  }, [
    sourceError,
    matches.data,
    matches.status,
    ownerValid,
    playerId,
    careerStartedAt,
    rewards.data,
    rewards.error,
  ]);
}
