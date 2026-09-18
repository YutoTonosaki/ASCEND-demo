import { trainingConfig as c } from "../config/training";
import type {
  Exercise,
  SetTarget,
  WorkoutExercise,
  WorkoutPlan,
  TrainingData,
} from "../types/training";
let sequence = 0;
export function newId(): string {
  return `${Date.now().toString(36)}-${(++sequence).toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
export function newTarget(exercise: Exercise): SetTarget {
  const id = newId();
  switch (exercise.trackingType) {
    case "time":
      return { id, type: "time", seconds: c.defaultSeconds };
    case "weight_reps":
      return {
        id,
        type: "weight_reps",
        reps: c.defaultReps,
        weightKg: c.defaultWeightKg,
      };
    case "reps":
      return { id, type: "reps", reps: c.defaultReps };
  }
}
export function newEntry(exercise: Exercise): WorkoutExercise {
  return {
    id: newId(),
    exerciseId: exercise.id,
    restSeconds: c.defaultRestSeconds,
    sets: Array.from({ length: c.defaultSets }, () => newTarget(exercise)),
  };
}
export function newWorkout(): WorkoutPlan {
  const now = new Date().toISOString();
  return {
    id: newId(),
    name: "",
    exercises: [],
    createdAt: now,
    updatedAt: now,
  };
}
/** Detached editing/snapshot copy; preserves all identity and target values. */
export function copyWorkoutPlan(plan: WorkoutPlan): WorkoutPlan {
  return { ...plan, exercises: plan.exercises.map(entry => ({
    ...entry, sets: entry.sets.map(set => ({ ...set })),
  })) };
}
export function copyExercise<T extends Exercise>(exercise: T): T {
  return { ...exercise, primaryBodyParts: [...exercise.primaryBodyParts],
    secondaryBodyParts: [...exercise.secondaryBodyParts], equipment: [...exercise.equipment] };
}
export function copyTrainingData(data: TrainingData): TrainingData {
  return { ...data, customExercises: data.customExercises.map(copyExercise),
    recentExerciseIds: [...data.recentExerciseIds], workouts: data.workouts.map(copyWorkoutPlan) };
}
export function duplicateWorkout(plan: WorkoutPlan): WorkoutPlan {
  return {
    ...newWorkout(),
    name: `${plan.name.slice(0, c.maxNameLength - 7)} (copy)`,
    exercises: plan.exercises.map((entry) => ({
      ...entry,
      id: newId(),
      sets: entry.sets.map((set) => ({ ...set, id: newId() })),
    })),
  };
}
export function targetLabel(set: SetTarget): string {
  return set.type === "time"
    ? `${set.seconds} sec`
    : set.type === "weight_reps"
      ? `${set.weightKg} kg × ${set.reps}`
      : `${set.reps} reps`;
}
export function moveEntry(
  entries: WorkoutExercise[],
  index: number,
  offset: number,
): WorkoutExercise[] {
  const next = [...entries];
  const to = index + offset;
  if (Number.isInteger(index) && Number.isInteger(offset) && index >= 0 && index < next.length && to >= 0 && to < next.length)
    [next[index], next[to]] = [next[to], next[index]];
  return next;
}
