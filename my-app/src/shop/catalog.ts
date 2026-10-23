/** Version 1 prices/IDs are immutable validation evidence. Future rebalance needs a new price version. */
export const categories = ["background", "border", "aura", "title"] as const;
export type CosmeticCategory = (typeof categories)[number];
export type CosmeticRarity = "bronze" | "silver" | "gold" | "purple";
export type CosmeticId =
  | "bg-midnight"
  | "bg-stadium"
  | "bg-nebula"
  | "border-steel"
  | "border-chrome"
  | "border-gold"
  | "aura-blue"
  | "aura-purple"
  | "title-rookie"
  | "title-rising-star";
export interface CosmeticItem {
  id: CosmeticId;
  category: CosmeticCategory;
  rarity: CosmeticRarity;
  price: number;
  color: string;
}
export const catalog: readonly CosmeticItem[] = Object.freeze(
  [
    {
      id: "bg-midnight",
      category: "background",
      rarity: "bronze",
      price: 40,
      color: "#101c35",
    },
    {
      id: "bg-stadium",
      category: "background",
      rarity: "silver",
      price: 90,
      color: "#23413e",
    },
    {
      id: "bg-nebula",
      category: "background",
      rarity: "gold",
      price: 180,
      color: "#38264b",
    },
    {
      id: "border-steel",
      category: "border",
      rarity: "bronze",
      price: 35,
      color: "#93a4b3",
    },
    {
      id: "border-chrome",
      category: "border",
      rarity: "silver",
      price: 85,
      color: "#e3edf3",
    },
    {
      id: "border-gold",
      category: "border",
      rarity: "gold",
      price: 175,
      color: "#f6d273",
    },
    {
      id: "aura-blue",
      category: "aura",
      rarity: "silver",
      price: 100,
      color: "#84b9ff",
    },
    {
      id: "aura-purple",
      category: "aura",
      rarity: "purple",
      price: 260,
      color: "#c4a0ff",
    },
    {
      id: "title-rookie",
      category: "title",
      rarity: "bronze",
      price: 30,
      color: "#e6af7e",
    },
    {
      id: "title-rising-star",
      category: "title",
      rarity: "gold",
      price: 150,
      color: "#f6d273",
    },
  ].map((item) => Object.freeze(item)) as CosmeticItem[],
);
export const cosmeticById = (id: string) =>
  catalog.find((item) => item.id === id);
export type Equipment = Record<CosmeticCategory, string | null>;
export const defaultEquipment = (): Equipment => ({
  background: null,
  border: null,
  aura: null,
  title: null,
});
/** Renderer-only adapter. It never grants ownership or modifies the earned Card Tier. */
export function cosmeticAppearance(equipment: Equipment) {
  const item = (category: CosmeticCategory) => {
    const found = cosmeticById(equipment[category] ?? "");
    return found?.category === category ? found : undefined;
  };
  return {
    background: item("background"),
    border: item("border"),
    aura: item("aura"),
    title: item("title"),
  };
}
