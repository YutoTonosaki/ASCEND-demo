import type { AthleticRating } from "./domain";

export type LeagueId =
  "JAPAN" | "ENGLAND" | "SPAIN" | "GERMANY" | "ITALY" | "FRANCE";
export type ClubReputationLevel = 1 | 2 | 3 | 4 | 5;
/** ISO calendar date (YYYY-MM-DD). Validation belongs at a future storage boundary. */
export type CareerDate = string;
export type ClubRole =
  "PROSPECT" | "ROTATION" | "STARTER" | "KEY_PLAYER" | "CLUB_ICON";
export type ClubInterestState =
  "LOCKED" | "SCOUTING" | "MONITORING" | "INTERESTED" | "OFFER_RECEIVED";
export type TransferOfferState =
  "OFFER_RECEIVED" | "ACCEPTED" | "REJECTED" | "EXPIRED";
export type TransferDecision = "ACCEPT" | "REJECT" | "STAY";
export type TransferWindowKind = "SEASON_END" | "SPECIAL_MID_SEASON";

/** Original vector geometry, not an official crest or remote asset. */
export interface ClubCrest {
  readonly viewBox: string;
  readonly outlinePath: string;
  readonly markPath: string;
}
/** Copy these fields into historical records; never render history by live catalog lookup. */
export interface ClubIdentity {
  readonly id: string;
  readonly name: string;
  readonly shortName: string;
  readonly league: LeagueId;
  readonly country: string;
  readonly crest: ClubCrest;
  readonly primaryColor: string;
  readonly secondaryColor: string;
}
export interface Club extends ClubIdentity {
  readonly reputation: ClubReputationLevel;
  /** Illustrative expectation, never a hard eligibility lock or rating bonus. */
  readonly recommendedOVR: number;
  readonly preferredArchetypes: readonly string[];
  readonly preferredAttributes: readonly AthleticRating[];
  readonly description: string;
}
export interface ClubTenure {
  readonly id: string;
  readonly club: ClubIdentity;
  readonly joinedAt: CareerDate;
  readonly leftAt: CareerDate | null;
}
export interface CareerTransfer {
  readonly id: string;
  readonly offerId: string;
  readonly fromClub: ClubIdentity;
  readonly toClub: ClubIdentity;
  readonly decidedAt: CareerDate;
  readonly effectiveAt: CareerDate;
}
export interface TransferOffer {
  readonly id: string;
  readonly club: ClubIdentity;
  readonly offeredRole: ClubRole;
  readonly state: TransferOfferState;
  readonly windowKind: TransferWindowKind;
  readonly offeredAt: CareerDate;
  readonly expiresAt: CareerDate | null;
}
/** Separate from Player physical ratings. Contracts only: no persistence or simulation. */
export interface PlayerClubCareer {
  readonly currentClubId: string | null;
  readonly clubJoinedAt: CareerDate | null;
  readonly previousClubs: readonly ClubTenure[];
  readonly careerTransfers: readonly CareerTransfer[];
  /** Player standing at this club; scale/calculation TBD, not the catalog's reputation tier. */
  readonly clubReputation: {
    readonly clubId: string;
    readonly standing: number | null;
  } | null;
  readonly role: ClubRole | null;
  readonly transferOffers: readonly TransferOffer[];
}
/** Attach to the future immutable Season Card, alongside its rating snapshot. */
export interface SeasonClubSnapshot {
  readonly seasonId: string;
  readonly clubAtSeasonEnd: ClubIdentity;
  /** Preserve every tenure if special mid-season transfers are added later. */
  readonly representedClubs: readonly ClubTenure[];
}
