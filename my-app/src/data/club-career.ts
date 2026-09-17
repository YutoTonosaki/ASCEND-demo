import { clubs } from "@/config/clubs";
import type { PlayerClubCareer } from "@/types/club";

export const clubCareer: PlayerClubCareer = {
  currentClubId: "tokyo-zenith",
  clubJoinedAt: "2026-09-01",
  previousClubs: [],
  careerTransfers: [],
  clubReputation: { clubId: "tokyo-zenith", standing: null },
  role: null,
  transferOffers: [],
};
export const currentClub = clubCareer.currentClubId
  ? clubs[clubCareer.currentClubId]
  : undefined;
/** Explicit locale/time zone keeps a calendar date stable across device time zones. */
export const clubJoinedLabel = clubCareer.clubJoinedAt
  ? new Intl.DateTimeFormat("en-US", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${clubCareer.clubJoinedAt}T00:00:00Z`))
  : undefined;
