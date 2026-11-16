const { test } = require("node:test");
const assert = require("node:assert/strict");
const { eligibleXPActual, calculateDailyXP, xpSetIdentity, dailyXPAwardIdentity } = require("../src/xp/domain.ts");
const { cumulativeXPForLevel, xpForNextLevel, levelProgress } = require("../src/xp/level.ts");
const { workout } = require("./fixtures/session-progression.cjs");
const activation = { activatedAt: "2026-09-21T00:00:00.000Z", excludedSessionIds: [] };
function input(count = 1, actual = { type: "reps", reps: 5 }, at = "2026-09-21T12:00:00.000Z", day = "2026-09-21", offset = 0) {
  const exercise = actual.type === "time" ? "plank" : actual.type === "weight_reps" ? "bench-press" : "squat";
  const session = workout([[exercise, Array.from({ length: count }, () => actual)]], 20).completed;
  session.startedAt = new Date(Date.parse(at) - 1000).toISOString();
  session.completedAt = at;
  for (const entry of session.exercises) for (const set of entry.sets) set.result.confirmedAt = at;
  return { session, completionDay: { localDay: day, offsetMinutes: offset } };
}
for (const [actual, type, expected] of [
  [{ type: "reps", reps: 4 }, "reps", false], [{ type: "reps", reps: 5 }, "reps", true],
  [{ type: "time", seconds: 19 }, "time", false], [{ type: "time", seconds: 20 }, "time", true],
  [{ type: "weight_reps", reps: 5, weightKg: 0 }, "weight_reps", true],
  [{ type: "weight_reps", reps: 5, weightKg: 12.5 }, "weight_reps", true],
  [{ type: "weight_reps", reps: 4, weightKg: 100 }, "weight_reps", false],
  [{ type: "weight_reps", reps: 5, weightKg: -1 }, "weight_reps", false],
  [{ type: "weight_reps", reps: 5, weightKg: Infinity }, "weight_reps", false],
  [{ type: "weight_reps", reps: 5 }, "weight_reps", false],
  [{ type: "reps", reps: 0 }, "reps", false], [{ type: "reps", reps: 5.5 }, "reps", false],
  [{ type: "reps", reps: NaN }, "reps", false], [null, "reps", false],
  [undefined, "reps", false], [{ type: "reps", reps: 5 }, "time", false],
  [{ type: "distance", reps: 5 }, "distance", false],
]) test(`actual ${JSON.stringify(actual)} / ${type} eligibility ${expected}`, () => {
  assert.equal(eligibleXPActual(actual, type), expected);
});
for (let n = 1; n <= 5; n++) test(`${n} sets produce capped entitlement`, () => {
  const [r] = calculateDailyXP([input(n)], activation);
  assert.equal(r.eligibleSetCount, n);
  assert.equal(r.entitlement, Math.min(15 * n, 60));
  assert.equal(r.incrementalXP, r.entitlement);
});
test("time and weighted completion types use their existing actual validation", () => {
  assert.equal(calculateDailyXP([input(1, { type: "time", seconds: 20 })], activation)[0].entitlement, 15);
  assert.equal(calculateDailyXP([input(1, { type: "weight_reps", reps: 5, weightKg: 0 })], activation)[0].entitlement, 15);
});
test("valid low results record zero entitlement", () => {
  assert.equal(calculateDailyXP([input(1, { type: "reps", reps: 4 })], activation)[0].entitlement, 0);
});
test("active and unconfirmed sessions contribute no XP; malformed completed evidence rejects", () => {
  const active = workout([["squat", [{ type: "reps", reps: 5 }]]], 20).active;
  assert.deepEqual(calculateDailyXP([{ session: active, completionDay: null }], activation), []);
  const broken = input(); broken.session.exercises[0].sets[0].result = null;
  assert.throws(() => calculateDailyXP([broken], activation));
  const invalid = input(); invalid.session.exercises[0].sets[0].result.actual.reps = -1;
  assert.throws(() => calculateDailyXP([invalid], activation));
});
test("confirmed prefix of active workout still earns zero XP", () => {
  const completed = input(2);
  completed.session.status = "active"; completed.session.completedAt = null;
  completed.session.exercises[0].sets[1].result = null;
  assert.deepEqual(calculateDailyXP([completed], activation), []);
});
test("same-day sessions aggregate and retries subtract the authoritative paid amount", () => {
  const a = input(2), b = input(3);
  assert.equal(calculateDailyXP([a], activation)[0].entitlement, 30);
  assert.equal(calculateDailyXP([a, b], activation, { "2026-09-21": 30 })[0].incrementalXP, 30);
  assert.equal(calculateDailyXP([a, b, a, b], activation, { "2026-09-21": 60 })[0].incrementalXP, 0);
  assert.deepEqual(calculateDailyXP([a, b], activation), calculateDailyXP([b, a], activation));
});
test("duplicate session is deduplicated, conflicting duplicates reject", () => {
  const a = input();
  assert.equal(calculateDailyXP([a, structuredClone(a)], activation)[0].entitlement, 15);
  const changed = structuredClone(a); changed.session.exercises[0].sets[0].result.actual.reps = 6;
  assert.throws(() => calculateDailyXP([a, changed], activation), /Conflicting/);
});
test("set identity is scoped to session; duplicate set IDs within a session reject", () => {
  const a = input(), b = input();
  b.session.exercises[0].sets[0].id = a.session.exercises[0].sets[0].id;
  assert.equal(calculateDailyXP([a, b], activation)[0].eligibleSetCount, 2);
  const c = input(2); c.session.exercises[0].sets[1].id = c.session.exercises[0].sets[0].id;
  assert.throws(() => calculateDailyXP([c], activation));
  assert.notEqual(xpSetIdentity("a", "set"), xpSetIdentity("b", "set"));
  assert.equal(dailyXPAwardIdentity("2026-09-21"), '["local-player","2026-09-21","training-xp"]');
});
test("PR and Growth inputs are not needed; first recorded completion earns XP", () => {
  assert.equal(calculateDailyXP([input()], activation)[0].entitlement, 15);
});
test("pre-activation and excluded historical sessions are skipped without calendar invention", () => {
  const old = input(); old.completionDay = null;
  const context = { ...activation, activatedAt: "2026-09-22T00:00:00.000Z" };
  assert.deepEqual(calculateDailyXP([old], context), []);
  assert.deepEqual(calculateDailyXP([old], { ...activation, excludedSessionIds: [old.session.id] }), []);
  const boundary = input(1, undefined, activation.activatedAt);
  assert.equal(calculateDailyXP([boundary], activation)[0].entitlement, 15);
});
test("completion local midnight splits caps even on the same UTC day", () => {
  const a = input(4, undefined, "2026-09-22T06:59:59.000Z", "2026-09-21", 420);
  const b = input(4, undefined, "2026-09-22T07:00:00.000Z", "2026-09-22", 420);
  assert.deepEqual(calculateDailyXP([a, b], activation).map(d => d.entitlement), [60, 60]);
});
test("DST spring and fall captured offsets retain one local day cap", () => {
  const context = { ...activation, activatedAt: "2026-01-01T00:00:00.000Z" };
  const spring = [input(2, undefined, "2026-03-08T09:59:59.000Z", "2026-03-08", 480),
    input(3, undefined, "2026-03-08T10:00:00.000Z", "2026-03-08", 420)];
  const fall = [input(2, undefined, "2026-11-01T08:30:00.000Z", "2026-11-01", 420),
    input(3, undefined, "2026-11-01T09:30:00.000Z", "2026-11-01", 480)];
  for (const values of [spring, fall]) assert.equal(calculateDailyXP(values, context)[0].entitlement, 60);
});
test("bad calendar/offset and conflicting travel context fail closed", () => {
  for (const calendar of [null, { localDay: "2026-09-20", offsetMinutes: 0 },
    { localDay: "2026-02-30", offsetMinutes: 0 }, { localDay: "2026-09-21", offsetMinutes: 900 }]) {
    assert.throws(() => calculateDailyXP([{ ...input(), completionDay: calendar }], activation));
  }
  const a = input(1, undefined, "2026-09-21T01:00:00.000Z");
  const b = structuredClone(a); b.completionDay = { localDay: "2026-09-20", offsetMinutes: 420 };
  assert.throws(() => calculateDailyXP([a, b], activation), /Conflicting/);
});
test("missing paid-day evidence and invalid paid amounts cannot create incremental XP", () => {
  for (const paid of [1, -15, 75, NaN, 30]) {
    assert.throws(() => calculateDailyXP([input()], activation, { "2026-09-21": paid }));
  }
  assert.throws(() => calculateDailyXP([], activation, { "2026-09-21": 15 }));
  const inherited = Object.create({ "2026-09-21": -15 });
  assert.equal(calculateDailyXP([input()], activation, inherited)[0].incrementalXP, 15);
});
test("later-day incremental totals are independent of processing order", () => {
  const a = input(1), b = input(2), c = input(1, undefined, "2026-09-22T12:00:00.000Z", "2026-09-22");
  assert.deepEqual(calculateDailyXP([a, b, c], activation, { "2026-09-21": 15 }),
    calculateDailyXP([c, b, a], activation, { "2026-09-21": 15 }));
});
test("leap day and non-hour completion offset validate without current timezone", () => {
  const a = input(1, undefined, "2024-02-28T20:00:00.000Z", "2024-02-29", -345);
  assert.equal(calculateDailyXP([a], { ...activation, activatedAt: "2024-01-01T00:00:00.000Z" })[0].entitlement, 15);
});
test("no mutation, current timezone dependency, or persistence calls", () => {
  const a = input(), before = JSON.stringify(a);
  const original = Date.prototype.getTimezoneOffset;
  Date.prototype.getTimezoneOffset = () => { throw Error("Current timezone access forbidden"); };
  try { assert.deepEqual(calculateDailyXP([a], activation), calculateDailyXP([a], activation)); }
  finally { Date.prototype.getTimezoneOffset = original; }
  assert.equal(JSON.stringify(a), before);
});
for (const [xp, level] of [[0, 1], [99, 1], [100, 2], [224, 2], [225, 3], [375, 4], [1800, 10], [6175, 20]]) {
  test(`${xp} XP derives Level ${level}`, () => {
    const r = levelProgress(xp);
    assert.equal(r.level, level);
    assert.equal(r.xpIntoLevel + r.xpRemaining, r.xpRequired);
    assert.ok(r.xpAtLevel <= BigInt(xp) && BigInt(xp) < r.xpAtNextLevel);
  });
}
test("level curve thresholds, jumps, and large values are exact", () => {
  assert.equal(cumulativeXPForLevel(1), 0n);
  assert.equal(cumulativeXPForLevel(3), 225n);
  assert.equal(cumulativeXPForLevel(50), 34300n);
  assert.equal(xpForNextLevel(50), 1325n);
  for (const n of [1000000, 1000000000000, Number.MAX_SAFE_INTEGER]) {
    const r = levelProgress(n);
    assert.ok(r.xpAtLevel <= BigInt(n) && r.xpAtNextLevel > BigInt(n));
    assert.ok(Number.isSafeInteger(r.xpRequired) && Number.isSafeInteger(r.xpRemaining));
  }
  assert.ok(levelProgress(Number.MAX_SAFE_INTEGER).xpAtNextLevel > BigInt(Number.MAX_SAFE_INTEGER));
  assert.ok(cumulativeXPForLevel(Number.MAX_SAFE_INTEGER) > BigInt(Number.MAX_SAFE_INTEGER));
});
test("negative, fractional, nonfinite and unsafe XP/Level inputs reject", () => {
  for (const n of [-1, .5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => levelProgress(n), RangeError);
  for (const n of [0, -1, 1.5, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => cumulativeXPForLevel(n), RangeError);
    assert.throws(() => xpForNextLevel(n), RangeError);
  }
});
