import type { BodyArea, BodyRatings } from "./domain";
import type { BaselineAssessment } from "./coach";
import type { ActualResult } from "./session";
import type { MetricComparison } from "./records";
export type AssessmentStatus = "provisional" | "assessed";
export type RatingStatuses = Record<BodyArea, AssessmentStatus>;
export type Allocation = Partial<Record<BodyArea, number>>;
export interface RatingChange {
  area: BodyArea;
  before: number;
  after: number;
}
export interface GrowthEvent {
  id: string;
  kind: "assessment" | "growth" | "bonus";
  sessionId: string;
  setId: string | null;
  exerciseId: string | null;
  at: string;
  changes: RatingChange[];
  /** Normalized eligible allocation; also constrains a completed-workout bonus. */
  allocation: Allocation;
  metric: MetricComparison | null;
  actual: ActualResult | null;
}
export interface GrowthPlayer {
  id: string;
  initializedAt: string;
  rulesVersion: 1;
  baselineEvidence: BaselineAssessment[];
  initialRatings: BodyRatings;
  initialStatus: RatingStatuses;
  ratings: BodyRatings;
  status: RatingStatuses;
  /** Includes pre-initialization confirmed sets, without copying workout history. */
  processedSetIds: string[];
  finalizedSessionIds: string[];
  events: GrowthEvent[];
}
export interface PlayerData {
  version: 1;
  player: GrowthPlayer | null;
}
