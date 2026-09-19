const { test } = require("node:test");
const assert = require("node:assert/strict");
const { standardExercises } = require("../src/data/exercises.ts");
const {
  newWorkout,
  newEntry,
  copyWorkoutPlan,
  copyExercise,
} = require("../src/training/plans.ts");
const {
  startSession,
  position,
  confirmSet,
  endRest,
  prefill,
  isSession,
  isActual,
  copySession,
} = require("../src/sessions/domain.ts");
const {
  SessionRepository,
  SESSION_KEY,
} = require("../src/storage/session-repository.ts");
const {
  TrainingRepository,
  TRAINING_KEY,
} = require("../src/storage/training-repository.ts");
const at = (n) => new Date(Date.UTC(2026, 8, 18, 12, 0, n)).toISOString();
function plan(ids = ["push-up"], rest = 0, sets = 2) {
  return {
    ...newWorkout(),
    name: "Evidence",
    exercises: ids.map((id) => {
      const entry = newEntry(standardExercises.find((e) => e.id === id));
      return { ...entry, restSeconds: rest, sets: entry.sets.slice(0, sets) };
    }),
  };
}
function memory() {
  const values = new Map();
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
function finish(session) {
  let next = session,
    n = 1;
  while (position(next)) {
    const current = position(next);
    next = confirmSet(
      next,
      current.set.id,
      prefill(current.set.target),
      at(n++),
    );
    if (next.restUntil) next = endRest(next, next.restUntil, true, at(n++));
  }
  return next;
}
test("start creates independent identity, targets, metadata and null unconfirmed results", () => {
  const source = plan();
  const before = copyWorkoutPlan(source);
  const library = standardExercises.map(copyExercise);
  const session = startSession(source, library, at(0));
  assert.notEqual(session.id, source.id);
  assert.notEqual(session.exercises[0].id, source.exercises[0].id);
  assert.notEqual(position(session).set.id, source.exercises[0].sets[0].id);
  assert.deepEqual(source, before);
  prefill(position(session).set.target).reps = 99;
  assert.equal(position(session).set.result, null);
  source.exercises[0].sets[0].reps = 15;
  library[0].name = "Renamed";
  library[0].equipment.push("Other");
  assert.equal(position(session).set.target.reps, 12);
  assert.equal(session.exercises[0].exercise.name, "Push-up");
  assert.deepEqual(session.exercises[0].exercise.equipment, ["Bodyweight"]);
});
for (const [id, actual] of [
  ["push-up", { type: "reps", reps: 10 }],
  ["bench-press", { type: "weight_reps", reps: 7, weightKg: 52.5 }],
  ["plank", { type: "time", seconds: 42 }],
]) {
  test(`${id}: actual stays separate; explicit zero is valid and null is not evidence`, () => {
    const source = plan([id]);
    const session = startSession(source, standardExercises, at(0));
    const target = { ...position(session).set.target };
    const next = confirmSet(session, position(session).set.id, actual, at(1));
    assert.deepEqual(next.exercises[0].sets[0].target, target);
    assert.deepEqual(next.exercises[0].sets[0].result.actual, actual);
    assert.equal(session.exercises[0].sets[0].result, null);
    const zero =
      actual.type === "time"
        ? { type: "time", seconds: 0 }
        : actual.type === "reps"
          ? { type: "reps", reps: 0 }
          : { type: "weight_reps", reps: 0, weightKg: 0 };
    const completed = confirmSet(next, position(next).set.id, zero, at(2));
    assert.equal(completed.status, "completed");
    assert.ok(isSession(completed));
    assert.deepEqual(source.exercises[0].sets[0], target);
  });
}
test("ordered execution, zero rest and stale double completion confirm only one set", () => {
  const session = startSession(
    plan(["push-up", "plank"]),
    standardExercises,
    at(0),
  );
  const current = position(session);
  const next = confirmSet(
    session,
    current.set.id,
    { type: "reps", reps: 9 },
    at(1),
  );
  assert.equal(next.restUntil, null);
  assert.equal(position(next).setIndex, 1);
  assert.deepEqual(
    confirmSet(next, current.set.id, { type: "reps", reps: 9 }, at(2)),
    next,
  );
  const following = confirmSet(
    next,
    position(next).set.id,
    { type: "reps", reps: 8 },
    at(3),
  );
  assert.equal(position(following).exerciseIndex, 1);
  assert.equal(position(following).setIndex, 0);
});
test("rest uses exact deadline; early expiry does nothing, skip/expiry advance, stale skip cannot skip later rest", () => {
  const session = startSession(
    plan(["push-up"], 90, 3),
    standardExercises,
    at(0),
  );
  const rest = confirmSet(
    session,
    position(session).set.id,
    { type: "reps", reps: 10 },
    at(1),
  );
  assert.equal(rest.restUntil, at(91));
  assert.throws(
    () =>
      confirmSet(
        rest,
        position(rest).set.id,
        { type: "reps", reps: 10 },
        at(2),
      ),
    /rest/,
  );
  assert.deepEqual(endRest(rest, rest.restUntil, false, at(90)), rest);
  assert.equal(endRest(rest, rest.restUntil, false, at(91)).restUntil, null);
  const skipped = endRest(rest, rest.restUntil, true, at(2));
  assert.equal(position(skipped).setIndex, 1);
  const second = confirmSet(
    skipped,
    position(skipped).set.id,
    { type: "reps", reps: 8 },
    at(3),
  );
  assert.deepEqual(endRest(second, rest.restUntil, true, at(4)), second);
  assert.equal(finish(session).restUntil, null);
});
test("completed validation rejects fabricated, unordered, incompatible and malformed evidence", () => {
  const good = finish(startSession(plan(), standardExercises, at(0)));
  assert.ok(isSession(good));
  const edits = [
    (s) => (s.id = " "),
    (s) => (s.startedAt = "bad"),
    (s) => (s.status = "other"),
    (s) => (s.completedAt = null),
    (s) => (s.exercises[0].exercise.name = ""),
    (s) => (s.exercises[0].sets[1].id = s.exercises[0].sets[0].id),
    (s) => (s.exercises[0].sets[0].result = null),
    (s) =>
      (s.exercises[0].sets[0].result.actual = { type: "time", seconds: 1 }),
    (s) => (s.exercises[0].sets[0].result.actual.reps = -1),
    (s) => (s.exercises[0].sets[0].result.actual.reps = 1.5),
    (s) => (s.exercises[0].sets[0].target.reps = 0),
    (s) => (s.exercises[0].sets[1].result.confirmedAt = at(0)),
    (s) => (s.exercises[0].sets[0].result.actual.weightKg = 1),
  ];
  for (const edit of edits) {
    const bad = copySession(good);
    edit(bad);
    assert.equal(isSession(bad), false);
  }
  assert.equal(
    isActual(
      { type: "weight_reps", reps: 1, weightKg: Infinity },
      "weight_reps",
    ),
    false,
  );
  const active = startSession(plan(), standardExercises, at(0));
  active.completedAt = at(1);
  assert.equal(isSession(active), false);
});
test("repository reload preserves active/rest/completed evidence; duplicate final submission records exactly once", async () => {
  const adapter = memory();
  let time = 0;
  let repo = new SessionRepository(adapter, () => at(time++));
  await repo.load();
  let state = await repo.commit({
    type: "start",
    plan: plan(["push-up"], 90),
    library: standardExercises,
  });
  const sid = state.active.id;
  await assert.rejects(
    repo.commit({ type: "start", plan: plan(), library: standardExercises }),
    /Resume/,
  );
  state = await repo.commit({
    type: "confirm",
    sessionId: sid,
    setId: position(state.active).set.id,
    actual: { type: "reps", reps: 10 },
  });
  repo = new SessionRepository(adapter, () => at(time++));
  assert.deepEqual(await repo.load(), state);
  state = await repo.commit({
    type: "rest",
    sessionId: sid,
    deadline: state.active.restUntil,
    skip: true,
  });
  const command = {
    type: "confirm",
    sessionId: sid,
    setId: position(state.active).set.id,
    actual: { type: "reps", reps: 0 },
  };
  const results = await Promise.all([
    repo.commit(command),
    repo.commit(command),
  ]);
  for (const result of results) {
    assert.equal(result.active, null);
    assert.equal(result.completed.length, 1);
  }
  assert.equal(results[0].completed[0].completedAt, at(time - 1));
  assert.deepEqual(await new SessionRepository(adapter).load(), results[0]);
});
test("submission/load/result copies are detached and failed writes do not publish", async () => {
  const adapter = memory();
  const repo = new SessionRepository(adapter, () => at(1));
  await repo.load();
  const source = plan();
  const library = standardExercises.map(copyExercise);
  const pending = repo.commit({ type: "start", plan: source, library });
  source.name = "Changed";
  library[0].name = "Changed";
  const state = await pending;
  assert.equal(state.active.name, "Evidence");
  const current = position(state.active);
  const actual = { type: "reps", reps: 10 };
  const confirming = repo.commit({
    type: "confirm",
    sessionId: state.active.id,
    setId: current.set.id,
    actual,
  });
  actual.reps = 999;
  state.active.exercises[0].exercise.equipment.push("Other");
  const next = await confirming;
  assert.equal(next.active.exercises[0].sets[0].result.actual.reps, 10);
  assert.deepEqual(next.active.exercises[0].exercise.equipment, ["Bodyweight"]);
  const loaded = await repo.load();
  loaded.active.name = "Mutated";
  const write = adapter.write;
  adapter.write = async () => {
    throw new Error("disk full");
  };
  await assert.rejects(
    repo.commit({
      type: "confirm",
      sessionId: next.active.id,
      setId: position(next.active).set.id,
      actual: { type: "reps", reps: 1 },
    }),
    /disk full/,
  );
  adapter.write = write;
  assert.equal((await repo.load()).active.name, "Evidence");
});
test("template edits/deletion and custom metadata edits/deletion cannot change session history", async () => {
  const adapter = memory();
  const templates = new TrainingRepository(adapter);
  const sessions = new SessionRepository(adapter, () => at(0));
  await templates.load();
  await sessions.load();
  const custom = {
    ...copyExercise(standardExercises[0]),
    id: "custom-history",
    name: "Demo4",
    isCustom: true,
    difficulty: null,
    progressionFamily: null,
  };
  await templates.commit({ type: "saveExercise", exercise: custom });
  const source = {
    ...newWorkout(),
    name: "Push Day",
    exercises: [
      { ...newEntry(custom), restSeconds: 0, sets: [newEntry(custom).sets[0]] },
    ],
  };
  await templates.commit({ type: "saveWorkout", workout: source });
  let state = await sessions.commit({
    type: "start",
    plan: source,
    library: [custom],
  });
  state = await sessions.commit({
    type: "confirm",
    sessionId: state.active.id,
    setId: position(state.active).set.id,
    actual: { type: "reps", reps: 10 },
  });
  const evidence = copySession(state.completed[0]);
  source.exercises[0].sets[0].reps = 15;
  await templates.commit({ type: "saveWorkout", workout: source });
  await templates.commit({
    type: "saveExercise",
    exercise: { ...custom, name: "Push Test", equipment: ["Other"] },
  });
  assert.equal(
    (await templates.load()).workouts[0].exercises[0].sets[0].reps,
    15,
  );
  assert.deepEqual((await sessions.load()).completed[0], evidence);
  await templates.commit({ type: "deleteWorkout", id: source.id });
  await templates.commit({ type: "deleteExercise", id: custom.id });
  assert.deepEqual(
    (await new SessionRepository(adapter).load()).completed[0],
    evidence,
  );
});
test("corrupt/unknown sessions preserve original and templates; reset backs up, failed backup prevents erasure", async () => {
  for (const raw of [
    "{broken",
    JSON.stringify({ version: 2, active: null, completed: [] }),
  ]) {
    const adapter = memory();
    adapter.values.set(SESSION_KEY, raw);
    adapter.values.set(TRAINING_KEY, "untouched");
    const repo = new SessionRepository(adapter);
    await assert.rejects(repo.load());
    await assert.rejects(
      repo.commit({ type: "start", plan: plan(), library: standardExercises }),
    );
    assert.equal(adapter.values.get(SESSION_KEY), raw);
    const write = adapter.write;
    adapter.write = async () => {
      throw new Error("full");
    };
    await assert.rejects(repo.reset());
    assert.equal(adapter.values.get(SESSION_KEY), raw);
    adapter.write = write;
    await repo.reset();
    assert.ok(
      [...adapter.values].some(
        ([k, v]) => k.startsWith(SESSION_KEY + ".backup.") && v === raw,
      ),
    );
    assert.equal(adapter.values.get(TRAINING_KEY), "untouched");
  }
});

test('session queue preserves load/reset/commit order and failed reload prevents stale writes', async () => {
  const adapter = memory();
  const repo = new SessionRepository(adapter, () => at(0));
  const loading = repo.load();
  const starting = repo.commit({ type: 'start', plan: plan(), library: standardExercises });
  await loading;
  await starting;
  const resetting = repo.reset();
  const restarting = repo.commit({ type: 'start', plan: plan(), library: standardExercises });
  await resetting;
  const state = await restarting;
  assert.ok(state.active);
  adapter.values.set(SESSION_KEY, 'damaged');
  await assert.rejects(repo.load());
  await assert.rejects(repo.commit({ type: 'confirm', sessionId: state.active.id, setId: position(state.active).set.id, actual: { type: 'reps', reps: 1 } }));
  assert.equal(adapter.values.get(SESSION_KEY), 'damaged');
});

test('start rejects missing catalog metadata and invalid targets before creating evidence', () => {
  const source = plan();
  assert.throws(() => startSession(source, [], at(0)));
  source.exercises[0].sets[0].reps = 0;
  assert.throws(() => startSession(source, standardExercises, at(0)));
  source.exercises[0].sets[0].reps = 12;
  assert.throws(() => startSession(source, standardExercises.map(e => ({...e, equipment: []})), at(0)));
});
