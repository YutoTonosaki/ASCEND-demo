import type { BodyArea } from "./domain";
export type Equipment =
  | "Bodyweight"
  | "Pull-up Bar"
  | "Low Bar"
  | "Dumbbell"
  | "Barbell"
  | "Bench"
  | "Cable"
  | "Machine"
  | "Resistance Band"
  | "Other";
export type ExerciseCategory =
  "Strength" | "Power" | "Endurance" | "Core" | "Athletic";
export type TrackingType = "reps" | "weight_reps" | "time";
interface ExerciseMetadata {
  id: string;
  name: string;
  primaryBodyParts: BodyArea[];
  secondaryBodyParts: BodyArea[];
  category: ExerciseCategory;
  equipment: Equipment[];
  trackingType: TrackingType;
  progressionFamily: string | null;
}
/** One shared model; only origin and difficulty policy are discriminated. */
export type Exercise = ExerciseMetadata &
  (
    | { isCustom: false; difficulty: number }
    | { isCustom: true; difficulty: null }
  );
export type CustomExercise = Extract<Exercise, { isCustom: true }>;
/** Planned targets only. Actual performance belongs to a separate future session record. */
export type SetTarget = { id: string } & (
  | { type: "reps"; reps: number }
  | { type: "weight_reps"; reps: number; weightKg: number }
  | { type: "time"; seconds: number }
);
export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  restSeconds: number;
  /** Array position is set order; IDs survive edits and reordering. */
  sets: SetTarget[];
}
export interface WorkoutPlan {
  id: string;
  name: string;
  /** Array position is exercise order; no redundant order field to drift. */
  exercises: WorkoutExercise[];
  createdAt: string;
  updatedAt: string;
}
export interface TrainingData {
  version: 1;
  customExercises: CustomExercise[];
  recentExerciseIds: string[];
  workouts: WorkoutPlan[];
}
