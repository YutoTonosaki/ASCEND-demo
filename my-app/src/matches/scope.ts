import type { MatchData } from "./domain";

/** Read-model guard during prerequisite hydration/scope changes; never alters records. */
export function matchesOwnedBy(
  data: MatchData,
  playerId: string | undefined,
  careerStartedAt: string | undefined,
): boolean {
  return (
    !!playerId &&
    !!careerStartedAt &&
    data.matches.every(
      (match) =>
        match.playerId === playerId &&
        match.careerStartedAt === careerStartedAt,
    )
  );
}
