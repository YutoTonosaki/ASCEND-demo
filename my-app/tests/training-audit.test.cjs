const { test } = require("node:test");
const assert = require("node:assert/strict");
const { standardExercises } = require("../src/data/exercises.ts");
const {
  isExercise,
  isWorkout,
  isCustomExercise,
} = require("../src/training/validation.ts");
const { normalizeTrainingData } = require("../src/storage/training-schema.ts");
const {
  newWorkout,
  newEntry,
  copyWorkoutPlan,
  duplicateWorkout,
  moveEntry,
} = require("../src/training/plans.ts");
const {
  TrainingRepository,
  TRAINING_KEY,
  emptyTrainingData,
} = require("../src/storage/training-repository.ts");
const custom = () => ({
  ...standardExercises[0],
  id: "custom-audit",
  name: "Custom movement",
  isCustom: true,
  difficulty: null,
  progressionFamily: null,
});
const workout = () => ({
  ...newWorkout(),
  name: "Audit plan",
  exercises: ["push-up", "bench-press", "plank"].map((id) =>
    newEntry(standardExercises.find((e) => e.id === id)),
  ),
});
function memory(initial) {
  const values = new Map(
    initial === undefined ? [] : [[TRAINING_KEY, initial]],
  );
  return {
    values,
    read: async (key) => values.get(key) ?? null,
    write: async (key, value) => {
      values.set(key, value);
    },
    remove: async (key) => {
      values.delete(key);
    },
  };
}
test("one Exercise validator covers all built-ins and custom metadata", () => {
  assert.equal(standardExercises.length, 42);
  assert.ok(standardExercises.every(isExercise));
  assert.ok(isExercise(custom()));
  assert.ok(isCustomExercise(custom()));
  assert.equal(isCustomExercise(standardExercises[0]), false);
  for (const invalid of [
    { ...custom(), name: "   " },
    { ...custom(), equipment: ["Dumbbell / Bench"] },
    { ...custom(), primaryBodyParts: [] },
    { ...custom(), difficulty: 1 },
    { ...custom(), secondaryBodyParts: ["Chest"] },
    { ...custom(), id: "   " },
  ])
    assert.equal(isExercise(invalid), false);
  const byId = (id) => standardExercises.find((e) => e.id === id);
  assert.deepEqual(byId("dead-hang").primaryBodyParts, ["Back", "Arms"]);
  assert.deepEqual(byId("inverted-row").equipment, ["Low Bar"]);
  assert.deepEqual(byId("jumping-jack").primaryBodyParts, [
    "Legs",
    "Shoulders",
  ]);
});
test("planning validation rejects empty names, empty exercises/sets and invalid numeric targets", () => {
  const valid = workout();
  const edits = [
    (p) => {
      p.name = "";
    },
    (p) => {
      p.name = " ".repeat(5);
    },
    (p) => {
      p.name = "x".repeat(81);
    },
    (p) => {
      p.exercises = [];
    },
    (p) => {
      p.exercises[0].sets = [];
    },
    (p) => {
      p.exercises[0].sets[0].reps = 0;
    },
    (p) => {
      p.exercises[0].sets[0].reps = -1;
    },
    (p) => {
      p.exercises[0].sets[0].reps = 1.5;
    },
    (p) => {
      p.exercises[0].restSeconds = -1;
    },
    (p) => {
      p.exercises[1].sets[0].weightKg = -1;
    },
    (p) => {
      p.exercises[1].sets[0].weightKg = Infinity;
    },
    (p) => {
      p.exercises[2].sets[0].seconds = -1;
    },
    (p) => {
      p.exercises[2].sets[0].seconds = 0;
    },
    (p) => {
      p.exercises[2].sets[0].seconds = NaN;
    },
  ];
  for (const edit of edits) {
    const plan = copyWorkoutPlan(valid);
    edit(plan);
    assert.equal(isWorkout(plan, standardExercises), false);
  }
  valid.exercises[0].restSeconds = 0;
  valid.exercises[1].sets[0].weightKg = 0;
  assert.ok(isWorkout(valid, standardExercises));
});
test("all CRUD transitions survive independent reloads with IDs, order and per-set targets intact", async () => {
  const adapter = memory();
  let repo = new TrainingRepository(adapter);
  await repo.load();
  await repo.commit({ type: "saveExercise", exercise: custom() });
  await repo.commit({
    type: "saveExercise",
    exercise: {
      ...custom(),
      name: "Edited movement",
      equipment: ["Dumbbell", "Bench"],
    },
  });
  let restored = await new TrainingRepository(adapter).load();
  assert.equal(restored.customExercises[0].name, "Edited movement");
  assert.deepEqual(restored.customExercises[0].equipment, [
    "Dumbbell",
    "Bench",
  ]);
  const plan = workout();
  plan.exercises.push(newEntry(restored.customExercises[0]));
  plan.exercises[0].sets[1].reps = 5;
  plan.exercises[0].restSeconds = 120;
  plan.exercises[1].sets[0].weightKg = 52.5;
  plan.exercises[2].sets[2].seconds = 30;
  plan.exercises = moveEntry(plan.exercises, 3, -2);
  await repo.commit({ type: "saveWorkout", workout: plan });
  repo = new TrainingRepository(adapter);
  restored = await repo.load();
  assert.deepEqual(restored.workouts[0], plan);
  const edited = copyWorkoutPlan(restored.workouts[0]);
  edited.name = "Edited plan";
  edited.createdAt = "2000-01-01T00:00:00.000Z";
  await repo.commit({ type: "saveWorkout", workout: edited });
  restored = await new TrainingRepository(adapter).load();
  assert.equal(restored.workouts.length, 1);
  assert.equal(restored.workouts[0].id, plan.id);
  assert.equal(restored.workouts[0].createdAt, plan.createdAt);
  const original = copyWorkoutPlan(restored.workouts[0]);
  const duplicate = duplicateWorkout(original);
  await repo.commit({ type: "saveWorkout", workout: duplicate });
  restored = await new TrainingRepository(adapter).load();
  assert.notEqual(duplicate.id, original.id);
  assert.deepEqual(
    restored.workouts.find((w) => w.id === original.id),
    original,
  );
  await assert.rejects(
    repo.commit({ type: "deleteExercise", id: custom().id }),
  );
  await assert.rejects(
    repo.commit({
      type: "saveExercise",
      exercise: { ...custom(), trackingType: "time" },
    }),
  );
  await repo.commit({ type: "deleteWorkout", id: duplicate.id });
  await repo.commit({ type: "deleteWorkout", id: original.id });
  await repo.commit({ type: "deleteExercise", id: custom().id });
  restored = await new TrainingRepository(adapter).load();
  assert.equal(restored.workouts.length, 0);
  assert.equal(restored.customExercises.length, 0);
});
test("repository snapshots isolate submitted objects and returned data from persisted templates", async () => {
  const adapter = memory();
  const repo = new TrainingRepository(adapter);
  await repo.load();
  const exercise = custom();
  const saveExercise = repo.commit({ type: "saveExercise", exercise });
  exercise.equipment.push("Other");
  await saveExercise;
  const plan = workout();
  const submitted = copyWorkoutPlan(plan);
  const saving = repo.commit({ type: "saveWorkout", workout: plan });
  plan.exercises[0].sets[0].reps = 999;
  const response = await saving;
  assert.deepEqual(response.workouts[0], submitted);
  response.workouts[0].exercises[0].sets[0].reps = 888;
  response.customExercises[0].equipment.push("Machine");
  const next = await repo.commit({ type: "recent", id: "push-up" });
  assert.deepEqual(next.workouts[0], submitted);
  assert.deepEqual(next.customExercises[0].equipment, ["Bodyweight"]);
  const loaded = await repo.load();
  loaded.workouts[0].exercises = [];
  assert.deepEqual(
    (await repo.commit({ type: "recent", id: "plank" })).workouts[0],
    submitted,
  );
});
test("v1 normalization fills only optional metadata and derived Recent without changing plan evidence", async () => {
  const exercise = custom();
  delete exercise.difficulty;
  delete exercise.progressionFamily;
  delete exercise.secondaryBodyParts;
  const plan = workout();
  plan.exercises[0].sets[1].reps = 7;
  const legacy = {
    ...emptyTrainingData(),
    customExercises: [exercise],
    workouts: [plan],
    recentExerciseIds: ["push-up", "push-up", "deleted-exercise", custom().id],
  };
  const raw = JSON.stringify(legacy);
  const adapter = memory(raw);
  const repo = new TrainingRepository(adapter);
  const normalized = await repo.load();
  assert.equal(normalized.customExercises[0].difficulty, null);
  assert.equal(normalized.customExercises[0].progressionFamily, null);
  assert.deepEqual(normalized.customExercises[0].secondaryBodyParts, []);
  assert.deepEqual(normalized.recentExerciseIds, ["push-up", custom().id]);
  assert.deepEqual(normalized.workouts, [plan]);
  assert.ok(
    [...adapter.values.entries()].some(
      ([k, v]) => k.startsWith(TRAINING_KEY + ".backup.") && v === raw,
    ),
  );
  const size = adapter.values.size;
  await repo.load();
  assert.equal(adapter.values.size, size);
  assert.deepEqual(
    normalizeTrainingData({ ...legacy, recentExerciseIds: undefined })
      .recentExerciseIds,
    [],
  );
});
test("canonical Phase 2A data is not rewritten; unsafe/unknown schemas and targets are never guessed", async () => {
  const state = { ...emptyTrainingData(), workouts: [workout()] };
  const adapter = memory(JSON.stringify(state));
  adapter.write = async () => {
    throw new Error("should not write");
  };
  assert.deepEqual(await new TrainingRepository(adapter).load(), state);
  const broken = copyWorkoutPlan(state.workouts[0]);
  delete broken.exercises[0].restSeconds;
  for (const input of [
    { ...state, version: 2 },
    { ...state, version: undefined },
    { ...state, workouts: [broken] },
    { ...state, customExercises: [{ ...custom(), difficulty: 2 }] },
  ]) {
    assert.equal(normalizeTrainingData(input), null);
    const raw = JSON.stringify(input);
    const badAdapter = memory(raw);
    await assert.rejects(new TrainingRepository(badAdapter).load());
    assert.equal(badAdapter.values.get(TRAINING_KEY), raw);
  }
});
test("normalization failures preserve raw storage and block commits until load succeeds", async () => {
  for (const failBackup of [true, false]) {
    const legacy = emptyTrainingData();
    delete legacy.recentExerciseIds;
    const raw = JSON.stringify(legacy);
    const adapter = memory(raw);
    const write = adapter.write;
    adapter.write = async (key, value) => {
      if (failBackup || key === TRAINING_KEY) throw new Error("disk full");
      await write(key, value);
    };
    const repo = new TrainingRepository(adapter);
    await assert.rejects(repo.load(), /disk full/);
    assert.equal(adapter.values.get(TRAINING_KEY), raw);
    await assert.rejects(repo.commit({ type: "recent", id: "push-up" }));
    adapter.write = write;
    assert.deepEqual(await repo.load(), emptyTrainingData());
  }
});
test("load, reset and queued writes preserve operation order; failed reload blocks stale writes", async () => {
  const adapter = memory();
  const repo = new TrainingRepository(adapter);
  const loading = repo.load();
  const saving = repo.commit({ type: "saveWorkout", workout: workout() });
  await loading;
  await saving;
  const resetting = repo.reset();
  const afterReset = repo.commit({ type: "saveWorkout", workout: workout() });
  await resetting;
  await afterReset;
  assert.equal((await repo.load()).workouts.length, 1);
  adapter.values.set(TRAINING_KEY, "invalid");
  await assert.rejects(repo.load());
  await assert.rejects(repo.commit({ type: "recent", id: "push-up" }));
  assert.equal(adapter.values.get(TRAINING_KEY), "invalid");
});
