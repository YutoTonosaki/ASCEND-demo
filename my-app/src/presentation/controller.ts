import type { GrowthPlayer } from "../types/growth";
import { PresentationRepository } from "../storage/presentation-repository";
import { ratingUp, type RatingUp } from "./domain";

/** Only fresh LiveWorkout callbacks may enqueue; no history scanning or replay. */
export class PresentationController {
  private pending = new Set<string>();
  private handled = new Set<string>();
  constructor(private repository: PresentationRepository) {}
  request(sessionId: string) {
    if (!this.handled.has(sessionId)) this.pending.add(sessionId);
  }
  async next(
    player: GrowthPlayer,
    completedIds: string[],
  ): Promise<RatingUp | null> {
    for (const id of this.pending) {
      if (
        !completedIds.includes(id) ||
        !player.finalizedSessionIds.includes(id)
      )
        continue;
      this.pending.delete(id);
      this.handled.add(id); // includes in-flight/error/no-increase: never replay this run
      try {
        const result = ratingUp(player, id);
        if (result && (await this.repository.consume(result.identity)))
          return result;
      } catch {
        // Presentation failures never affect training/player persistence.
      }
    }
    return null;
  }
}
