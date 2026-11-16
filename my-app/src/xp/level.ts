import type { LevelProgress } from "./types";

function validLevel(level: number) {
  if (!Number.isSafeInteger(level) || level < 1) throw new RangeError("Invalid Level");
}
export function xpForNextLevel(level: number): bigint {
  validLevel(level);
  return 100n + 25n * (BigInt(level) - 1n);
}
function threshold(level: bigint): bigint {
  const n = level - 1n;
  return 100n * n + 25n * n * (n - 1n) / 2n;
}
export function cumulativeXPForLevel(level: number): bigint {
  validLevel(level);
  return threshold(BigInt(level));
}
/** Exact binary search, including next thresholds beyond Number.MAX_SAFE_INTEGER. */
export function levelProgress(totalXP: number): LevelProgress {
  if (!Number.isSafeInteger(totalXP) || totalXP < 0) throw new RangeError("Invalid total XP");
  const total = BigInt(totalXP);
  let low = 1n;
  let high = 2n;
  while (threshold(high) <= total) high *= 2n;
  while (high - low > 1n) {
    const middle = (low + high) / 2n;
    if (threshold(middle) <= total) low = middle;
    else high = middle;
  }
  const xpAtLevel = threshold(low);
  const xpAtNextLevel = threshold(low + 1n);
  return { level: Number(low), totalXP, xpAtLevel, xpAtNextLevel,
    xpIntoLevel: Number(total - xpAtLevel),
    xpRequired: Number(xpAtNextLevel - xpAtLevel),
    xpRemaining: Number(xpAtNextLevel - total) };
}
