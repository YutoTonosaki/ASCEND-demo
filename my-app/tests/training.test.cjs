const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  TrainingRepository,
  TRAINING_KEY,
  emptyTrainingData,
  applyCommand,
} = require("../src/storage/training-repository.ts");
const { standardExercises } = require("../src/data/exercises.ts");
const {
  newWorkout,
  newEntry,
  duplicateWorkout,
  moveEntry,
} = require("../src/training/plans.ts");
const { isTrainingData, isWorkout } = require("../src/training/validation.ts");
const {
  trainingConfig,
  bodyParts,
  equipmentOptions,
} = require("../src/config/training.ts");
const custom = {
  ...standardExercises[0],
  id: "custom-test",
  name: "My push-up",
  isCustom: true,
  difficulty: null,
  progressionFamily: null,
};
function plan(exercises = [standardExercises[0]]) {
  return {
    ...newWorkout(),
    name: "Push day",
    exercises: exercises.map(newEntry),
  };
}
function memory(initial) {
  const values = new Map(
    initial === undefined ? [] : [[TRAINING_KEY, initial]],
  );
  return {
    values,
    read: async (k) => values.get(k) ?? null,
    write: async (k, v) => {
      values.set(k, v);
    },
    remove: async (k) => {
      values.delete(k);
    },
  };
}
test("library covers body areas, equipment and tracking models with stable unique IDs", () => {
  assert.ok(standardExercises.length >= 30 && standardExercises.length <= 50);
  assert.equal(
    new Set(standardExercises.map((x) => x.id)).size,
    standardExercises.length,
  );
  for (const part of bodyParts)
    assert.ok(standardExercises.some((e) => e.primaryBodyParts.includes(part)));
  for (const equipment of equipmentOptions.filter((x) => x !== "Other"))
    assert.ok(standardExercises.some((e) => e.equipment.includes(equipment)));
  for (const type of ["reps", "weight_reps", "time"]) {
    const exercise = standardExercises.find((x) => x.trackingType === type);
    const workout = plan([exercise]);
    assert.ok(isWorkout(workout, standardExercises));
    assert.equal(workout.exercises[0].sets[0].type, type);
  }
});
test("custom exercises remain unrated; referenced delete/tracking changes are prevented", () => {
  let state = applyCommand(emptyTrainingData(), {
    type: "saveExercise",
    exercise: custom,
  });
  assert.throws(() =>
    applyCommand(state, {
      type: "saveExercise",
      exercise: { ...custom, difficulty: 1 },
    }),
  );
  state = applyCommand(state, { type: "saveWorkout", workout: plan([custom]) });
  assert.throws(
    () => applyCommand(state, { type: "deleteExercise", id: custom.id }),
    /used in a saved workout/,
  );
  assert.throws(
    () =>
      applyCommand(state, {
        type: "saveExercise",
        exercise: { ...custom, trackingType: "time" },
      }),
    /tracking type/,
  );
  state = applyCommand(state, {
    type: "saveExercise",
    exercise: { ...custom, name: "Renamed" },
  });
  assert.equal(state.customExercises[0].name, "Renamed");
  state = applyCommand(state, {
    type: "deleteWorkout",
    id: state.workouts[0].id,
  });
  state = applyCommand(state, { type: "recent", id: custom.id });
  state = applyCommand(state, { type: "deleteExercise", id: custom.id });
  assert.equal(state.customExercises.length, 0);
  assert.equal(state.recentExerciseIds.length, 0);
});
test("duplicate is a deep independent plan with fresh plan, exercise and set IDs", () => {
  const original = plan();
  const copy = duplicateWorkout(original);
  assert.notEqual(copy.id, original.id);
  assert.notEqual(copy.exercises[0].id, original.exercises[0].id);
  assert.notEqual(
    copy.exercises[0].sets[0].id,
    original.exercises[0].sets[0].id,
  );
  copy.exercises[0].sets[0].reps = 99;
  assert.equal(original.exercises[0].sets[0].reps, 12);
});
test("targets stay set-specific and preserve values through ordering", () => {
  const workout = plan(standardExercises.slice(0, 2));
  workout.exercises[0].sets[1].reps = 10;
  const moved = moveEntry(workout.exercises, 0, 1);
  assert.equal(moved[1].sets[1].reps, 10);
  assert.equal(workout.exercises[0].sets[1].reps, 10);
  assert.ok(!("actual" in moved[1].sets[0]));
});
test("validation rejects broken references, invalid targets, duplicates and future schemas", () => {
  const state = { ...emptyTrainingData(), workouts: [plan()] };
  assert.ok(isTrainingData(state));
  assert.equal(isTrainingData({ ...state, version: 2 }), false);
  const broken = structuredClone(state);
  broken.workouts[0].exercises[0].exerciseId = "missing";
  assert.equal(isTrainingData(broken), false);
  const invalid = structuredClone(state);
  invalid.workouts[0].exercises[0].sets[0].reps = -1;
  assert.equal(isTrainingData(invalid), false);
  const mismatch = structuredClone(state);
  mismatch.workouts[0].exercises[0].sets[0] = {
    id: "set",
    type: "time",
    seconds: 45,
  };
  assert.equal(isTrainingData(mismatch), false);
  assert.equal(
    isTrainingData({
      ...state,
      workouts: [state.workouts[0], state.workouts[0]],
    }),
    false,
  );
});
test("repository round-trip persists full targets, recent selections and edits", async () => {
  const adapter = memory();
  const repo = new TrainingRepository(adapter);
  await repo.load();
  await repo.commit({ type: "saveExercise", exercise: custom });
  const workout = plan([
    custom,
    standardExercises.find((x) => x.id === "bench-press"),
    standardExercises.find((x) => x.id === "plank"),
  ]);
  workout.exercises[1].sets[0].weightKg = 50;
  await repo.commit({ type: "saveWorkout", workout });
  for (const exercise of standardExercises.slice(0, 9))
    await repo.commit({ type: "recent", id: exercise.id });
  await repo.commit({ type: "recent", id: standardExercises[4].id });
  const restored = await new TrainingRepository(adapter).load();
  assert.deepEqual(restored.workouts[0], workout);
  assert.equal(restored.recentExerciseIds.length, trainingConfig.recentLimit);
  assert.equal(restored.recentExerciseIds[0], standardExercises[4].id);
  assert.equal(
    new Set(restored.recentExerciseIds).size,
    trainingConfig.recentLimit,
  );
});
test("serialized concurrent writes do not lose data; a failed write does not publish state", async () => {
  const adapter = memory();
  const repo = new TrainingRepository(adapter);
  await repo.load();
  await Promise.all([
    repo.commit({ type: "saveWorkout", workout: plan() }),
    repo.commit({ type: "saveWorkout", workout: plan() }),
  ]);
  assert.equal(
    (await new TrainingRepository(adapter).load()).workouts.length,
    2,
  );
  const originalWrite = adapter.write;
  adapter.write = async () => {
    throw new Error("disk full");
  };
  await assert.rejects(
    repo.commit({ type: "saveExercise", exercise: custom }),
    /disk full/,
  );
  adapter.write = originalWrite;
  const after = await repo.commit({ type: "recent", id: "push-up" });
  assert.equal(after.customExercises.length, 0);
  assert.equal(after.workouts.length, 2);
});
test("corrupted data is preserved; explicit reset backs up before replacing", async () => {
  for (const raw of ["{broken", JSON.stringify({ version: 999 })]) {
    const adapter = memory(raw);
    const repo = new TrainingRepository(adapter);
    await assert.rejects(repo.load());
    assert.equal(adapter.values.get(TRAINING_KEY), raw);
    await assert.rejects(repo.commit({ type: "recent", id: "push-up" }));
    await repo.reset();
    assert.ok(
      [...adapter.values.entries()].some(
        ([key, value]) =>
          key.startsWith(TRAINING_KEY + ".backup.") && value === raw,
      ),
    );
    assert.deepEqual(await repo.load(), emptyTrainingData());
  }
});
test("storage read and backup failures never overwrite existing data", async () => {
  const adapter = memory("bad");
  const repo = new TrainingRepository(adapter);
  adapter.read = async () => {
    throw new Error("unavailable");
  };
  await assert.rejects(repo.load(), /unavailable/);
  adapter.read = async (k) => adapter.values.get(k) ?? null;
  adapter.write = async () => {
    throw new Error("full");
  };
  await assert.rejects(repo.reset(), /full/);
  assert.equal(adapter.values.get(TRAINING_KEY), "bad");
});
