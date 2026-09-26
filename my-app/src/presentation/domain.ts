import { bodyParts } from "../config/training";
import { overall } from "../growth/domain";
import type { GrowthPlayer } from "../types/growth";
import type { BodyArea } from "../types/domain";

export interface RatingUp {
  identity: string;
  sessionId: string;
  areas: { area: BodyArea; before: number; after: number; assessed: boolean }[];
  ovr: { before: number; after: number } | null;
}
export const presentationIdentity = (playerId: string, sessionId: string) =>
  JSON.stringify([playerId, sessionId]);

/** Read the durable ledger, never calculate or award growth. Array order is canonical. */
export function ratingUp(
  player: GrowthPlayer,
  sessionId: string,
): RatingUp | null {
  if (!player.finalizedSessionIds.includes(sessionId)) return null;
  let ratings = { ...player.initialRatings };
  let before: typeof ratings | null = null;
  let after: typeof ratings | null = null;
  let leftSession = false;
  const assessed = new Set<BodyArea>();
  const seen = new Set<string>();
  for (const event of player.events) {
    if (seen.has(event.id)) throw new Error("Duplicate presentation evidence");
    seen.add(event.id);
    if (event.sessionId === sessionId) {
      if (leftSession) throw new Error("Interleaved workout evidence");
      before ??= { ...ratings };
      if (event.kind === "assessment")
        event.changes.forEach((change) => assessed.add(change.area));
    } else if (before) leftSession = true;
    for (const change of event.changes) {
      if (
        ratings[change.area] !== change.before ||
        !Number.isFinite(change.after)
      )
        throw new Error("Discontinuous presentation evidence");
      ratings[change.area] = change.after;
    }
    if (event.sessionId === sessionId) after = { ...ratings };
  }
  if (!before || !after) return null;
  const start = before,
    end = after;
  const areas = bodyParts.flatMap((area) =>
    Math.floor(end[area]) > Math.floor(start[area])
      ? [
          {
            area,
            before: Math.floor(start[area]),
            after: Math.floor(end[area]),
            assessed: assessed.has(area),
          },
        ]
      : [],
  );
  const oldOVR = overall(start),
    newOVR = overall(end);
  const ovr = newOVR > oldOVR ? { before: oldOVR, after: newOVR } : null;
  return areas.length || ovr
    ? {
        identity: presentationIdentity(player.id, sessionId),
        sessionId,
        areas,
        ovr,
      }
    : null;
}
