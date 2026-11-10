import { bodyParts } from "../config/training";
import { overall } from "./domain";
import type { GrowthPlayer } from "../types/growth";

/** Decimal text avoids multiplying binary floats (e.g. 0.29 * 100 < 29). */
export function truncateRating(value: number): string {
  if (!Number.isFinite(value) || value < 0 || value > 99) {
    throw new Error("Expected a finite rating in 0–99");
  }
  if (value < 0.01) return "0.00";
  const [integer, fraction = ""] = String(value).split(".");
  return `${integer}.${fraction.padEnd(2, "0").slice(0, 2)}`;
}

/** Presentation-only derivation from saved values. OVR remains authoritative. */
export function ratingDetails(player: Pick<GrowthPlayer, "ratings" | "status">) {
  const regions = bodyParts.map(area => {
    const status = player.status[area];
    if (status !== "provisional" && status !== "assessed") {
      throw new Error("Unknown assessment status");
    }
    return { area, value: player.ratings[area], formatted: truncateRating(player.ratings[area]), status };
  });
  const mean = bodyParts.reduce((sum, area) => sum + player.ratings[area], 0) / bodyParts.length;
  const ovr = overall(player.ratings);
  const nextOVR = ovr === 99 ? null : ovr + 1;
  const remaining = nextOVR === null ? null : nextOVR - mean;
  return {
    regions, mean, meanFormatted: truncateRating(mean), ovr, nextOVR, remaining,
    remainingFormatted: remaining === null || remaining < 0.01 ? null : remaining.toFixed(2),
    provisionalCount: regions.filter(region => region.status === "provisional").length,
  };
}
