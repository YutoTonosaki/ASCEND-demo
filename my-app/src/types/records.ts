import type { ActualResult } from "./session";
import type { TrackingType } from "./training";

export interface RecordSource {
  sessionId: string;
  entryId: string;
  setId: string;
  confirmedAt: string;
  actual: ActualResult;
}
export interface RecordBest {
  value: number;
  source: RecordSource;
}
export interface ExerciseRecord {
  exerciseId: string;
  /** Latest eligible snapshot name, never an identity key. */
  name: string;
  trackingType: TrackingType;
  /** Reps, seconds, or kg according to trackingType. */
  best: RecordBest;
  /** Independent repetition records for each exact recorded kg value. */
  byWeight: { weightKg: number; best: RecordBest }[];
}
export interface MetricComparison {
  metric: "reps" | "seconds" | "weightKg" | "repsAtWeight";
  weightKg?: number;
  previous: number | null;
  value: number;
  outcome: "first" | "improved" | "maintained";
  relation: "first" | "higher" | "equal" | "lower";
}
export interface SetRecordComparison {
  exerciseId: string;
  trackingType: TrackingType;
  source: RecordSource;
  previous: ExerciseRecord | null;
  current: ExerciseRecord;
  metrics: MetricComparison[];
}
export interface PersonalRecords {
  records: ExerciseRecord[];
  comparisons: SetRecordComparison[];
  rejectedSessions: number;
}
