import type { StorageAdapter } from "./index";
import type {
  CustomExercise,
  TrainingData,
  WorkoutPlan,
} from "../types/training";
import { isTrainingData } from "../training/validation";
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
          command.workout,
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
  async load(): Promise<TrainingData> {
    const raw = await this.adapter.read(TRAINING_KEY);
    if (raw === null) return (this.data = emptyTrainingData());
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(
        "Saved training data could not be read. Your data has been kept unchanged.",
      );
    }
    if (!isTrainingData(parsed))
      throw new Error(
        "Saved training data is incompatible or damaged. Your data has been kept unchanged.",
      );
    return (this.data = parsed);
  }
  commit(command: TrainingCommand): Promise<TrainingData> {
    const operation = this.queue.then(async () => {
      if (!this.data)
        throw new Error("Training data has not loaded. Please retry.");
      const next = applyCommand(this.data, command);
      await this.adapter.write(TRAINING_KEY, JSON.stringify(next));
      this.data = next;
      return next;
    });
    this.queue = operation.catch(() => undefined);
    return operation;
  }
  async reset(): Promise<TrainingData> {
    await this.queue;
    const raw = await this.adapter.read(TRAINING_KEY);
    if (raw !== null)
      await this.adapter.write(`${TRAINING_KEY}.backup.${Date.now()}`, raw);
    const next = emptyTrainingData();
    await this.adapter.write(TRAINING_KEY, JSON.stringify(next));
    return (this.data = next);
  }
}
