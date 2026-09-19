import type { Exercise, SetTarget } from "./training";
export type ActualResult =
  | { type: "reps"; reps: number }
  | { type: "weight_reps"; reps: number; weightKg: number }
  | { type: "time"; seconds: number };
export interface SessionSet {
  id: string;
  target: SetTarget;
  result: { actual: ActualResult; confirmedAt: string } | null;
}
export interface SessionExercise {
  id: string;
  exercise: Exercise;
  restSeconds: number;
  sets: SessionSet[];
}
interface SessionSnapshot {
  id: string;
  sourceWorkoutId: string;
  name: string;
  startedAt: string;
  exercises: SessionExercise[];
}
export type WorkoutSession = SessionSnapshot &
  (
    | { status: "active"; completedAt: null; restUntil: string | null }
    | { status: "completed"; completedAt: string; restUntil: null }
  );
export interface SessionData {
  version: 1;
  active: WorkoutSession | null;
  completed: WorkoutSession[];
}
