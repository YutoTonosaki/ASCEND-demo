import type { Club, ClubReputationLevel, LeagueId } from "@/types/club";

export const leagues: Record<
  LeagueId,
  { readonly country: string; readonly label: string }
> = {
  JAPAN: { country: "Japan", label: "Japan" },
  ENGLAND: { country: "England", label: "England" },
  SPAIN: { country: "Spain", label: "Spain" },
  GERMANY: { country: "Germany", label: "Germany" },
  ITALY: { country: "Italy", label: "Italy" },
  FRANCE: { country: "France", label: "France" },
};
/** Draft narrative labels, not a linear country ladder or finalized balancing. */
export const clubReputationLevels: Record<ClubReputationLevel, string> = {
  1: "Development",
  2: "Growing competitive",
  3: "Established",
  4: "High-level",
  5: "Elite",
};
/** Phase 1 catalog: one fictional club. Additional league content is intentionally deferred. */
export const clubs: Readonly<Record<string, Club>> = {
  "tokyo-zenith": {
    id: "tokyo-zenith",
    name: "Tokyo Zenith",
    shortName: "TZ",
    league: "JAPAN",
    country: "Japan",
    crest: {
      viewBox: "0 0 40 44",
      outlinePath: "M20 2 36 11v22L20 42 4 33V11Z",
      markPath: "M11 13h18v4L17 27h12v4H11v-4l12-10H11Z M18 6h4v3h-4Z",
    },
    primaryColor: "#e6af7e",
    secondaryColor: "#252a32",
    reputation: 1,
    recommendedOVR: 45,
    preferredArchetypes: ["ALL-ROUNDER"],
    preferredAttributes: ["ATH", "END"],
    description:
      "A Tokyo club built on versatile athletes, patient development, and lasting commitment.",
  },
};
