import { withStorageQueue } from "./queue";
import { MATCHES_KEY } from "./match-repository";
import { parseMatches } from "../matches/domain";
import {
  applyMatchPayments,
  validateMatchPayments,
  type RewardOwner,
} from "../rewards/matches";
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
  constructor(
    private adapter: StorageAdapter<string>,
    private clock = () => new Date().toISOString(),
  ) {}
  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    return withStorageQueue(this.adapter, work);
  }
  private async readValidated(): Promise<RewardData> {
    const data = parseRewards(await this.adapter.read(REWARDS_KEY));
    if (data.transactions.some((t) => t.type === "match-result"))
      validateMatchPayments(
        data,
        parseMatches(await this.adapter.read(MATCHES_KEY)),
      );
    return data;
  }
  load(): Promise<RewardData> {
    return this.enqueue(async () => this.readValidated());
  }
  reconcileMatches(owner: RewardOwner): Promise<RewardData> {
    const submitted = { ...owner };
    return this.enqueue(async () => {
      const matches = parseMatches(await this.adapter.read(MATCHES_KEY));
      const previous = parseRewards(await this.adapter.read(REWARDS_KEY));
      const next = applyMatchPayments(
        previous,
        matches,
        submitted,
        this.clock(),
      );
      if (next !== previous) {
        const raw = JSON.stringify(next);
        const validated = parseRewards(raw);
        validateMatchPayments(validated, matches);
        await this.adapter.write(REWARDS_KEY, raw);
        // Confirm durable data; a fulfilled adapter promise alone is not proof.
        const durable = await this.readValidated();
        if (JSON.stringify(durable) !== JSON.stringify(validated))
          throw Error(
            "Match reward persistence could not be confirmed. Retry safely.",
          );
        return durable;
      }
      return next;
    });
  }
  award(intent: RewardIntent): Promise<RewardData> {
    const submitted = { ...intent };
    return this.enqueue(async () => {
      if (!validIntent(submitted))
        throw new Error("Invalid reward completion evidence");
      const previous = await this.readValidated();
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
