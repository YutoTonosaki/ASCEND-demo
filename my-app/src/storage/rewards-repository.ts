import type { StorageAdapter } from "./index";
import {
  applyReward,
  parseRewards,
  validIntent,
  type RewardData,
  type RewardIntent,
} from "../rewards/domain";
export const REWARDS_KEY = "ascend.rewards.v1";
export class RewardsRepository {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private adapter: StorageAdapter<string>) {}
  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    const result = this.queue.then(work);
    this.queue = result.catch(() => {});
    return result;
  }
  load(): Promise<RewardData> {
    return this.enqueue(async () =>
      parseRewards(await this.adapter.read(REWARDS_KEY)),
    );
  }
  award(intent: RewardIntent): Promise<RewardData> {
    const submitted = { ...intent };
    return this.enqueue(async () => {
      if (!validIntent(submitted))
        throw new Error("Invalid reward completion evidence");
      const previous = parseRewards(await this.adapter.read(REWARDS_KEY));
      const next = applyReward(previous, submitted);
      if (next !== previous) {
        const raw = JSON.stringify(next);
        parseRewards(raw);
        await this.adapter.write(REWARDS_KEY, raw);
      }
      return next;
    });
  }
}
