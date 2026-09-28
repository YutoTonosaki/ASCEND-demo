const { test } = require("node:test");
const assert = require("node:assert/strict");
const D = require("../src/rewards/domain.ts");
const {
  RewardsRepository,
  REWARDS_KEY,
} = require("../src/storage/rewards-repository.ts");
const { standardExercises } = require("../src/data/exercises.ts");
const { newWorkout, newEntry } = require("../src/training/plans.ts");
const {
  startSession,
  confirmSet,
  position,
} = require("../src/sessions/domain.ts");
function session(at = "2026-09-21T12:00:00.000Z", reps = 1) {
  const e = newEntry(standardExercises.find((x) => x.id === "push-up"));
  const p = {
    ...newWorkout(),
    name: "Reward test",
    exercises: [{ ...e, restSeconds: 0, sets: e.sets.slice(0, 1) }],
  };
  let s = startSession(p, standardExercises, at);
  return confirmSet(s, position(s).set.id, { type: "reps", reps }, at);
}
function intent(id, day = "2026-09-21") {
  return {
    sessionId: id,
    playerId: "p",
    completedAt: day + "T12:00:00.000Z",
    localDay: day,
    weekId: D.weekId(day),
    offsetMinutes: 0,
  };
}
function storage() {
  const values = new Map();
  return {
    values,
    writes: 0,
    fail: false,
    readFail: false,
    async read(k) {
      if (this.readFail) throw Error("read");
      return values.get(k) ?? null;
    },
    async write(k, v) {
      assert.equal(k, REWARDS_KEY);
      if (this.fail) throw Error("write");
      this.writes++;
      values.set(k, v);
    },
    async remove() {
      assert.fail("no removal");
    },
  };
}
test("first completed local day awards 10", () =>
  assert.equal(D.balance(D.applyReward(D.emptyRewards(), intent("a"))), 10));
test("same day second workout awards zero and records receipt", () => {
  let d = D.applyReward(D.emptyRewards(), intent("a"));
  d = D.applyReward(d, intent("b"));
  assert.equal(D.balance(d), 10);
  assert.equal(D.sessionRewards(d, "b").total, 0);
  assert.equal(d.receipts.length, 2);
});
test("next local day awards another 10", () => {
  let d = D.applyReward(D.emptyRewards(), intent("a"));
  d = D.applyReward(d, intent("b", "2026-09-22"));
  assert.equal(D.balance(d), 20);
});
test("three sessions on one day count once", () => {
  let d = D.emptyRewards();
  for (const id of ["a", "b", "c"]) d = D.applyReward(d, intent(id));
  assert.equal(D.weeklyDays(d, "2026-09-21"), 1);
  assert.equal(D.balance(d), 10);
});
test("three distinct days give 60 total and a 40 third-day result", () => {
  let d = D.emptyRewards();
  for (let i = 0; i < 3; i++)
    d = D.applyReward(d, intent("s" + i, "2026-09-" + (21 + i)));
  assert.equal(D.balance(d), 60);
  assert.equal(D.sessionRewards(d, "s2").total, 40);
  assert.equal(
    d.transactions.filter((t) => t.type === "weekly-consistency").length,
    1,
  );
});
test("fourth through seventh days give daily only and cap UI at three", () => {
  let d = D.emptyRewards();
  for (let i = 0; i < 7; i++)
    d = D.applyReward(d, intent("s" + i, "2026-09-" + (21 + i)));
  assert.equal(D.balance(d), 100);
  assert.equal(D.weeklyDays(d, "2026-09-21"), 3);
  assert.equal(D.sessionRewards(d, "s6").total, 10);
});
test("third-day callback retry is idempotent", () => {
  let d = D.emptyRewards();
  for (let i = 0; i < 3; i++)
    d = D.applyReward(d, intent("s" + i, "2026-09-" + (21 + i)));
  assert.strictEqual(D.applyReward(d, intent("s2", "2026-09-23")), d);
});
test("repeated session cannot be moved by a timezone/date or Player initialization change", () => {
  const d = D.applyReward(D.emptyRewards(), intent("s"));
  assert.strictEqual(
    D.applyReward(d, { ...intent("s", "2026-09-22"), playerId: "new" }),
    d,
  );
  assert.equal(d.receipts[0].localDay, "2026-09-21");
});
test("initializing Player does not reset same-day entitlement", () => {
  let d = D.applyReward(D.emptyRewards(), { ...intent("a"), playerId: null });
  d = D.applyReward(d, { ...intent("b"), playerId: "initialized" });
  assert.equal(D.balance(d), 10);
});
for (const [day, week] of [
  ["2026-09-27", "2026-09-21"],
  ["2026-09-28", "2026-09-28"],
  ["2026-10-01", "2026-09-28"],
  ["2021-01-01", "2020-12-28"],
  ["2021-01-04", "2021-01-04"],
  ["2024-02-29", "2024-02-26"],
  ["2024-03-01", "2024-02-26"],
])
  test(`calendar ${day} belongs to Monday ${week}`, () =>
    assert.equal(D.weekId(day), week));
