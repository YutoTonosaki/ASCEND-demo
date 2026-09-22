const { test } = require("node:test");
const assert = require("node:assert/strict");
const { standardExercises } = require("../src/data/exercises.ts");
const { bodyParts } = require("../src/config/training.ts");
const { growthConfig: c } = require("../src/config/growth.ts");
const { defaultProfile } = require("../src/coach/profile.ts");
const { newWorkout, newEntry } = require("../src/training/plans.ts");
const {
  startSession,
  confirmSet,
  position,
} = require("../src/sessions/domain.ts");
const { derivePersonalRecords } = require("../src/records/domain.ts");
const {
  initializePlayer,
  reconcilePlayer,
  assessmentValue,
  earlyMultiplier,
  diminishing,
  allocationFor,
  growthSignal,
  overall,
  displayRating,
} = require("../src/growth/domain.ts");
const { isPlayerData } = require("../src/growth/validation.ts");
const {
  PlayerRepository,
  PLAYER_KEY,
} = require("../src/storage/player-repository.ts");
const at = (n) => new Date(Date.UTC(2026, 8, 21) + n * 1000).toISOString();
const byId = (id) => standardExercises.find((e) => e.id === id);
const actual = (id, v) =>
  byId(id).trackingType === "time"
    ? { type: "time", seconds: v }
    : byId(id).trackingType === "weight_reps"
      ? { type: "weight_reps", weightKg: v[0], reps: v[1] }
      : { type: "reps", reps: v };
function profile(ids = ["push-up", "squat", "plank"]) {
  const p = defaultProfile(at(0));
  p.baselineAssessments = ids.map((id) => ({
    exercise: byId(id),
    actual: actual(id, id === "plank" ? 30 : 10),
    recordedAt: at(0),
    source: "known",
  }));
  return p;
}
function history(entries = [["push-up", [10]]], offset = 10) {
  const plan = {
    ...newWorkout(),
    name: "Growth test",
    exercises: entries.map(([id, values]) => {
      const e = newEntry(byId(id));
      return {
        ...e,
        restSeconds: 0,
        sets: values.map((_, i) => ({
          ...e.sets[0],
          id: e.sets[0].id + "-" + i,
        })),
      };
    }),
  };
  let s = startSession(plan, standardExercises, at(offset));
  let i = 1;
  for (const [id, values] of entries)
    for (const value of values) {
      if (value === null) return s;
      s = confirmSet(
        s,
        position(s).set.id,
        actual(id, value),
        at(offset + i++),
      );
    }
  return s;
}
const data = (completed = [], active = null) => ({
  version: 1,
  completed,
  active,
});
const initial = (p = profile(), d = data()) =>
  initializePlayer("player", at(0), p, d);
const growth = (p) => p.events.filter((e) => e.kind === "growth");
const amount = (e) => e.changes.reduce((sum, x) => sum + x.after - x.before, 0);
const total = (p) =>
  p.events
    .filter((e) => e.kind !== "assessment")
    .reduce((sum, e) => sum + amount(e), 0);
