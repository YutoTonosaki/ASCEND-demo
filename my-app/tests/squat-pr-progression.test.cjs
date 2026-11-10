const { test } = require("node:test");
const assert = require("node:assert/strict");
const { squatPRFixture, at, data } = require("./fixtures/session-progression.cjs");
const { SessionRepository, SESSION_KEY } = require("../src/storage/session-repository.ts");
const { PlayerRepository, PLAYER_KEY } = require("../src/storage/player-repository.ts");
const { sessionProgression, formatGrowthDelta } = require("../src/growth/session-progression.ts");
const { derivePersonalRecords } = require("../src/records/domain.ts");
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-12,
  `${actual} differs from ${expected}`);

test("Squat 30 to 35 persists one improved set, fractional Legs/Core growth and unchanged OVR", async () => {
  const f = squatPRFixture();
  const initial = new Map([
    [SESSION_KEY, JSON.stringify({ ...data(f.previous), active: f.active })],
    [PLAYER_KEY, JSON.stringify({ version: 1, player: f.before })],
    ["isolated-unrelated", "preserved"],
  ]);
  const values = new Map(initial), writes = [];
  const adapter = {
    async read(key) { return values.get(key) ?? null; },
    async write(key, value) { writes.push(key); values.set(key, value); },
    async remove() { throw Error("Test scenario must never remove storage"); },
  };
  const sessions = new SessionRepository(adapter, () => at(40));
  const player = new PlayerRepository(adapter, () => at(40));
  await sessions.load();
  await player.load();
  assert.equal(derivePersonalRecords([f.previous]).records[0].best.value, 30);
  const done = await sessions.commit({ type: "confirm", sessionId: f.active.id,
    setId: f.active.exercises[0].sets[0].id, actual: { type: "reps", reps: 35 } });
  assert.equal(done.active, null);
  assert.equal(done.completed[0].status, "completed");
  const pending = sessionProgression(f.active.id, done, await player.load());
  assert.equal(pending.state, "pending");
  assert.equal(pending.records.sets.length, 1);
  assert.deepEqual(pending.growth, []);
  const awarded = await player.reconcile(done);
  const result = sessionProgression(f.active.id, done, awarded);
  assert.equal(result.state, "ready");
  assert.equal(result.records.sets.length, 1);
  assert.equal(result.records.sets[0].exerciseId, "squat");
  assert.deepEqual(result.records.sets[0].metrics.map(m => [m.previous, m.value, m.outcome]),
    [[30, 35, "improved"]]);
  assert.deepEqual(result.assessments, []);
  assert.deepEqual(result.growth.map(c => c.area), ["Core", "Legs"]);
  close(result.growth.find(c => c.area === "Legs").delta, 0.1019774011299435);
  close(result.growth.find(c => c.area === "Core").delta, 0.0273728813559322);
  assert.deepEqual(result.growth.map(c => [c.area, formatGrowthDelta(c.delta)]),
    [["Core", "0.03"], ["Legs", "0.10"]]);
  assert.deepEqual(result.ovr, { before: 46, after: 46 });
  assert.equal(result.explainUnchangedOVR, true);
  const events = awarded.player.events.filter(e => e.sessionId === f.active.id);
  assert.deepEqual(events.map(e => e.kind), ["growth"]);
  assert.equal(events[0].metric.previous, 30);
  assert.equal(events[0].metric.value, 35);
  const saved = [...values];
  const writeCount = writes.length;
  await sessions.commit({ type: "confirm", sessionId: f.active.id,
    setId: f.active.exercises[0].sets[0].id, actual: { type: "reps", reps: 35 } });
  await player.reconcile(done);
  assert.deepEqual([...values], saved);
  const reloadedSessions = await new SessionRepository(adapter).load();
  const reloadedPlayer = await new PlayerRepository(adapter).load();
  const beforeRead = writes.length;
  assert.deepEqual(sessionProgression(f.active.id, reloadedSessions, reloadedPlayer), result);
  assert.equal(writes.length, beforeRead);
  assert.ok(writeCount >= 2);
  assert.ok(writes.every(key => key === SESSION_KEY || key === PLAYER_KEY));
  assert.equal(values.get("isolated-unrelated"), "preserved");
  console.log("SQUAT_PR_RESULT", JSON.stringify({
    improvedSets: result.records.sets.length, growth: result.growth, ovr: result.ovr,
    initialRatings: f.before.ratings, finalRatings: awarded.player.ratings,
    rawMeanBefore: Object.values(f.before.ratings).reduce((a, b) => a + b, 0) / 6,
    rawMeanAfter: Object.values(awarded.player.ratings).reduce((a, b) => a + b, 0) / 6,
    historyStable: true, isolatedAdapter: true,
  }));
});