test("invalid/leap calendar dates are rejected", () => {
  for (const d of ["2023-02-29", "2024-13-01", "2024-2-1", "bad"])
    assert.throws(() => D.weekId(d));
});
test("local midnight differs from UTC date and freezes resolved offset", () => {
  const old = process.env.TZ;
  try {
    process.env.TZ = "America/Los_Angeles";
    const a = D.captureReward(session("2026-09-22T06:55:00.000Z"), null),
      b = D.captureReward(session("2026-09-22T07:05:00.000Z"), null);
    assert.equal(a.localDay, "2026-09-21");
    assert.equal(b.localDay, "2026-09-22");
    assert.equal(a.offsetMinutes, 420);
    let d = D.applyReward(D.emptyRewards(), a);
    d = D.applyReward(d, b);
    const raw = JSON.stringify(d);
    process.env.TZ = "Asia/Tokyo";
    assert.deepEqual(D.parseRewards(raw), d);
    assert.equal(D.balance(d), 20);
  } finally {
    if (old === undefined) delete process.env.TZ;
    else process.env.TZ = old;
  }
});
test("DST calendar uses local components without 24-hour assumptions", () => {
  const old = process.env.TZ;
  try {
    process.env.TZ = "America/New_York";
    assert.equal(D.localDay(new Date("2026-03-09T03:59:00Z")), "2026-03-08");
    assert.equal(D.localDay(new Date("2026-03-09T04:01:00Z")), "2026-03-09");
  } finally {
    if (old === undefined) delete process.env.TZ;
    else process.env.TZ = old;
  }
});
test("no-PR, no-growth and explicit zero completed results qualify independently", () => {
  for (const reps of [0, 1]) {
    const r = D.captureReward(session(undefined, reps), null);
    assert.equal(D.balance(D.applyReward(D.emptyRewards(), r)), 10);
  }
});
test("incomplete or abandoned session and targets cannot qualify", () => {
  const s = session();
  assert.throws(() =>
    D.captureReward({ ...s, status: "active", completedAt: null }, null),
  );
  assert.throws(() => D.captureReward(newWorkout(), null));
});
test("new week starts at zero without changing old balance/bonus", () => {
  let d = D.emptyRewards();
  for (let i = 0; i < 3; i++)
    d = D.applyReward(d, intent("s" + i, "2026-09-" + (21 + i)));
  assert.equal(D.weeklyDays(d, "2026-09-28"), 0);
  assert.equal(D.balance(d), 60);
  assert.equal(d.transactions.at(-1).weekId, "2026-09-21");
});
test("repository missing load is read-only; old history/startup has no award", async () => {
  const a = storage(),
    r = new RewardsRepository(a);
  assert.deepEqual(await r.load(), D.emptyRewards());
  assert.equal(a.writes, 0);
  assert.equal(a.values.size, 0);
});
test("reload/remount and concurrent duplicate requests give one durable award", async () => {
  const a = storage(),
    r = new RewardsRepository(a);
  await Promise.all([r.award(intent("a")), r.award(intent("a"))]);
  const other = new RewardsRepository(a);
  assert.equal(D.balance(await other.award(intent("a"))), 10);
  assert.equal(a.writes, 1);
});
test("atomic third-day commit includes receipt, daily and weekly together", async () => {
  const a = storage(),
    r = new RewardsRepository(a);
  await r.award(intent("a"));
  await r.award(intent("b", "2026-09-22"));
  a.fail = true;
  await assert.rejects(r.award(intent("c", "2026-09-23")));
  assert.equal(D.balance(await r.load()), 20);
  a.fail = false;
  const d = await r.award(intent("c", "2026-09-23"));
  assert.equal(D.balance(d), 60);
  assert.equal(a.writes, 3);
  assert.equal(D.balance(await r.award(intent("c", "2026-09-23"))), 60);
});
test("failed reward write never touches saved workout or Player keys", async () => {
  const a = storage();
  a.values.set("ascend.sessions.v1", JSON.stringify(session()));
  a.values.set("ascend.player.v1", "unchanged");
  const before = [...a.values];
  a.fail = true;
  await assert.rejects(new RewardsRepository(a).award(intent("a")));
  assert.deepEqual([...a.values], before);
});
for (const raw of [
  "broken",
  '{"version":2,"receipts":[],"transactions":[]}',
  '{"version":1,"receipts":[],"transactions":[{"amount":10}]}',
])
  test("damaged/unsupported store stays unchanged: " + raw, async () => {
    const a = storage();
    a.values.set(REWARDS_KEY, raw);
    const r = new RewardsRepository(a);
    await assert.rejects(r.load());
    await assert.rejects(r.award(intent("a")));
    assert.equal(a.values.get(REWARDS_KEY), raw);
    assert.equal(a.writes, 0);
  });