const apply = (p, sessions, active = null, now = at(86400)) =>
  reconcilePlayer(p, data(sessions, active), now);
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
test("missing baseline starts all areas provisional without a second questionnaire", () => {
  const p = initial(null);
  assert.equal(overall(p.ratings), 45);
  for (const a of bodyParts) {
    assert.equal(p.ratings[a], 45);
    assert.equal(p.status[a], "provisional");
  }
});
test("partial baseline assesses primary Chest only", () => {
  const p = initial(profile(["push-up"]));
  assert.equal(p.ratings.Chest, 46);
  assert.equal(p.status.Chest, "assessed");
  assert.equal(p.status.Arms, "provisional");
  assert.equal(p.status.Shoulders, "provisional");
});
test("complete baselines assess Chest, Legs and Core with exact interpolation", () => {
  const p = initial();
  assert.deepEqual(p.ratings, {
    Chest: 46,
    Back: 45,
    Shoulders: 45,
    Arms: 45,
    Core: 48,
    Legs: 43,
  });
  assert.equal(p.status.Core, "assessed");
  assert.equal(p.status.Back, "provisional");
});
test("initialization is deterministic and snapshots baseline evidence", () => {
  const source = profile();
  const a = initial(source),
    b = initial(source);
  assert.deepEqual(a, b);
  source.baselineAssessments[0].actual.reps = 99;
  assert.equal(
    a.baselineEvidence.find((b) => b.exercise.id === "push-up").actual.reps,
    10,
  );
});
test("initial conversion saturates in game range 40-60 and ignores body measurements", () => {
  for (const v of [0, 1, 5, 100, 999]) {
    const p = profile();
    for (const b of p.baselineAssessments) b.actual = actual(b.exercise.id, v);
    p.heightCm = 250;
    p.weightKg = 200;
    const value = initial(p);
    assert.ok(overall(value.ratings) >= 40 && overall(value.ratings) <= 60);
    assert.ok(Object.values(value.ratings).every((n) => n >= 40 && n <= 60));
  }
});
test("first suitable completed performance replaces provisional, even downward", () => {
  const p = apply(initial(null), [history([["push-up", [0]]])]);
  assert.equal(p.ratings.Chest, 40);
  assert.equal(p.status.Chest, "assessed");
  assert.equal(p.events[0].kind, "assessment");
  assert.equal(total(p), 0);
});
test("secondary involvement cannot assess or grow provisional areas", () => {
  const p = apply(initial(null), [history([["push-up", [8, 12]]])]);
  assert.equal(p.status.Arms, "provisional");
  assert.equal(p.ratings.Arms, 45);
  assert.equal(p.status.Core, "provisional");
  assert.ok(p.ratings.Chest > 44);
});
test("already assessed areas never reinitialize from another first record", () => {
  const p = initial();
  const s = history([
    ["push-up", [0]],
    ["bench-press", [[100, 10]]],
  ]);
  const next = apply(p, [s]);
  assert.equal(next.ratings.Chest, p.ratings.Chest);
  assert.equal(next.events.filter((e) => e.kind === "assessment").length, 0);
});
test("unsupported custom/weighted assessments keep provisional with no invented conversion", () => {
  assert.equal(
    assessmentValue(byId("bench-press"), actual("bench-press", [30, 8])),
    null,
  );
  assert.equal(
    assessmentValue(
      { ...byId("push-up"), isCustom: true, difficulty: null },
      actual("push-up", 10),
    ),
    null,
  );
  assert.equal(
    assessmentValue(byId("overhead-press"), actual("overhead-press", [30, 4])),
    null,
  );
  assert.equal(
    assessmentValue(byId("overhead-press"), actual("overhead-press", [30, 5])),
    51,
  );
});
test("first exercise PR is evidence only, not growth", () => {
  const p = apply(initial(), [history()]);
  assert.equal(growth(p).length, 0);
  assert.equal(total(p), 0);
});
test("genuine PR improvement gives bounded fractional growth and normalized relevant areas", () => {
  const s = history([["push-up", [10, 12]]]);
  const p = apply(initial(), [s]);
  assert.equal(growth(p).length, 1);
  assert.ok(total(p) > 0 && total(p) <= c.eventCap);
  assert.ok(p.ratings.Chest % 1 > 0);
  assert.equal(p.ratings.Back, 45);
  assert.equal(p.ratings.Legs, 43);
  assert.ok(isPlayerData({ version: 1, player: p }));
});
test("equal/lower results do not grow or decrease ratings", () => {
  const s = history([["push-up", [10, 10, 3]]]);
  const p = apply(initial(), [s]);
  assert.equal(total(p), 0);
  assert.equal(p.ratings.Chest, 46);
});
test("zero reference produces a fixed bounded ratio, never infinity", () => {
  const s = history([["push-up", [0, 9]]]);
  const comp = derivePersonalRecords([s]).comparisons[1];
  assert.equal(growthSignal(comp).ratio, c.zeroReferenceRatio);
  const p = apply(initial(), [s]);
  assert.ok(Number.isFinite(total(p)) && total(p) > 0);
});
test("weighted max load growth requires maintaining previous max-load rep best", () => {
  const s = history([
    [
      "bench-press",
      [
        [10, 8],
        [12, 8],
      ],
    ],
  ]);
  assert.ok(total(apply(initial(), [s])) > 0);
  const lower = history([
    [
      "bench-press",
      [
        [10, 8],
        [12, 6],
      ],
    ],
  ]);
  assert.equal(total(apply(initial(), [lower])), 0);
});
test("reps at same weight qualify independently, including load zero", () => {
  for (const kg of [0, 10]) {
    const p = apply(initial(), [
      history([
        [
          "bench-press",
          [
            [kg, 8],
            [kg, 10],
          ],
        ],
      ]),
    ]);
    assert.equal(growth(p)[0].metric.metric, "repsAtWeight");
    assert.ok(total(p) > 0);
  }
});
test("first record at a new lower load does not grow", () => {
  assert.equal(
    total(
      apply(initial(), [
        history([
          [
            "bench-press",
            [
              [20, 8],
              [10, 20],
            ],
          ],
        ]),
      ]),
    ),
    0,
  );
});
test("weighted multiple improved metrics select one ratio rather than double-count", () => {
  const s = history([
    [
      "bench-press",
      [
        [10, 8],
        [12, 8],
      ],
    ],
  ]);
  const comp = derivePersonalRecords([s]).comparisons[1];
  comp.metrics.push({
    metric: "repsAtWeight",
    weightKg: 12,
    previous: 7,
    value: 8,
    outcome: "improved",
    relation: "higher",
  });
  assert.equal(growthSignal(comp).metric.metric, "weightKg");
  assert.equal(growthSignal(comp).ratio, 0.2);
});
test("completed distinct exercise PRs receive one affected-area-only bonus", () => {
  const p = apply(initial(), [
    history([
      ["push-up", [10, 12]],
      ["squat", [10, 12]],
    ]),
  ]);
  const b = p.events.filter((e) => e.kind === "bonus");
  assert.equal(b.length, 1);
  assert.ok(amount(b[0]) > 0 && amount(b[0]) <= c.bonusPerExtraExercise);
  assert.ok(
    b[0].changes.every((x) => ["Chest", "Legs", "Core"].includes(x.area)),
  );
  assert.ok(isPlayerData({ version: 1, player: p }));
});
test("many improved sets of one exercise never qualify as distinct exercises", () => {
  const p = apply(initial(), [history([["push-up", [10, 12, 14, 16]]])]);
  assert.equal(p.events.filter((e) => e.kind === "bonus").length, 0);
});
test("first records of multiple exercises do not earn bonus", () => {
  const p = apply(initial(), [
    history([
      ["push-up", [10]],
      ["squat", [10]],
    ]),
  ]);
  assert.equal(p.events.length, 0);
});
test("active sets grow but session bonus waits for completion and is awarded once", () => {
  const active = history([
    ["push-up", [10, 12]],
    ["squat", [10, 12, null]],
  ]);
  let p = apply(initial(), [], active);
  assert.equal(p.events.filter((e) => e.kind === "bonus").length, 0);
  const done = confirmSet(
    active,
    position(active).set.id,
    { type: "reps", reps: 9 },
    at(20),
  );
  p = apply(p, [done]);
  assert.equal(p.events.filter((e) => e.kind === "bonus").length, 1);
  assert.deepEqual(apply(p, [done]), p);
  const catchup = apply(initial(), [done]);
  assert.deepEqual(catchup, p);
});
test("early multipliers use initialization weeks, not merely elapsed time", () => {
  for (const [week, multiplier] of [1.25, 1.2, 1.15, 1.1, 1, 1].entries())
    assert.equal(earlyMultiplier(at(0), at(week * 7 * 86400)), multiplier);
  const p = initial();
  assert.deepEqual(apply(p, [], null, at(100 * 86400)), p);
});
test("high ratings diminish growth and retain a finite floor", () => {
  assert.ok(diminishing(80) < diminishing(50));
  assert.equal(diminishing(99), c.diminishingFloor);
});
test("huge jumps respect event cap; repeated gains respect workout/day total caps", () => {
  const old = history([["push-up", [1]]], -50);
  const p = initial(profile(), data([old]));
  const s = history([
    ["push-up", Array.from({ length: 20 }, (_, i) => 2 ** (i + 1))],
  ]);
  const one = apply(p, [old, s]);
  assert.ok(total(one) <= c.workoutCap + 1e-9);
  assert.ok(growth(one).every((e) => amount(e) <= c.eventCap + 1e-9));
  const many = Array.from({ length: 20 }, (_, i) =>
    history([["push-up", [2 ** (i + 1)]]], 10 + i * 10),
  );
  const all = apply(p, [old, ...many]);
  assert.ok(total(all) <= c.dayCap + 1e-9);
  assert.ok(total(all) > c.dayCap - 1e-7);
});
test("rating and OVR upper bounds and floor display are consistent", () => {
  assert.equal(displayRating(58.99), 58);
  assert.equal(displayRating(100), 99);
  assert.equal(
    overall(Object.fromEntries(bodyParts.map((a) => [a, 99.5]))),
    99,
  );
  const p = initial();
  p.ratings.Chest = 98.9999;
  const next = apply(p, [history([["push-up", [1, 999]]])]);
  assert.ok(next.ratings.Chest <= 99);
  assert.ok(next.ratings.Chest >= p.ratings.Chest);
});
test("existing history supplies PR reference without retroactive growth or assessment", () => {
  const old = history([["push-up", [8, 12]]], -50);
  const p = initial(null, data([old]));
  assert.equal(p.events.length, 0);
  assert.equal(p.status.Chest, "provisional");
  assert.deepEqual(apply(p, [old]), p);
  const next = apply(p, [old, history([["push-up", [10]]])]);
  assert.equal(next.status.Chest, "assessed");
  assert.equal(next.ratings.Chest, 46);
  assert.equal(total(next), 0);
});
test("new post-initialization improvement can compare with old history", () => {
  const old = history([["push-up", [10]]], -50);
  const p = initial(profile(), data([old]));
  const next = apply(p, [old, history([["push-up", [12]]])]);
  assert.ok(total(next) > 0);
});
test("no growth from targets, baselines, unconfirmed or zero-rep weighted sets", () => {
  const p = initial();
  assert.equal(p.events.length, 0);
  const active = history([["push-up", [null]]]);
  active.exercises[0].sets[0].target.reps = 999;
  assert.equal(total(apply(p, [], active)), 0);
  assert.equal(
    total(
      apply(p, [
        history([
          [
            "bench-press",
            [
              [10, 8],
              [100, 0],
            ],
          ],
        ]),
      ]),
    ),
    0,
  );
});
test("allocation normalizes multiple primary labels, secondary weights are smaller", () => {
  const allocation = allocationFor(byId("dead-hang"));
  assert.ok(
    Math.abs(Object.values(allocation).reduce((s, n) => s + n, 0) - 1) < 1e-9,
  );
  assert.equal(allocation.Back, allocation.Arms);
  assert.ok(allocation.Shoulders < allocation.Back);
});
test("profile edits, template changes and snapshot renaming cannot reset established growth", () => {
  const p = profile();
  const s = history([["push-up", [10, 12]]]);
  const established = apply(initial(p), [s]);
  p.baselineAssessments[0].actual.reps = 99;
  p.heightCm = 200;
  s.name = "Renamed plan";
  s.exercises[0].exercise.name = "Renamed exercise";
  s.sourceWorkoutId = "deleted-template";
  s.exercises[0].sets[0].target.reps = 99;
  assert.deepEqual(apply(established, [s]), established);
  assert.equal(
    established.baselineEvidence.find((b) => b.exercise.id === "push-up").actual
      .reps,
    10,
  );
});
test("missing authoritative history blocks new reconciliation without losing ratings", () => {
  const s = history([["push-up", [10, 12]]]);
  const p = apply(initial(), [s]);
  assert.throws(() => apply(p, []), /missing/);
  assert.ok(p.ratings.Chest > 46);
});
test("reconciliation is detached and deterministic under repeated/shuffled history", () => {
  const a = history([["push-up", [10, 12]]]),
    b = history([["squat", [10, 12]]], 30);
  const p = initial();
  const before = JSON.stringify([p, a, b]);
  assert.deepEqual(apply(p, [a, b]), apply(p, [b, a]));
  assert.equal(JSON.stringify([p, a, b]), before);
});
test("repository reload, remount, duplicate callbacks and initialization persist exactly once", async () => {
  const adapter = memory();
  let now = at(0);
  let repo = new PlayerRepository(adapter, () => now);
  await repo.load();
  await Promise.all([
    repo.initialize(profile(), data()),
    repo.initialize(null, data()),
  ]);
  now = at(86400);
  const s = history([
    ["push-up", [10, 12]],
    ["squat", [10, 12]],
  ]);
  const [first, again] = await Promise.all([
    repo.reconcile(data([s])),
    repo.reconcile(data([s])),
  ]);
  assert.deepEqual(first, again);
  repo = new PlayerRepository(adapter, () => now);
  assert.deepEqual(await repo.load(), first);
  assert.deepEqual(await repo.reconcile(data([s])), first);
  assert.equal(first.player.events.filter((e) => e.kind === "bonus").length, 1);
});
test("repository writes only player key, detaches submissions/results, and preserves initial profile", async () => {
  const adapter = memory();
  adapter.values.set("ascend.coach.v1", "keep profile");
  adapter.values.set("ascend.sessions.v1", "keep history");
  let now = at(0);
  const repo = new PlayerRepository(adapter, () => now);
  await repo.load();
  const p = profile();
  const pending = repo.initialize(p, data());
  p.baselineAssessments[0].actual.reps = 99;
  const saved = await pending;
  assert.equal(
    saved.player.baselineEvidence.find((b) => b.exercise.id === "push-up")
      .actual.reps,
    10,
  );
  saved.player.ratings.Chest = 99;
  assert.equal((await repo.load()).player.ratings.Chest, 46);
  assert.equal(adapter.values.get("ascend.coach.v1"), "keep profile");
  assert.equal(adapter.values.get("ascend.sessions.v1"), "keep history");
  assert.equal(adapter.values.size, 3);
});
test("failed growth write preserves ratings and retries the pending event once", async () => {
  const adapter = memory();
  let now = at(0);
  const repo = new PlayerRepository(adapter, () => now);
  await repo.load();
  await repo.initialize(profile(), data());
  now = at(86400);
  const write = adapter.write;
  adapter.write = async () => {
    throw new Error("disk full");
  };
  const s = history([["push-up", [10, 12]]]);
  await assert.rejects(repo.reconcile(data([s])), /disk full/);
  assert.equal((await repo.load()).player.ratings.Chest, 46);
  adapter.write = write;
  const saved = await repo.reconcile(data([s]));
  assert.equal(growth(saved.player).length, 1);
  assert.deepEqual(await repo.reconcile(data([s])), saved);
});
test("malformed/unsupported storage is preserved and failed load blocks stale writes", async () => {
  const adapter = memory();
  const repo = new PlayerRepository(adapter, () => at(0));
  await repo.load();
  await repo.initialize(null, data());
  for (const raw of [
    "broken",
    JSON.stringify({ version: 2, player: null }),
    JSON.stringify({ version: 1, player: { id: "x" } }),
  ]) {
    adapter.values.set(PLAYER_KEY, raw);
    await assert.rejects(repo.load());
    await assert.rejects(repo.initialize(null, data()), /not loaded/);
    assert.equal(adapter.values.get(PLAYER_KEY), raw);
  }
});
test("rating tampering or malformed ledger cannot load as a valid player", () => {
  const s = history([["push-up", [10, 12]]]);
  const d = { version: 1, player: apply(initial(), [s]) };
  assert.ok(isPlayerData(d));
  const bad = JSON.parse(JSON.stringify(d));
  bad.player.ratings.Chest += 1;
  assert.equal(isPlayerData(bad), false);
  const invalid = JSON.parse(JSON.stringify(d));
  invalid.player.events[0].changes[0].after = NaN;
  assert.equal(isPlayerData(invalid), false);
});

