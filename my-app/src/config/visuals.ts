import type { AthleticRating, CardTier, RivalColor } from "@/types/domain";
// Appearance only: no OVR thresholds or progression rules are assigned.
export const cardTiers: Record<
  CardTier,
  { label: string; accent: string; deep: string }
> = {
  bronze: { label: "Bronze", accent: "#e6af7e", deep: "#513020" },
  silver: { label: "Silver", accent: "#d8e4ef", deep: "#354452" },
  gold: { label: "Gold", accent: "#f6d273", deep: "#5c461a" },
  elite: { label: "Elite / Purple", accent: "#c4a0ff", deep: "#482967" },
};
// Display order only; this does not assign or calculate earned tiers.
export const nextTierLabel: Record<CardTier, string> = {
  bronze: "SILVER",
  silver: "GOLD",
  gold: "PURPLE / ELITE",
  elite: "ASCEND",
};
export const rivalColors: Record<RivalColor, string> = {
  blue: "#69acff",
  red: "#ff727c",
  purple: "#b894ff",
  green: "#75dba3",
};
export const ratingLabels: Record<AthleticRating, string> = {
  STR: "Strength",
  PWR: "Power",
  END: "Endurance",
  CORE: "Core stability",
  ATH: "Athleticism",
};
