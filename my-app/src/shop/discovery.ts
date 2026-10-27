import { catalog, type CosmeticCategory } from "./catalog";
import type { ShopData } from "./domain";
export const ownershipFilters = ["all", "owned", "unowned"] as const;
export type OwnershipFilter = (typeof ownershipFilters)[number];
/** Read-only selector; missing validated ownership never means unowned. */
export function shopProducts(
  category: CosmeticCategory | "all",
  filter: OwnershipFilter,
  data: ShopData | null,
) {
  const owned = new Set(data?.purchases.map((p) => p.itemId));
  return catalog.filter(
    (item) =>
      (category === "all" || item.category === category) &&
      (filter === "all" ||
        (data !== null &&
          (filter === "owned" ? owned.has(item.id) : !owned.has(item.id)))),
  );
}