test("new backdated results cannot silently alter already-awarded historical comparisons", () => {
  const latest = history([["push-up", [10, 12]]], 100);
  const p = apply(initial(), [latest]);
  const backdated = history([["push-up", [11]]], 50);
  assert.throws(() => apply(p, [latest, backdated]), /predates/);
});
test("future timestamps fail without consuming events and can retry after clock catches up", () => {
  const s = history([["push-up", [10, 12]]], 100);
  const p = initial();
  assert.throws(() => apply(p, [s], null, at(20)), /clock/);
  assert.equal(p.events.length, 0);
  assert.ok(total(apply(p, [s], null, at(200))) > 0);
});
test("failed initialization never publishes or overwrites another storage boundary", async () => {
  const adapter = memory();
  const repo = new PlayerRepository(adapter, () => at(0));
  await repo.load();
  const write = adapter.write;
  adapter.write = async () => {
    throw new Error("disk full");
  };
  await assert.rejects(repo.initialize(profile(), data()), /disk full/);
  assert.deepEqual(await repo.load(), { version: 1, player: null });
  adapter.write = write;
  assert.ok((await repo.initialize(profile(), data())).player);
  assert.equal(adapter.values.size, 1);
});
test("allocation cannot confirm an unsupported provisional area even on a real PR", () => {
  const p = apply(initial(null), [
    history([
      [
        "bench-press",
        [
          [10, 8],
          [12, 8],
        ],
      ],
    ]),
  ]);
  assert.equal(p.status.Chest, "provisional");
  assert.equal(p.ratings.Chest, 45);
  assert.equal(total(p), 0);
});
