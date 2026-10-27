import type { CosmeticItem } from "./catalog";
/** Shared neutral background for new treatments; legacy tier-dependent gradients stay intact. */
export const treatmentBackground = (
  item: CosmeticItem,
): readonly [string, string, string] => ["#10151e", item.color, "#151a23"];
export function titleTreatment(item: CosmeticItem) {
  if (item.treatment === "challenger")
    return {
      color: item.color,
      borderBottomWidth: 1,
      borderColor: item.color,
      paddingBottom: 4,
      fontWeight: "700" as const,
    };
  if (item.treatment === "legend")
    return {
      color: item.color,
      borderWidth: 1,
      borderColor: item.color,
      borderRadius: 6,
      padding: 6,
      fontWeight: "800" as const,
    };
  return { color: item.color };
}
