import type { StorageAdapter } from "./index";
import type {
  CustomExercise,
  TrainingData,
  WorkoutPlan,
} from "../types/training";
import { isTrainingData } from "../training/validation";
import { normalizeTrainingData } from "./training-schema";
import {
  copyExercise,
  copyWorkoutPlan,
  copyTrainingData,
  newId,
} from "../training/plans";
import { trainingConfig } from "../config/training";
export const TRAINING_KEY = "ascend.training.v1";
export const emptyTrainingData = (): TrainingData => ({
  version: 1,
  customExercises: [],
  recentExerciseIds: [],
  workouts: [],
});
export type TrainingCommand =
  | { type: "saveExercise"; exercise: CustomExercise }
  | { type: "deleteExercise"; id: string }
  | { type: "recent"; id: string }
  | { type: "saveWorkout"; workout: WorkoutPlan }
  | { type: "deleteWorkout"; id: string };
export function applyCommand(
  data: TrainingData,
  command: TrainingCommand,
): TrainingData {
  let next: TrainingData;
  switch (command.type) {
    case "saveExercise": {
      const old = data.customExercises.find(
        (x) => x.id === command.exercise.id,
      );
      if (
        old &&
        old.trackingType !== command.exercise.trackingType &&
        data.workouts.some((w) =>
          w.exercises.some((x) => x.exerciseId === old.id),
        )
      )
        throw new Error(
          "This exercise is used in a saved workout. Remove it from those workouts before changing its tracking type.",
        );
      next = {
        ...data,
        customExercises: [
          ...data.customExercises.filter((x) => x.id !== command.exercise.id),
          command.exercise,
        ],
      };
      break;
    }
    case "deleteExercise":
      if (
        data.workouts.some((w) =>
          w.exercises.some((x) => x.exerciseId === command.id),
        )
      )
        throw new Error(
          "This exercise is used in a saved workout. Remove it from those workouts before deleting it.",
        );
      next = {
        ...data,
        customExercises: data.customExercises.filter(
          (x) => x.id !== command.id,
        ),
        recentExerciseIds: data.recentExerciseIds.filter(
          (x) => x !== command.id,
        ),
      };
      break;
    case "recent":
      next = {
        ...data,
        recentExerciseIds: [
          command.id,
          ...data.recentExerciseIds.filter((x) => x !== command.id),
        ].slice(0, trainingConfig.recentLimit),
      };
      break;
    case "saveWorkout":
      next = {
        ...data,
        workouts: [
          {
            ...command.workout,
            createdAt:
              data.workouts.find((workout) => workout.id === command.workout.id)
                ?.createdAt ?? command.workout.createdAt,
          },
          ...data.workouts.filter((x) => x.id !== command.workout.id),
        ],
      };
      break;
    case "deleteWorkout":
      next = {
        ...data,
        workouts: data.workouts.filter((x) => x.id !== command.id),
      };
      break;
  }
  if (!isTrainingData(next))
    throw new Error(
      "Please check the name, exercises and targets before saving.",
    );
  return next;
}
/** Serializes writes and publishes only after durable storage succeeds. Failed writes retain the prior state. */
export class TrainingRepository {
  private data: TrainingData | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private adapter: StorageAdapter<string>) {}
  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    const operation = this.queue.then(work);
    this.queue = operation.catch(() => undefined);
    return operation;
  }
  private backup(raw: string): Promise<void> {
    return this.adapter.write(
      `${TRAINING_KEY}.backup.${Date.now()}.${newId()}`,
      raw,
    );
  }
  load(): Promise<TrainingData> {
    return this.enqueue(async () => {
      // A failed reload must not permit subsequent writes from a stale memory copy.
      this.data = null;
      const raw = await this.adapter.read(TRAINING_KEY);
      if (raw === null) {
        this.data = emptyTrainingData();
        return copyTrainingData(this.data);
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new Error(
          "Saved training data could not be read. Your data has been kept unchanged.",
        );
      }
      const next = normalizeTrainingData(parsed);
      if (!next)
        throw new Error(
          "Saved training data is incompatible or damaged. Your data has been kept unchanged.",
        );
      if (JSON.stringify(next) !== JSON.stringify(parsed)) {
        // Back up first; a failed backup/write leaves the original untouched and retryable.
        await this.backup(raw);
        await this.adapter.write(TRAINING_KEY, JSON.stringify(next));
      }
      this.data = next;
      return copyTrainingData(next);
    });
  }
  commit(command: TrainingCommand): Promise<TrainingData> {
    // Capture at submission, before queued writes await storage or caller edits.
    const submitted: TrainingCommand =
      command.type === "saveWorkout"
        ? { ...command, workout: copyWorkoutPlan(command.workout) }
        : command.type === "saveExercise"
          ? { ...command, exercise: copyExercise(command.exercise) }
          : { ...command };
    return this.enqueue(async () => {
      if (!this.data)
        throw new Error("Training data has not loaded. Please retry.");
      const next = applyCommand(this.data, submitted);
      await this.adapter.write(TRAINING_KEY, JSON.stringify(next));
      this.data = next;
      return copyTrainingData(next);
    });
  }
  reset(): Promise<TrainingData> {
    return this.enqueue(async () => {
      const raw = await this.adapter.read(TRAINING_KEY);
      if (raw !== null) await this.backup(raw);
      const next = emptyTrainingData();
      await this.adapter.write(TRAINING_KEY, JSON.stringify(next));
      this.data = next;
      return copyTrainingData(next);
    });
  }
}
