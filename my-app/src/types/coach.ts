import type { BodyArea } from "./domain";
import type { Equipment, Exercise } from "./training";
import type { ActualResult } from "./session";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type TrainingGoal = "strength" | "muscle" | "fitness";
export type TrainingLocation = "home" | "gym" | "both";
export interface BaselineAssessment {
  exercise: Exercise;
  actual: ActualResult;
  source: "performed" | "known";
  recordedAt: string;
}
export interface TrainingProfile {
  id: string;
  heightCm: number | null;
  weightKg: number | null;
  experienceLevel: ExperienceLevel;
  primaryGoal: TrainingGoal;
  preferredLocation: TrainingLocation;
  availableEquipment: Equipment[];
  preferredDurationMinutes: number;
  preferredExerciseCount: number;
  preferredTrainingDaysPerWeek: number | null;
  baselineAssessments: BaselineAssessment[];
  createdAt: string;
  updatedAt: string;
}
export interface CoachData {
  version: 1;
  profile: TrainingProfile | null;
}
export interface CoachPreferences {
  location: TrainingLocation;
  equipment: Equipment[];
  durationMinutes: number;
  exerciseCount: number;
  bodyParts: BodyArea[];
  /** Explicit opt-in; null difficulty never implies suitability. */
  customExerciseIds: string[];
}
export type SuggestedTarget =
  ActualResult | { type: "weight_reps"; reps: number; weightKg: null };
export interface RecommendedExercise {
  exercise: Exercise;
  targets: SuggestedTarget[];
  restSeconds: number;
  evidence: "session" | "baseline" | "initial" | "confirmation";
  explanation: string;
}
export type WorkoutRecommendation =
  | { status: "blocked"; reason: string }
  | {
      status: "ready";
      name: string;
      exercises: RecommendedExercise[];
      estimatedSeconds: number;
      explanations: string[];
    };
