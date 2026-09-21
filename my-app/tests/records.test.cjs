const { test } = require("node:test");
const assert = require("node:assert/strict");
const { standardExercises } = require("../src/data/exercises.ts");
const { newWorkout, newEntry } = require("../src/training/plans.ts");
const {
  startSession,
  confirmSet,
  position,
} = require("../src/sessions/domain.ts");
const {
  derivePersonalRecords: derive,
  getExerciseRecord: get,
  getSetComparison,
  getPreviousRecord,
} = require("../src/records/domain.ts");
const {
  SessionRepository,
  SESSION_KEY,
} = require("../src/storage/session-repository.ts");
const { TrainingRepository } = require("../src/storage/training-repository.ts");
const at = (n) => new Date(Date.UTC(2026, 8, 20, 12, 0, n)).toISOString();
function plan(id = "push-up", count = 1) {
  const entry = newEntry(standardExercises.find((e) => e.id === id));
  return {
    ...newWorkout(),
    name: "Records",
    exercises: [{ ...entry, restSeconds: 0, sets: entry.sets.slice(0, count) }],
  };
}
function session(values, id = "push-up", offset = 0) {
  let s = startSession(plan(id, values.length), standardExercises, at(offset));
  for (const [i, value] of values.entries()) {
    if (value === null) break;
    const actual =
      id === "plank"
        ? { type: "time", seconds: value }
        : id === "bench-press"
          ? { type: "weight_reps", weightKg: value[0], reps: value[1] }
          : { type: "reps", reps: value };
    s = confirmSet(s, position(s).set.id, actual, at(offset + i + 1));
  }
  return s;
}
const reps = (values) => derive([session(values)]);
const last = (result) => result.comparisons.at(-1);
const best = (result) => result.records[0].best.value;
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
test("no history gives an empty result", () =>
  assert.deepEqual(derive([]), {
    records: [],
    comparisons: [],
    rejectedSessions: 0,
  }));
test("first repetition record and previous-record lookup", () => {
  const result = reps([8]);
  const c = last(result);
  assert.equal(best(result), 8);
  assert.equal(c.metrics[0].outcome, "first");
  assert.equal(
    getPreviousRecord(result, c.source.sessionId, c.source.setId),
    null,
  );
  assert.equal(getSetComparison(result, c.source.sessionId, c.source.setId), c);
  assert.equal(getPreviousRecord(result, "missing", "missing"), undefined);
  assert.equal(get(result, "push-up", "reps").best.value, 8);
});
test("later repetition improvement compares with previous best", () => {
  const result = reps([8, 12]);
  const c = last(result);
  assert.equal(best(result), 12);
  assert.equal(c.previous.best.value, 8);
  assert.equal(c.metrics[0].outcome, "improved");
  assert.equal(c.metrics[0].relation, "higher");
});
test("equal repetitions maintain PR and preserve first achievement source", () => {
  const result = reps([8, 8]);
  assert.equal(last(result).metrics[0].relation, "equal");
  assert.equal(last(result).metrics[0].outcome, "maintained");
  assert.equal(
    result.records[0].best.source.setId,
    result.comparisons[0].source.setId,
  );
});
test("lower repetitions maintain PR", () => {
  const result = reps([8, 5]);
  assert.equal(best(result), 8);
  assert.equal(last(result).metrics[0].relation, "lower");
  assert.equal(last(result).metrics[0].outcome, "maintained");
});
test("first duration uses actual seconds", () => {
  const result = derive([session([31], "plank")]);
  assert.equal(best(result), 31);
  assert.equal(last(result).metrics[0].metric, "seconds");
  assert.equal(last(result).metrics[0].outcome, "first");
});
test("duration improvement, equal and lower comparison", () => {
  const result = derive([
    session([31, 42, 42], "plank"),
    session([20], "plank", 10),
  ]);
  assert.equal(best(result), 42);
  assert.deepEqual(
    result.comparisons.map((c) => c.metrics[0].relation),
    ["first", "higher", "equal", "lower"],
  );
});
test("weighted maximum is independent from repetitions", () => {
  const result = derive([
    session(
      [
        [5, 15],
        [7, 12],
        [10, 8],
      ],
      "bench-press",
    ),
  ]);
  assert.equal(best(result), 10);
  assert.equal(result.records[0].best.source.actual.reps, 8);
  assert.deepEqual(
    result.records[0].byWeight.map((x) => [x.weightKg, x.best.value]),
    [
      [5, 15],
      [7, 12],
      [10, 8],
    ],
  );
});
test("weighted repetitions improve only at the same weight", () => {
  const result = derive([
    session(
      [
        [10, 8],
        [5, 15],
        [10, 9],
      ],
      "bench-press",
    ),
  ]);
  const c = last(result);
  assert.equal(c.metrics[0].outcome, "maintained");
  assert.deepEqual(c.metrics[1], {
    metric: "repsAtWeight",
    weightKg: 10,
    previous: 8,
    value: 9,
    outcome: "improved",
    relation: "higher",
  });
  assert.equal(result.comparisons[1].metrics[1].outcome, "first");
});
test("multiple sets use single-set maximum, not sum", () =>
  assert.equal(best(reps([8, 9, 7])), 9));
