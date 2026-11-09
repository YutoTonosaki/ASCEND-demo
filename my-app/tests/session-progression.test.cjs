const { test } = require("node:test");
const assert = require("node:assert/strict");
const { sessionProgression, formatGrowthDelta } = require("../src/growth/session-progression.ts");
const { initializePlayer, reconcilePlayer } = require("../src/growth/domain.ts");
const { confirmSet, position } = require("../src/sessions/domain.ts");
const { at, data, workout, fixture } = require("./fixtures/session-progression.cjs");
const saved = player => ({ version: 1, player });
const select = f => sessionProgression(f.target.completed.id, f.sessions, saved(f.player));

test("fractional growth sums exact persisted growth and bonus deltas per region", () => {
  const f = fixture(), result = select(f);
  assert.equal(result.state, "ready");
  assert.ok(f.player.events.some(e => e.sessionId === f.target.completed.id && e.kind === "bonus"));
  for (const { area, delta } of result.growth) {
    const exact = f.player.events.filter(e => e.sessionId === f.target.completed.id && e.kind !== "assessment")
      .flatMap(e => e.changes).filter(c => c.area === area).reduce((n, c) => n + c.after - c.before, 0);
    // Mirror selector's per-event subtraction, not a differently associated floating-point expression.
    const expected = f.player.events.filter(e => e.sessionId === f.target.completed.id && e.kind !== "assessment")
      .flatMap(e => e.changes).filter(c => c.area === area).reduce((n, c) => n + (c.after - c.before), 0);
    assert.equal(delta, expected);
    assert.ok(Math.abs(exact - delta) < 1e-12);
  }
  assert.ok(result.growth.length >= 2);
  assert.equal(result.assessments.length, 0);
  assert.equal(result.explainUnchangedOVR, true);
});
test("assessment decrease is separate from earned growth", () => {
  const s = workout([["push-up", [{ type: "reps", reps: 1 }]]], 20).completed;
  const player = reconcilePlayer(initializePlayer("p", at(10), null, data()), data(s), at(30));
  const r = sessionProgression(s.id, data(s), saved(player));
  assert.equal(r.state, "ready");
  assert.deepEqual(r.growth, []);
  assert.equal(r.assessments[0].before, 45);
  assert.ok(r.assessments[0].after < 45);
  assert.equal(r.explainUnchangedOVR, false);
});
test("PR comparison uses earlier history and counts improved sets once", () => {
  const f = fixture();
  assert.equal(select(f).records.sets.length, 3);
  assert.ok(select(f).records.sets.every(s => s.metrics.every(m => m.outcome === "improved")));
  const first = sessionProgression(f.first.id, f.sessions, saved(f.player));
  assert.equal(first.records.sets.length, 0);
});
test("weighted comparison with multiple metrics counts an improved set once", () => {
  const s1 = workout([["overhead-press", [{ type: "weight_reps", weightKg: 20, reps: 5 },
    { type: "weight_reps", weightKg: 30, reps: 3 }]]], 20).completed;
  const s2 = workout([["overhead-press", [{ type: "weight_reps", weightKg: 30, reps: 5 },
    { type: "weight_reps", weightKg: 25, reps: 4 }]]], 30).completed;
  // First set improves reps at an existing load; second establishes a load-specific first record.
  const d = data(s1, s2), p = reconcilePlayer(initializePlayer("p", at(10), null, data()), d, at(40));
  const r = sessionProgression(s2.id, d, saved(p));
  assert.equal(r.records.sets.length, 1);
  assert.equal(new Set(r.records.sets.map(s => s.setId)).size, 1);
});
test("finalized sessions with no events are ready with zero additions and no OVR explanation", () => {
  const f = fixture(), r = sessionProgression(f.first.id, f.sessions, saved(f.player));
  assert.equal(r.state, "ready");
  assert.deepEqual(r.growth, []);
  assert.equal(r.ovr, null);
  assert.equal(r.explainUnchangedOVR, false);
});
test("persisted empty changes do not create growth or an unchanged OVR explanation", () => {
  const f = fixture();
  const p = structuredClone(f.before);
  p.finalizedSessionIds.push(f.target.completed.id);
  p.events.push({ id: "empty", sessionId: f.target.completed.id, kind: "growth", changes: [] });
  const r = sessionProgression(f.target.completed.id, f.sessions, saved(p));
  assert.equal(r.state, "ready");
  assert.deepEqual(r.growth, []);
  assert.equal(r.explainUnchangedOVR, false);
});
test("pending, loading, persistence errors and uninitialized player are distinct", () => {
  const f = fixture(), id = f.target.completed.id;
  assert.equal(sessionProgression(id, f.sessions, saved(f.before)).state, "pending");
  assert.equal(sessionProgression(id, f.sessions, null).state, "loading");
  const error = sessionProgression(id, f.sessions, saved(f.before), { growth: true });
  assert.equal(error.state, "error");
  assert.deepEqual(error.growth, []);
  assert.equal(error.records.sets.length, 3);
  assert.equal(sessionProgression(id, f.sessions, saved(null)).state, "uninitialized");
  assert.equal(sessionProgression(id, null, saved(f.player)).state, "loading");
  assert.equal(sessionProgression(id, null, null, { sessions: true }).state, "error");
});
test("pre-initialization sessions do not claim a zero reward or retroactive growth", () => {
  const f = fixture(), p = initializePlayer("new", at(100), null, f.sessions);
  const r = sessionProgression(f.target.completed.id, f.sessions, saved(p));
  assert.equal(r.state, "beforeInitialization");
  assert.deepEqual(r.growth, []);
  assert.equal(r.records.sets.length, 3);
});
test("sessions spanning initialization identify partially tracked evidence", () => {
  const f = fixture();
  const partial = confirmSet(f.target.active, position(f.target.active).set.id,
    { type: "reps", reps: 12 }, at(31));
  const initial = initializePlayer("partial", at(31), null,
    { ...data(f.first), active: partial });
  const p = reconcilePlayer(initial, f.sessions, at(40));
  assert.equal(sessionProgression(f.target.completed.id, f.sessions, saved(p)).partiallyTracked, true);
});
test("later sessions preserve prior fractional totals, PRs and OVR endpoints", () => {
  const f = fixture(), old = select(f);
  const later = workout([["push-up", [{ type: "reps", reps: 20 }]]], 50).completed;
  const d = data(...f.sessions.completed, later);
  const p = reconcilePlayer(f.player, d, at(60));
  assert.deepEqual(sessionProgression(f.target.completed.id, d, saved(p)), old);
});
test("duplicate events and broken chains fail closed without duplicate additions", () => {
  const f = fixture();
  f.player.events.push(structuredClone(f.player.events[0]));
  assert.equal(select(f).state, "unavailable");
  const g = fixture();
  g.player.events[0].changes[0].before += 1;
  assert.equal(select(g).state, "unavailable");
});
test("duplicate session evidence cannot fabricate PR comparisons", () => {
  const f = fixture();
  f.sessions.completed.push(structuredClone(f.target.completed));
  const r = select(f);
  assert.equal(r.state, "error");
  assert.equal(r.records.state, "unavailable");
});
test("selector is repeatable and leaves all supplied data untouched", () => {
  const f = fixture(), bytes = JSON.stringify(f);
  assert.deepEqual(select(f), select(f));
  assert.equal(JSON.stringify(f), bytes);
  const first = select(f);
  first.records.sets[0].metrics[0].value = 999;
  first.growth[0].delta = 999;
  assert.equal(JSON.stringify(f), bytes);
});
test("formatting follows summation and keeps tiny positive additions visible", () => {
  assert.equal(formatGrowthDelta(0.006 + 0.006), "0.01");
  assert.equal(formatGrowthDelta(0.000001), "<0.01");
  assert.equal(formatGrowthDelta(0), "0.00");
});
test("assessment and later earned growth within a session remain separate", () => {
  const s = workout([["push-up", [{ type: "reps", reps: 2 }, { type: "reps", reps: 3 }]]], 20).completed;
  const p = reconcilePlayer(initializePlayer("p", at(10), null, data()), data(s), at(30));
  const r = sessionProgression(s.id, data(s), saved(p));
  assert.equal(r.state, "ready");
  assert.equal(r.assessments.length, 1);
  assert.ok(r.growth[0].delta > 0);
  assert.equal(r.growth[0].delta, p.events.filter(e => e.kind === "growth")
    .flatMap(e => e.changes).reduce((n, c) => n + (c.after - c.before), 0));
  assert.equal(r.explainUnchangedOVR, false);
});
test("integer OVR increase suppresses the unchanged explanation", () => {
  const f = fixture();
  let p = f.player, sessions = f.sessions;
  let crossed = false;
  for (let day = 1; day <= 30; day++) {
    const s = workout([["push-up", [{ type: "reps", reps: 15 + day * 3 }]],
      ["squat", [{ type: "reps", reps: 15 + day * 3 }]]], day * 86400).completed;
    sessions = data(...sessions.completed, s);
    p = reconcilePlayer(p, sessions, at(day * 86400 + 10));
    const r = sessionProgression(s.id, sessions, saved(p));
    if (r.ovr.after > r.ovr.before) {
      crossed = true;
      assert.equal(r.explainUnchangedOVR, false);
      break;
    }
  }
  assert.equal(crossed, true);
});
test("interleaved session events suppress ambiguous OVR endpoints", () => {
  const f = fixture(), expected = select(f).growth;
  f.player.events.push({ id: "other-empty", kind: "growth", sessionId: "other", changes: [] },
    { id: "target-empty", kind: "bonus", sessionId: f.target.completed.id, changes: [] });
  const r = select(f);
  assert.equal(r.state, "ready");
  assert.deepEqual(r.growth, expected);
  assert.equal(r.ovr, null);
  assert.equal(r.explainUnchangedOVR, false);
});
test("missing target and inconsistent current ratings do not publish growth", () => {
  const f = fixture();
  assert.equal(sessionProgression("missing", f.sessions, saved(f.player)).state, "unavailable");
  f.player.ratings.Chest += 1;
  assert.equal(select(f).state, "unavailable");
});
