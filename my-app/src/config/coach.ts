import type {
  ExperienceLevel,
  TrainingGoal,
  TrainingLocation,
} from "../types/coach";
export const experienceLabels: Record<ExperienceLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};
export const goalLabels: Record<TrainingGoal, string> = {
  strength: "Build strength",
  muscle: "Build muscle",
  fitness: "General fitness",
};
export const locationLabels: Record<TrainingLocation, string> = {
  home: "Home",
  gym: "Gym",
  both: "Both",
};
// Product heuristics, not clinical thresholds or strength/fitness measurements.
export const coachConfig = {
  defaultMinutes: 8,
  defaultCount: 3,
  maxMinutes: 120,
  maxCount: 10,
  recentHours: 48,
  evidenceDays: 90,
  secondsPerRep: 4,
  transitionSeconds: 20,
  difficultyCeiling: { beginner: 1, intermediate: 1.5, advanced: 2 },
  rest: { strength: 90, muscle: 75, fitness: 60 },
  initialBodyweight: [
    "push-up",
    "squat",
    "plank",
    "glute-bridge",
    "dead-bug",
    "calf-raise",
    "crunch",
  ],
  initialReps: 6,
  initialSeconds: 15,
  baselineIds: ["push-up", "squat", "plank"],
} as const;
