import type { BodyArea, Player, RecoveryState, Rival } from "@/types/domain";
export const player: Player = {
  name: "PLAYER",
  ovr: 58,
  ratings: { STR: 62, PWR: 55, END: 57, CORE: 61, ATH: 55 },
  bodyRatings: {
    Chest: 60,
    Back: 53,
    Shoulders: 57,
    Arms: 61,
    Core: 61,
    Legs: 56,
  },
  archetype: "ALL-ROUNDER",
  tier: "bronze",
  intensity: "high",
};
export const rival: Rival = { name: "RIVAL // 01", ovr: 59, color: "blue" };
export const season = {
  number: "01",
  wins: 2,
  losses: 1,
  nextMatch: "Saturday",
};
export const weekly = {
  completed: 2,
  target: 3,
  form: "GOOD",
  days: [
    { label: "M", state: "rest" },
    { label: "T", state: "complete" },
    { label: "W", state: "rest" },
    { label: "T", state: "complete" },
    { label: "F", state: "rest" },
    { label: "S", state: "match" },
    { label: "S", state: "rest" },
  ],
};
export const recovery: { area: BodyArea; state: RecoveryState }[] = [
  { area: "Chest", state: "Recovering" },
  { area: "Back", state: "Ready" },
  { area: "Shoulders", state: "Ready" },
  { area: "Arms", state: "Moderate" },
  { area: "Core", state: "Ready" },
  { area: "Legs", state: "Ready" },
];
export const creditBalance = 1250;
