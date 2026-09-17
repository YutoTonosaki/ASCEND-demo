import type { BodyArea } from "../types/domain";
import type {
  Equipment,
  ExerciseCategory,
  TrackingType,
} from "../types/training";
export const bodyParts: BodyArea[] = [
  "Chest",
  "Back",
  "Shoulders",
  "Arms",
  "Core",
  "Legs",
];
export const equipmentOptions: Equipment[] = [
  "Bodyweight",
  "Pull-up Bar",
  "Dumbbell",
  "Barbell",
  "Bench",
  "Cable",
  "Machine",
  "Resistance Band",
  "Other",
];
export const categories: ExerciseCategory[] = [
  "Strength",
  "Power",
  "Endurance",
  "Core",
  "Athletic",
];
export const trackingLabels: Record<TrackingType, string> = {
  reps: "Reps",
  weight_reps: "Weight + Reps",
  time: "Time",
};
export const trainingConfig = {
  defaultSets: 3,
  defaultReps: 12,
  defaultWeightKg: 0,
  defaultSeconds: 45,
  defaultRestSeconds: 90,
  recentLimit: 6,
  maxSets: 20,
  maxExercises: 30,
  maxReps: 999,
  maxWeightKg: 1000,
  maxSeconds: 7200,
  maxRestSeconds: 900,
  maxNameLength: 80,
} as const;
