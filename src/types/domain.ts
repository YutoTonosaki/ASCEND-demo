export type CardTier = "bronze" | "silver" | "gold" | "elite";
export type CardIntensity = "low" | "mid" | "high";
export type RivalColor = "blue" | "red" | "purple" | "green";
export type AthleticRating = "STR" | "PWR" | "END" | "CORE" | "ATH";
export type AthleticRatings = Record<AthleticRating, number>;
export type BodyArea =
  "Chest" | "Back" | "Shoulders" | "Arms" | "Core" | "Legs";
export type BodyRatings = Record<BodyArea, number>;
export type RecoveryState = "Ready" | "Moderate" | "Recovering";
export interface Player {
  name: string;
  ovr: number;
  ratings: AthleticRatings;
  bodyRatings: BodyRatings;
  archetype: string;
  tier: CardTier;
  intensity: CardIntensity;
}
export interface Rival {
  name: string;
  ovr: number;
  color: RivalColor;
}