test("unreadable storage blocks writes and retries safely", async () => {
  const a = storage(),
    r = new RewardsRepository(a);
  a.readFail = true;
  await assert.rejects(r.award(intent("a")));
  assert.equal(a.writes, 0);
  a.readFail = false;
  assert.equal(D.balance(await r.award(intent("a"))), 10);
});
test("ledger rejects altered amount, duplicate transaction and missing weekly award", () => {
  let d = D.emptyRewards();
  for (let i = 0; i < 3; i++)
    d = D.applyReward(d, intent("s" + i, "2026-09-" + (21 + i)));
  for (const change of [
    (x) => (x.transactions[0].amount = 100),
    (x) => x.transactions.push(x.transactions[0]),
    (x) => x.transactions.pop(),
  ]) {
    const x = structuredClone(d);
    change(x);
    assert.throws(() => D.parseRewards(JSON.stringify(x)));
  }
});
test("detached submission and result cannot mutate saved ledger", async () => {
  const a = storage(),
    r = new RewardsRepository(a),
    i = intent("a");
  const job = r.award(i);
  i.localDay = "bad";
  const d = await job;
  d.transactions[0].amount = 999;
  assert.equal(D.balance(await r.load()), 10);
});
test("deterministic day/week identity does not depend on session or growth", () => {
  assert.equal(
    D.rewardId("daily-workout", "2026-09-21"),
    '["local-player","2026-09-21","daily-workout"]',
  );
  assert.notEqual(
    D.rewardId("daily-workout", "2026-09-21"),
    D.rewardId("weekly-consistency", "2026-09-21"),
  );
});
const { RewardsController } = require("../src/rewards/controller.ts");
test("fresh intent controller never scans history and waits for finalized growth", () => {
  const c = new RewardsController(),
    s = session();
  assert.deepEqual(c.claim([s.id], true), []);
  c.request(s, "p", () => {});
  assert.deepEqual(c.claim([], false), []);
  assert.equal(c.claim([s.id], false).length, 1);
  assert.deepEqual(c.claim([s.id], false), []);
});
test("growth error/no Player does not disqualify Coins and settlement happens once", () => {
  const c = new RewardsController(),
    s = session();
  let calls = 0;
  c.request(s, null, () => calls++);
  assert.equal(c.claim([], true).length, 1);
  c.finish(s.id, "failed")();
  assert.equal(calls, 1);
  c.retryFailed();
  assert.equal(c.claim([], true).length, 1);
  assert.equal(c.finish(s.id, "saved"), null);
  c.request(s, null, () => calls++);
  assert.deepEqual(c.claim([], true), []);
  assert.equal(calls, 1);
});
test("controller restart drops uncommitted intents instead of awarding history", () => {
  const s = session(),
    c = new RewardsController();
  c.request(s, "p", () => {});
  const fresh = new RewardsController();
  assert.deepEqual(fresh.claim([s.id], true), []);
});
