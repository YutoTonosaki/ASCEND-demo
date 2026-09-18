import { trainingConfig } from "../config/training";
import { standardExercises } from "../data/exercises";
import { isTrainingData } from "../training/validation";
import type { TrainingData } from "../types/training";

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Version 1 stays compatible with Phase 2A. Only non-performance defaults and
 * the derived Recent cache may be repaired. Never invent IDs, targets or dates.
 * Future incompatible versions need an explicit migration here before validation.
 */
export function normalizeTrainingData(value: unknown): TrainingData | null {
  if (!record(value) || value.version !== 1 || !Array.isArray(value.customExercises)) return null;
  const customExercises = value.customExercises.map(exercise => {
    if (!record(exercise) || exercise.isCustom !== true) return exercise;
    return {
      ...exercise,
      secondaryBodyParts: exercise.secondaryBodyParts === undefined ? [] : exercise.secondaryBodyParts,
      difficulty: exercise.difficulty === undefined ? null : exercise.difficulty,
      progressionFamily: exercise.progressionFamily === undefined ? null : exercise.progressionFamily,
    };
  });
  const ids = new Set<unknown>([
    ...standardExercises.map(exercise => exercise.id),
    ...customExercises.filter(record).map(exercise => exercise.id),
  ]);
  const recent = value.recentExerciseIds === undefined ? [] : value.recentExerciseIds;
  const recentExerciseIds = Array.isArray(recent) && recent.every(id => typeof id === "string")
    ? [...new Set(recent)].filter(id => ids.has(id)).slice(0, trainingConfig.recentLimit)
    : recent;
  const candidate = { ...value, customExercises, recentExerciseIds };
  return isTrainingData(candidate) ? candidate : null;
}