test("planned targets never become performance", () => {
  const s = session([4]);
  s.exercises[0].sets[0].target.reps = 999;
  assert.equal(best(derive([s])), 4);
});
test("unconfirmed, unknown abandoned status and incomplete completed sessions are excluded", () => {
  const unconfirmed = session([null]);
  const abandoned = { ...session([40]), status: "abandoned" };
  const incomplete = {
    ...session([3, null]),
    status: "completed",
    completedAt: at(2),
  };
  assert.deepEqual(derive([unconfirmed, abandoned, incomplete]).records, []);
  assert.equal(derive([abandoned, incomplete]).rejectedSessions, 2);
});
test("valid confirmed prefix in a partially completed active session qualifies", () => {
  const s = session([6, null]);
  const result = derive([s]);
  assert.equal(s.status, "active");
  assert.equal(best(result), 6);
  assert.equal(result.comparisons.length, 1);
});
test("multiple exercises in the same session remain independent", () => {
  const p = plan();
  p.exercises.push(plan("plank").exercises[0]);
  let s = startSession(p, standardExercises, at(0));
  s = confirmSet(s, position(s).set.id, { type: "reps", reps: 8 }, at(1));
  s = confirmSet(s, position(s).set.id, { type: "time", seconds: 20 }, at(2));
  const result = derive([s]);
  assert.equal(get(result, "push-up", "reps").best.value, 8);
  assert.equal(get(result, "plank", "time").best.value, 20);
});
test("renaming preserves identity and uses latest snapshot name", () => {
  const a = session([12]),
    b = session([8], "push-up", 10);
  b.exercises[0].exercise.name = "Renamed";
  const result = derive([b, a]);
  assert.equal(result.records.length, 1);
  assert.equal(best(result), 12);
  assert.equal(result.records[0].name, "Renamed");
});
test("similar names never merge different exercise IDs", () => {
  const a = session([12]),
    b = session([8]);
  b.exercises[0].exercise.id = "different-exercise";
  assert.equal(derive([a, b]).records.length, 2);
});
test("tracking changes under the same ID retain independent records", () => {
  const a = session([12]),
    b = session([8], "plank");
  b.exercises[0].exercise.id = "push-up";
  const result = derive([a, b]);
  assert.equal(result.records.length, 2);
  assert.equal(get(result, "push-up", "reps").best.value, 12);
  assert.equal(get(result, "push-up", "time").best.value, 8);
});
test("saved template deletion and edits do not affect PRs after repository reload", async () => {
  const adapter = memory();
  const templates = new TrainingRepository(adapter);
  let tick = 0;
  const sessions = new SessionRepository(adapter, () => at(tick++));
  await templates.load();
  await sessions.load();
  const p = plan();
  await templates.commit({ type: "saveWorkout", workout: p });
  let state = await sessions.commit({
    type: "start",
    plan: p,
    library: standardExercises,
  });
  state = await sessions.commit({
    type: "confirm",
    sessionId: state.active.id,
    setId: position(state.active).set.id,
    actual: { type: "reps", reps: 9 },
  });
  const expected = derive(state.completed);
  p.exercises[0].sets[0].reps = 99;
  await templates.commit({ type: "saveWorkout", workout: p });
  await templates.commit({ type: "deleteWorkout", id: p.id });
  const raw = adapter.values.get(SESSION_KEY);
  assert.deepEqual(
    derive((await new SessionRepository(adapter).load()).completed),
    expected,
  );
  assert.equal(adapter.values.get(SESSION_KEY), raw);
});
test("active persistence then final completion updates without double counting", async () => {
  const adapter = memory();
  let tick = 0;
  let repo = new SessionRepository(adapter, () => at(tick++));
  await repo.load();
  let d = await repo.commit({
    type: "start",
    plan: plan("push-up", 2),
    library: standardExercises,
  });
  d = await repo.commit({
    type: "confirm",
    sessionId: d.active.id,
    setId: position(d.active).set.id,
    actual: { type: "reps", reps: 9 },
  });
  repo = new SessionRepository(adapter, () => at(tick++));
  d = await repo.load();
  assert.equal(best(derive([d.active, ...d.completed])), 9);
  d = await repo.commit({
    type: "confirm",
    sessionId: d.active.id,
    setId: position(d.active).set.id,
    actual: { type: "reps", reps: 11 },
  });
  assert.equal(d.active, null);
  assert.equal(derive(d.completed).comparisons.length, 2);
  assert.equal(
    best(derive((await new SessionRepository(adapter).load()).completed)),
    11,
  );
});
test("nullable historical metadata is accepted without new PR fields; required timestamps are not invented", () => {
  const s = session([8]);
  s.exercises[0].exercise.progressionFamily = null;
  assert.equal(best(derive([s])), 8); // No PR fields or optional future units/annotations required.
  delete s.exercises[0].sets[0].result.confirmedAt;
  assert.equal(derive([s]).rejectedSessions, 1);
});
test("invalid or incomplete performance is rejected, never defaulted to zero", () => {
  for (const reps of [undefined, null, -1, 1.5, NaN, Infinity, "8"]) {
    const s = session([8]);
    s.exercises[0].sets[0].result.actual.reps = reps;
    assert.equal(derive([s]).records.length, 0);
  }
  const s = session([8], "plank");
  delete s.exercises[0].sets[0].result.actual.seconds;
  assert.equal(derive([s]).records.length, 0);
});
test("repeat derivation, source reorder and tied timestamps are deterministic without mutating input", () => {
  const a = session([8, 12]),
    b = session([10]);
  a.id = "a";
  b.id = "b";
  a.exercises[0].sets[1].result.confirmedAt = at(1);
  a.completedAt = at(1);
  const input = [b, a],
    before = JSON.stringify(input),
    expected = derive(input);
  assert.deepEqual(derive([a, b]), expected);
  assert.deepEqual(derive(input), expected);
  assert.equal(JSON.stringify(input), before);
  assert.deepEqual(
    expected.comparisons.map((c) => c.source.sessionId),
    ["a", "a", "b"],
  );
  expected.records[0].best.source.actual.reps = 999;
  assert.equal(best(derive(input)), 12);
});
test("zero is explicit for reps/seconds; zero-rep weighted attempts cannot claim a lifted load", () => {
  assert.equal(best(reps([0])), 0);
  assert.equal(best(derive([session([0], "plank")])), 0);
  const result = derive([
    session(
      [
        [100, 0],
        [0, 3],
        [5, 1],
      ],
      "bench-press",
    ),
  ]);
  assert.equal(best(result), 5);
  assert.deepEqual(
    result.records[0].byWeight.map((x) => x.weightKg),
    [0, 5],
  );
});
test("decimal loads are retained independently; no inferred conversion or rounding", () => {
  const result = derive([
    session(
      [
        [7.5, 10],
        [7.55, 9],
        [7.5, 11],
      ],
      "bench-press",
    ),
  ]);
  assert.deepEqual(
    result.records[0].byWeight.map((x) => [x.weightKg, x.best.value]),
    [
      [7.5, 11],
      [7.55, 9],
    ],
  );
});
test("duplicate ambiguous session identity is rejected instead of awarding twice", () => {
  const s = session([8]);
  assert.equal(derive([s, s]).rejectedSessions, 2);
  assert.equal(derive([s, s]).records.length, 0);
});
test("profile baselines and templates are not workout evidence", () => {
  assert.equal(
    derive([
      plan(),
      {
        exercise: standardExercises[0],
        actual: { type: "reps", reps: 99 },
        recordedAt: at(0),
        source: "known",
      },
    ]).records.length,
    0,
  );
});
