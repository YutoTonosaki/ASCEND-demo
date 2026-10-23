import type { StorageAdapter } from "./index";
import { withStorageQueue } from "./queue";
import { PLAYER_KEY } from "./player-repository";
import { REWARDS_KEY } from "./rewards-repository";
import { MATCHES_KEY } from "./match-repository";
import { isPlayerData } from "../growth/validation";
import { parseRewards } from "../rewards/domain";
import { parseMatches } from "../matches/domain";
import { validateMatchPayments } from "../rewards/matches";
import {
  assertShopOwner,
  buy,
  equip,
  parseShop,
  wallet,
  ShopError,
  type ShopData,
} from "../shop/domain";
import type { Equipment } from "../shop/catalog";
export const SHOP_KEY = "ascend.shop.v1";
export interface ShopSnapshot {
  data: ShopData;
  wallet: ReturnType<typeof wallet>;
  scope: string | null;
}
export class ShopRepository {
  constructor(
    private adapter: StorageAdapter<string>,
    private clock = () => new Date().toISOString(),
  ) {}
  private async read(ownerId: string | null) {
    const raw = await this.adapter.read(PLAYER_KEY);
    const player =
      raw === null ? { version: 1, player: null } : JSON.parse(raw);
    if (!isPlayerData(player) || (player.player?.id ?? null) !== ownerId)
      throw new ShopError("owner");
    const data = parseShop(await this.adapter.read(SHOP_KEY));
    assertShopOwner(data, ownerId);
    if (
      data.purchases.some(
        (p) => !player.player || p.at < player.player.initializedAt,
      )
    )
      throw new ShopError("storage");
    const rewards = parseRewards(await this.adapter.read(REWARDS_KEY));
    if (rewards.transactions.some((t) => t.type === "match-result"))
      validateMatchPayments(
        rewards,
        parseMatches(await this.adapter.read(MATCHES_KEY)),
      );
    return {
      data,
      rewards,
      snapshot: {
        data,
        wallet: wallet(rewards, data),
        scope: ownerId,
      } as ShopSnapshot,
      initializedAt: player.player?.initializedAt,
    };
  }
  load(ownerId: string | null) {
    return withStorageQueue(
      this.adapter,
      async () => (await this.read(ownerId)).snapshot,
    );
  }
  private mutate(
    ownerId: string,
    change: (state: Awaited<ReturnType<ShopRepository["read"]>>) => ShopData,
  ) {
    return withStorageQueue(this.adapter, async () => {
      const state = await this.read(ownerId);
      if (!state.initializedAt) throw new ShopError("owner");
      const next = change(state);
      if (next === state.data) return state.snapshot;
      const raw = JSON.stringify(next);
      parseShop(raw);
      wallet(state.rewards, next);
      let failure: unknown;
      try {
        await this.adapter.write(SHOP_KEY, raw);
      } catch (e) {
        failure = e;
      }
      // Readback is required even for fulfilled writes; lost acknowledgment can recover here.
      const durable = await this.read(ownerId);
      if (JSON.stringify(durable.data) !== raw)
        throw failure ?? new ShopError("storage");
      return durable.snapshot;
    });
  }
  purchase(ownerId: string, itemId: string) {
    return this.mutate(ownerId, (s) => {
      const at = this.clock();
      if (at < s.initializedAt!) throw new ShopError("clock");
      return buy(s.data, s.rewards, ownerId, itemId, at);
    });
  }
  equip(ownerId: string, category: keyof Equipment, itemId: string | null) {
    return this.mutate(ownerId, (s) =>
      equip(s.data, ownerId, category, itemId),
    );
  }
}
