import {
  categories,
  cosmeticById,
  defaultEquipment,
  type Equipment,
} from "./catalog";
import { balance, type RewardData } from "../rewards/domain";
import { validDate } from "../growth/domain";
export type ShopProblem =
  | "storage"
  | "owner"
  | "item"
  | "insufficient"
  | "unowned"
  | "category"
  | "clock";
export class ShopError extends Error {
  constructor(public code: ShopProblem) {
    super(`Shop ${code}. Saved data is preserved.`);
  }
}
export interface Purchase {
  id: string;
  ownerId: string;
  itemId: string;
  price: number;
  at: string;
  /** Immutable funding evidence: IDs only, never a duplicate Rewards ledger. */
  fundingIds: string[];
}
export interface ShopData {
  version: 1;
  catalogVersion: 1;
  ownerId: string | null;
  purchases: Purchase[];
  equipment: Equipment;
}
export const emptyShop = (): ShopData => ({
  version: 1,
  catalogVersion: 1,
  ownerId: null,
  purchases: [],
  equipment: defaultEquipment(),
});
export const purchaseId = (ownerId: string, itemId: string) =>
  JSON.stringify(["purchase", ownerId, itemId]);
const text = (v: unknown): v is string =>
  typeof v === "string" && !!v.trim() && v.trim() === v;
export function parseShop(raw: string | null): ShopData {
  if (raw === null) return emptyShop();
  try {
    const d: ShopData = JSON.parse(raw);
    if (
      d?.version !== 1 ||
      d.catalogVersion !== 1 ||
      !text(d.ownerId) ||
      !Array.isArray(d.purchases) ||
      !d.equipment ||
      Object.keys(d.equipment).length !== categories.length
    )
      throw Error();
    const ids = new Set<string>();
    let previous = "";
    for (const p of d.purchases) {
      const item = cosmeticById(p.itemId);
      if (
        !item ||
        p.ownerId !== d.ownerId ||
        p.id !== purchaseId(d.ownerId!, p.itemId) ||
        ids.has(p.itemId) ||
        p.price !== item.price ||
        !validDate(p.at) ||
        p.at < previous ||
        !Array.isArray(p.fundingIds) ||
        !p.fundingIds.every(text) ||
        new Set(p.fundingIds).size !== p.fundingIds.length
      )
        throw Error();
      ids.add(p.itemId);
      previous = p.at;
    }
    if (!d.purchases.length) throw Error(); // Missing store is the only unowned/default store; never persist an empty reset.
    for (const category of categories) {
      const id = d.equipment[category];
      if (
        id !== null &&
        (!text(id) || !ids.has(id) || cosmeticById(id)?.category !== category)
      )
        throw Error();
    }
    return JSON.parse(JSON.stringify(d));
  } catch {
    throw new ShopError("storage");
  }
}
export function wallet(rewards: RewardData, data: ShopData) {
  const earned = balance(rewards),
    transactions = new Map(rewards.transactions.map((t) => [t.id, t]));
  let spent = 0;
  const previousFunding = new Set<string>();
  for (const p of data.purchases) {
    if ([...previousFunding].some((id) => !p.fundingIds.includes(id)))
      throw new ShopError("storage");
    let funded = 0;
    for (const id of p.fundingIds) {
      const tx = transactions.get(id);
      if (!tx || tx.createdAt > p.at) throw new ShopError("storage");
      funded += tx.amount;
      previousFunding.add(id);
    }
    spent += p.price;
    if (
      !Number.isSafeInteger(funded) ||
      !Number.isSafeInteger(spent) ||
      funded < spent
    )
      throw new ShopError("storage");
  }
  const available = earned - spent;
  if (
    !Number.isSafeInteger(earned) ||
    !Number.isSafeInteger(available) ||
    available < 0
  )
    throw new ShopError("storage");
  return { earned, spent, available };
}
export function assertShopOwner(data: ShopData, ownerId: string | null) {
  if (data.ownerId !== null && data.ownerId !== ownerId)
    throw new ShopError("owner");
}
export function buy(
  data: ShopData,
  rewards: RewardData,
  ownerId: string,
  itemId: string,
  at: string,
): ShopData {
  assertShopOwner(data, ownerId);
  if (!text(ownerId)) throw new ShopError("owner");
  const item = cosmeticById(itemId);
  if (!item) throw new ShopError("item");
  wallet(rewards, data);
  if (data.purchases.some((p) => p.itemId === itemId)) return data;
  if (wallet(rewards, data).available < item.price)
    throw new ShopError("insufficient");
  if (
    !validDate(at) ||
    rewards.transactions.some((tx) => tx.createdAt > at) ||
    data.purchases.some((p) => p.at > at)
  )
    throw new ShopError("clock");
  return {
    ...data,
    ownerId,
    purchases: [
      ...data.purchases,
      {
        id: purchaseId(ownerId, itemId),
        ownerId,
        itemId,
        price: item.price,
        at,
        fundingIds: rewards.transactions.map((t) => t.id),
      },
    ],
  };
}
export function equip(
  data: ShopData,
  ownerId: string,
  category: keyof Equipment,
  itemId: string | null,
): ShopData {
  assertShopOwner(data, ownerId);
  if (!categories.includes(category)) throw new ShopError("category");
  if (itemId !== null) {
    const item = cosmeticById(itemId);
    if (!item) throw new ShopError("item");
    if (item.category !== category) throw new ShopError("category");
    if (!data.purchases.some((p) => p.itemId === itemId))
      throw new ShopError("unowned");
  }
  if (data.equipment[category] === itemId) return data;
  return { ...data, equipment: { ...data.equipment, [category]: itemId } };
}
