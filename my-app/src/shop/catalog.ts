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
  | "title-rising-star"
  | "bg-training-ground"
  | "bg-night-arena"
  | "bg-cyber-grid"
  | "border-carbon"
  | "border-platinum"
  | "border-champion"
  | "aura-electric"
  | "aura-crimson"
  | "title-challenger"
  | "title-legend";
export type CosmeticTreatment =
  | "lanes"
  | "arena"
  | "grid"
  | "carbon"
  | "platinum"
  | "champion"
  | "electric"
  | "crimson"
  | "challenger"
  | "legend";
export interface CosmeticItem {
  id: CosmeticId;
  category: CosmeticCategory;
  rarity: CosmeticRarity;
  price: number;
  color: string;
  /** Static renderer metadata only; never serialized into purchases or equipment. */
  treatment?: CosmeticTreatment;
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
    {
      id: "bg-training-ground",
      category: "background",
      rarity: "bronze",
      price: 40,
      color: "#183d32",
      treatment: "lanes",
    },
    {
      id: "bg-night-arena",
      category: "background",
      rarity: "silver",
      price: 110,
      color: "#172e54",
      treatment: "arena",
    },
    {
      id: "bg-cyber-grid",
      category: "background",
      rarity: "purple",
      price: 200,
      color: "#123d49",
      treatment: "grid",
    },
    {
      id: "border-carbon",
      category: "border",
      rarity: "bronze",
      price: 50,
      color: "#9aa6b3",
      treatment: "carbon",
    },
    {
      id: "border-platinum",
      category: "border",
      rarity: "silver",
      price: 120,
      color: "#d8f1ff",
      treatment: "platinum",
    },
    {
      id: "border-champion",
      category: "border",
      rarity: "gold",
      price: 220,
      color: "#f6d273",
      treatment: "champion",
    },
    {
      id: "aura-electric",
      category: "aura",
      rarity: "silver",
      price: 130,
      color: "#6ce2f5",
      treatment: "electric",
    },
    {
      id: "aura-crimson",
      category: "aura",
      rarity: "gold",
      price: 190,
      color: "#ff8798",
      treatment: "crimson",
    },
    {
      id: "title-challenger",
      category: "title",
      rarity: "bronze",
      price: 45,
      color: "#91dded",
      treatment: "challenger",
    },
    {
      id: "title-legend",
      category: "title",
      rarity: "purple",
      price: 210,
      color: "#d5b3ff",
      treatment: "legend",
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
