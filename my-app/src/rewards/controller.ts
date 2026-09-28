import { captureReward, type RewardIntent } from "./domain";
import type { WorkoutSession } from "../types/session";
export type RewardStatus = "pending" | "failed" | "saved";
interface Pending {
  intent: RewardIntent;
  status: RewardStatus;
  processing: boolean;
  settled: (() => void) | null;
}
/** Volatile fresh intents only. Loading history never creates an intent. */
export class RewardsController {
  private pending = new Map<string, Pending>();
  request(
    session: WorkoutSession,
    playerId: string | null,
    settled: () => void,
  ) {
    if (this.pending.has(session.id)) return;
    this.pending.set(session.id, {
      intent: captureReward(session, playerId),
      settled,
      status: "pending",
      processing: false,
    });
  }
  statuses(): Record<string, RewardStatus> {
    return Object.fromEntries(
      [...this.pending].map(([id, e]) => [id, e.status]),
    );
  }
  claim(finalized: string[], withoutGrowth: boolean): RewardIntent[] {
    const jobs: RewardIntent[] = [];
    for (const [id, e] of this.pending)
      if (
        e.status === "pending" &&
        !e.processing &&
        (withoutGrowth || finalized.includes(id))
      ) {
        e.processing = true;
        jobs.push({ ...e.intent });
      }
    return jobs;
  }
  finish(id: string, status: "saved" | "failed"): (() => void) | null {
    const e = this.pending.get(id);
    if (!e) return null;
    e.status = status;
    e.processing = false;
    const settled = e.settled;
    e.settled = null;
    return settled;
  }
  retryFailed() {
    for (const e of this.pending.values())
      if (e.status === "failed") e.status = "pending";
  }
}
