import type { StorageAdapter } from "./index";
import type { PlayerData } from "../types/growth";
import type { TrainingProfile } from "../types/coach";
import type { SessionData } from "../types/session";
import { copyProfile } from "../coach/profile";
import { copySessionData } from "../sessions/domain";
import { newId } from "../training/plans";
import { initializePlayer, reconcilePlayer } from "../growth/domain";
import { isPlayerData, copyPlayerData } from "../growth/validation";
export const PLAYER_KEY = "ascend.player.v1";
export class PlayerRepository {
  private data: PlayerData | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  constructor(
    private adapter: StorageAdapter<string>,
    private clock = () => new Date().toISOString(),
  ) {}
  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    const operation = this.queue.then(work);
    this.queue = operation.catch(() => undefined);
    return operation;
  }
  load(): Promise<PlayerData> {
    return this.enqueue(async () => {
      this.data = null;
      const raw = await this.adapter.read(PLAYER_KEY);
      let data: unknown;
      try {
        data = raw === null ? { version: 1, player: null } : JSON.parse(raw);
      } catch {
        throw new Error(
          "Player data could not be read. Saved ratings have been kept.",
        );
      }
      if (!isPlayerData(data))
        throw new Error(
          "Player data is incompatible or damaged. Saved ratings have been kept; retry after restoring the data.",
        );
      this.data = data;
      return copyPlayerData(data);
    });
  }
  initialize(
    profile: TrainingProfile | null,
    sessions: SessionData,
  ): Promise<PlayerData> {
    const submittedProfile = profile ? copyProfile(profile) : null,
      submittedSessions = copySessionData(sessions),
      at = this.clock();
    return this.enqueue(async () => {
      if (!this.data)
        throw new Error("Player data has not loaded. Please retry.");
      if (this.data.player) return copyPlayerData(this.data);
      return this.publish({
        version: 1,
        player: initializePlayer(
          newId(),
          at,
          submittedProfile,
          submittedSessions,
        ),
      });
    });
  }
  reconcile(sessions: SessionData): Promise<PlayerData> {
    const submitted = copySessionData(sessions),
      now = this.clock();
    return this.enqueue(async () => {
      if (!this.data)
        throw new Error("Player data has not loaded. Please retry.");
      if (!this.data.player) return copyPlayerData(this.data);
      return this.publish({
        version: 1,
        player: reconcilePlayer(this.data.player, submitted, now),
      });
    });
  }
  private async publish(next: PlayerData): Promise<PlayerData> {
    if (!isPlayerData(next))
      throw new Error(
        "Player growth could not be validated. Existing ratings are preserved.",
      );
    if (JSON.stringify(next) !== JSON.stringify(this.data))
      await this.adapter.write(PLAYER_KEY, JSON.stringify(next));
    this.data = next;
    return copyPlayerData(next);
  }
}
