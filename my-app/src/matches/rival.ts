import { clubs } from "../config/clubs";
import type { Club } from "../types/club";
export type Difficulty = "UNDERDOG" | "EVEN" | "CHALLENGER";
export interface CompletedMatchReference {
  id: string;
  resolvedAt: string;
  outcome: "WIN" | "DRAW" | "LOSS";
}
export const difficultyWeights = (wins: number): [
  number,
  number,
  number
] => wins >= 5 ? [15, 45, 40] : wins >= 3 ? [20, 50, 30] : [25, 50, 25];
export function recentMatches(history: CompletedMatchReference[]) {
  return [...history].sort((a, b) => b.resolvedAt.localeCompare(a.resolvedAt) || a.id.localeCompare(b.id)).slice(0, 5);
}
export function generationEvidence(history: (Omit<CompletedMatchReference, "outcome"> & {
  outcome: "WIN" | "DRAW" | "LOSS" | "SKIPPED";
})[]) {
  const completed = recentMatches(history.filter((m): m is CompletedMatchReference => m.outcome !== "SKIPPED"));
  const wins = completed.filter(m => m.outcome === "WIN").length;
  return { completedMatchIds: completed.map(m => m.id), wins, weights: difficultyWeights(wins) };
}
export function draw(weights: readonly number[], random: () => number) {
  const r = random();
  if (!Number.isFinite(r) || r < 0 || r >= 1)
    throw Error("Invalid Rival randomness.");
  let value = r * weights.reduce((sum, n) => sum + n, 0);
  for (let i = 0; i < weights.length; i++) {
    value -= weights[i];
    if (value < 0)
      return i;
  }
  throw Error("Invalid Rival distribution.");
}
export interface Rival {
  id: string;
  name: string;
  ovr: number;
  difference: number;
  condition: number;
  difficulty: Difficulty;
  club: Club;
  appearance: {
    version: 1;
    avatarVariant: number;
    kitColor: string;
  };
}
export function generateRival(matchId: string, baseline: number, weights: [
  number,
  number,
  number
], playerClubId: string, random: () => number): Rival {
  const category = draw(weights, random);
  const ranges = [[-6, -3], [-2, 2], [3, 6]];
  const [min, max] = ranges[category];
  const difference = min + draw(Array(max - min + 1).fill(1), random);
  const condition = 4 + draw([10, 15, 20, 20, 15, 10, 10], random);
  const names = ["Ren", "Kai", "Alex", "Noah", "Leo", "Haru", "Sam", "Rui"];
  const available = Object.values(clubs).filter(c => c.id !== playerClubId);
  const club = JSON.parse(JSON.stringify(available[draw(available.map(() => 1), random)])) as Club;
  return { id: JSON.stringify([matchId, "rival"]), name: names[draw(names.map(() => 1), random)],
    ovr: Math.max(0, Math.min(99, baseline + difference)), difference, condition,
    difficulty: (["UNDERDOG", "EVEN", "CHALLENGER"] as Difficulty[])[category], club,
    appearance: { version: 1, avatarVariant: draw([1, 1, 1, 1], random), kitColor: club.primaryColor } };
}
