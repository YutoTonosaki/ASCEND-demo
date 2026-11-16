/** Offset uses Date.getTimezoneOffset semantics: UTC minus local, in minutes. */
export interface XPCompletionDay {
  localDay: string;
  offsetMinutes: number;
}
export interface XPActivation {
  /** Inclusive UTC instant. Caller must retain this boundary durably in XP-2. */
  activatedAt: string;
  excludedSessionIds: readonly string[];
}
export interface XPSessionInput {
  session: unknown;
  /** Required only for completed sessions within the activation scope. */
  completionDay: XPCompletionDay | null;
}
export interface DailyXP {
  localDay: string;
  eligibleSetIds: string[];
  eligibleSetCount: number;
  entitlement: number;
  previouslyAwarded: number;
  incrementalXP: number;
  awardId: string;
}
export interface LevelProgress {
  level: number;
  totalXP: number;
  xpAtLevel: bigint;
  xpAtNextLevel: bigint;
  xpIntoLevel: number;
  xpRequired: number;
  xpRemaining: number;
}
