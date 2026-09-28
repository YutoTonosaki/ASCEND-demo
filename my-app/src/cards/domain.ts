import type { CardTier, CardIntensity } from "../types/domain";
export type CardFinish = "standard" | "high";
const tiers: { tier: CardTier; minimum: number }[] = [
  { tier: "bronze", minimum: 0 },
  { tier: "silver", minimum: 60 },
  { tier: "gold", minimum: 75 },
  { tier: "elite", minimum: 90 },
  { tier: "ascend", minimum: 99 },
];
function validOVR(ovr: number) {
  if (!Number.isInteger(ovr) || ovr < 0 || ovr > 99)
    throw new Error("Expected displayed OVR 0–99");
}
export function deriveCardTier(ovr: number): CardTier {
  validOVR(ovr);
  return [...tiers].reverse().find((t) => ovr >= t.minimum)!.tier;
}
export function deriveCardFinish(ovr: number): CardFinish {
  validOVR(ovr);
  return ovr >= 50 && ovr < 60 ? "high" : "standard";
}
export function cardAppearance(ovr: number) {
  const tier = deriveCardTier(ovr),
    finish = deriveCardFinish(ovr);
  const intensity: CardIntensity =
    tier === "bronze"
      ? finish === "high"
        ? "high"
        : "low"
      : tier === "silver"
        ? "mid"
        : "high";
  const index = tiers.findIndex((t) => t.tier === tier);
  return { tier, finish, intensity, next: tiers[index + 1] ?? null };
}
export function cardEvolution(before: number, after: number) {
  const from = deriveCardTier(before),
    to = deriveCardTier(after);
  return after > before && from !== to ? { from, to, ovr: after } : null;
}
