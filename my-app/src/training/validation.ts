import {
  bodyParts,
  categories,
  equipmentOptions,
  trackingLabels,
  trainingConfig as c,
} from "../config/training";
import { standardExercises } from "../data/exercises";
import type {
  CustomExercise,
  SetTarget,
  TrainingData,
  WorkoutPlan,
  Exercise,
} from "../types/training";
const object = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0 && v.length <= c.maxNameLength;
const id = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0 && v === v.trim() && v.length <= 150;
const number = (
  v: unknown,
  min: number,
  max: number,
  integer = true,
): v is number =>
  typeof v === "number" &&
  Number.isFinite(v) &&
  v >= min &&
  v <= max &&
  (!integer || Number.isInteger(v));
function list(v: unknown, options: readonly string[], min = 0): v is string[] {
  return (
    Array.isArray(v) &&
    v.length >= min &&
    v.every((x) => typeof x === "string" && options.includes(x)) &&
    new Set(v).size === v.length
  );
}
function unique(items: { id: string }[]) {
  return new Set(items.map((x) => x.id)).size === items.length;
}
export function isExercise(v: unknown): v is Exercise {
  return (
    object(v) &&
    id(v.id) &&
    text(v.name) &&
    (v.isCustom === true
      ? v.id.startsWith("custom-") && v.difficulty === null && v.progressionFamily === null
      : v.isCustom === false && number(v.difficulty, Number.MIN_VALUE, Number.MAX_VALUE, false) &&
        (v.progressionFamily === null || text(v.progressionFamily))) &&
    list(v.primaryBodyParts, bodyParts, 1) &&
    list(v.secondaryBodyParts, bodyParts) &&
    !v.secondaryBodyParts.some((x) =>
      (v.primaryBodyParts as string[]).includes(x),
    ) &&
    list(v.equipment, equipmentOptions, 1) &&
    typeof v.category === "string" &&
    categories.some((x) => x === v.category) &&
    typeof v.trackingType === "string" &&
    Object.hasOwn(trackingLabels, v.trackingType)
  );
}
export function isCustomExercise(v: unknown): v is CustomExercise {
  return isExercise(v) && v.isCustom;
}
function isTarget(v: unknown, exercise: Exercise): v is SetTarget {
  if (!object(v) || !id(v.id) || v.type !== exercise.trackingType) return false;
  return v.type === "time"
    ? number(v.seconds, 1, c.maxSeconds)
    : number(v.reps, 1, c.maxReps) &&
        (v.type === "reps" || number(v.weightKg, 0, c.maxWeightKg, false));
}
export function isWorkout(v: unknown, library: Exercise[]): v is WorkoutPlan {
  if (
    !object(v) ||
    !id(v.id) ||
    !text(v.name) ||
    typeof v.createdAt !== "string" ||
    !Number.isFinite(Date.parse(v.createdAt)) ||
    typeof v.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(v.updatedAt)) ||
    !Array.isArray(v.exercises) ||
    v.exercises.length < 1 ||
    v.exercises.length > c.maxExercises
  )
    return false;
  const valid = v.exercises.every((entry) => {
    if (
      !object(entry) ||
      !id(entry.id) ||
      !number(entry.restSeconds, 0, c.maxRestSeconds) ||
      !Array.isArray(entry.sets) ||
      entry.sets.length < 1 ||
      entry.sets.length > c.maxSets
    )
      return false;
    const exercise = library.find((x) => x.id === entry.exerciseId);
    return (
      exercise !== undefined &&
      entry.sets.every((set) => isTarget(set, exercise)) &&
      unique(entry.sets as SetTarget[])
    );
  });
  return valid && unique(v.exercises as { id: string }[]);
}
export function isTrainingData(v: unknown): v is TrainingData {
  if (
    !object(v) ||
    v.version !== 1 ||
    !Array.isArray(v.customExercises) ||
    !v.customExercises.every(isCustomExercise) ||
    !unique(v.customExercises) ||
    !Array.isArray(v.workouts)
  )
    return false;
  const library = [...standardExercises, ...v.customExercises];
  return (
    v.workouts.every((w) => isWorkout(w, library)) &&
    unique(v.workouts as WorkoutPlan[]) &&
    list(
      v.recentExerciseIds,
      library.map((x) => x.id),
    ) &&
    v.recentExerciseIds.length <= c.recentLimit
  );
}
