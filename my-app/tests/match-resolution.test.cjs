const test = require("node:test");
const assert = require("node:assert/strict");
const D = require("../src/matches/domain.ts");
const C = require("../src/matches/calendar.ts");
const E = require("../src/matches/evidence.ts");
const {
  MatchRepository,
  MATCHES_KEY,
} = require("../src/storage/match-repository.ts");
const {
  initializePlayer,
  reconcilePlayer,
} = require("../src/growth/domain.ts");
const { beginCareer } = require("../src/career/domain.ts");
const { standardExercises } = require("../src/data/exercises.ts");
const { newWorkout, newEntry } = require("../src/training/plans.ts");
const {
  startSession,
  confirmSet,
  position,
} = require("../src/sessions/domain.ts");
const history = (...completed) => ({ version: 1, active: null, completed });
const start = "2026-10-06T12:00:00.000Z";
const unlock = "2026-10-12T00:00:00.000Z";
const expiry = "2026-10-19T00:00:00.000Z";
function owner() {
  return {
    player: initializePlayer("p", "2026-01-01T00:00:00.000Z", null, history()),
    career: beginCareer("p", "tokyo-zenith", "2026-01-01T00:00:00.000Z").career,
  };
}
function fixture(outcome = "LOSS") {
  const o = owner();
  const data = D.generateCurrentMatch(
    { version: 1, matches: [] },
    o,
    null,
    start,
    "UTC",
    () => 0.5,
  );
  const sessions = [];
  const count = outcome === "WIN" ? 3 : outcome === "DRAW" ? 2 : 0;
  for (let i = 0; i < count; i++) {
    const at = `2026-10-${String(6 + i).padStart(2, "0")}T12:00:00.000Z`;
    const entry = newEntry(standardExercises.find((e) => e.id === "push-up"));
    let session = startSession(
      {
        ...newWorkout(),
        name: "Resolution QA",
        exercises: [{ ...entry, restSeconds: 0, sets: entry.sets.slice(0, 1) }],
      },
      standardExercises,
      at,
    );
    session = confirmSet(
      session,
      position(session).set.id,
      { type: "reps", reps: 10 },
      at,
    );
    sessions.push(session);
  }
  o.player = reconcilePlayer(o.player, history(...sessions), unlock);
  const m = data.matches[0];
  m.rival.condition = outcome === "DRAW" ? 6 : 7;
  m.weekEnd = E.reconstructWeekEnd(
    o.player,
    history(...sessions),
    m.week,
    3,
    unlock,
  ).snapshot;
  return {
    o,
    data: D.parseMatches(JSON.stringify(data)),
    sessions: history(...sessions),
    id: m.id,
  };
}
function memory(data) {
  const map = new Map(data ? [[MATCHES_KEY, JSON.stringify(data)]] : []);
  const f = {
    map,
    now: unlock,
    writes: 0,
    fail: false,
    ack: false,
    readFail: false,
  };
  f.adapter = {
    read: async (k) => {
      if (f.readFail) throw Error("read");
      return map.get(k) ?? null;
    },
    write: async (k, v) => {
      assert.equal(k, MATCHES_KEY);
      if (f.fail) throw Error("write");
      map.set(k, v);
      f.writes++;
      if (f.ack) throw Error("ack");
    },
    remove: async () => assert.fail("no delete"),
  };
  f.repo = () =>
    new MatchRepository(
      f.adapter,
      () => 0.5,
      () => f.now,
    );
  return f;
}
for (const [time, status] of [
  ["2026-10-11T23:59:59.999Z", "UPCOMING"],
  [unlock, "READY"],
  ["2026-10-15T12:00:00.000Z", "READY"],
  ["2026-10-18T23:59:59.999Z", "READY"],
  [expiry, "SKIPPED"],
  ["2026-10-20T00:00:00.000Z", "SKIPPED"],
])
  test(`lifecycle at ${time}`, () =>
    assert.equal(D.matchStatus(fixture().data.matches[0], time), status));
test("pending evidence expires; completion remains completed indefinitely", () => {
  const m = fixture().data.matches[0];
  m.weekEnd = null;
  assert.equal(D.matchStatus(m, unlock), "PENDING_EVIDENCE");
  assert.equal(D.matchStatus(m, expiry), "SKIPPED");
  const ready = fixture().data.matches[0];
  ready.result = D.resolveMatch(ready, unlock);
  assert.equal(D.matchStatus(ready, expiry), "COMPLETED");
});
for (const outcome of ["WIN", "DRAW", "LOSS"])
  test(`manual ${outcome}, exact powers and detached result; no Player or other key changes`, async () => {
    const x = fixture(outcome),
      f = memory(x.data),
      before = structuredClone(x.o);
    for (const key of [
      "player",
      "sessions",
      "rewards",
      "career",
      "seasons",
      "presentation",
      "coach",
      "training",
      "settings",
    ])
      f.map.set(`ascend.${key}.v1`, key);
    const unrelated = [...f.map].filter(([k]) => k !== MATCHES_KEY);
    const saved = await f.repo().play(x.o, x.id),
      m = saved.matches[0];
    assert.equal(m.result.outcome, outcome);
    assert.equal(
      m.result.playerMatchPower,
      m.weekEnd.ovr + m.weekEnd.weeklyBonus,
    );
    assert.equal(m.result.rivalMatchPower, m.rival.ovr + m.rival.condition);
    assert.equal(m.result.id, D.resultId(m.id));
    assert.equal(m.rewardDelivery, null);
    assert.deepEqual(x.o, before);
    assert.deepEqual(
      [...f.map].filter(([k]) => k !== MATCHES_KEY),
      unrelated,
    );
    assert.deepEqual({ ...m, result: null }, x.data.matches[0]);
    m.result.outcome = "bogus";
    assert.equal((await f.repo().load()).matches[0].result.outcome, outcome);
  });
test("repeated and concurrent PLAY, remount and reload produce one immutable result", async () => {
  const x = fixture("WIN"),
    f = memory(x.data);
  const results = await Promise.all([
    f.repo().play(x.o, x.id),
    f.repo().play(x.o, x.id),
    f.repo().play(x.o, x.id),
  ]);
  assert.deepEqual(results[0], results[1]);
  assert.deepEqual(results[1], results[2]);
  assert.equal(f.writes, 1);
  f.now = "2027-01-01T00:00:00.000Z";
  assert.deepEqual(await f.repo().play(x.o, x.id), results[0]);
  assert.equal(f.writes, 1);
});
test("write failure publishes nothing; lost acknowledgment recovers exactly once", async () => {
  const x = fixture(),
    f = memory(x.data),
    raw = f.map.get(MATCHES_KEY);
  f.fail = true;
  await assert.rejects(f.repo().play(x.o, x.id));
  assert.equal(f.map.get(MATCHES_KEY), raw);
  f.fail = false;
  f.ack = true;
  await assert.rejects(f.repo().play(x.o, x.id));
  const saved = f.map.get(MATCHES_KEY);
  f.ack = false;
  f.now = expiry;
  await f.repo().play(x.o, x.id);
  assert.equal(f.map.get(MATCHES_KEY), saved);
  assert.equal(f.writes, 1);
});
test("queue rechecks actual clock after durable read at expiration", async () => {
  const x = fixture(),
    f = memory(x.data);
  f.now = "2026-10-18T23:59:59.999Z";
  const read = f.adapter.read;
  f.adapter.read = async (k) => {
    const value = await read(k);
    f.now = expiry;
    return value;
  };
  await assert.rejects(f.repo().play(x.o, x.id));
  const m = (await f.repo().load()).matches[0];
  assert.equal(m.result, null);
  assert.equal(m.skippedAt, expiry);
  f.now = unlock;
  assert.equal(D.matchStatus(m, f.now), "SKIPPED");
  await assert.rejects(f.repo().play(x.o, x.id));
});
test("pre-unlock, pending, missing match and wrong owner reject without writes", async () => {
  const x = fixture(),
    f = memory(x.data);
  f.now = start;
  await assert.rejects(f.repo().play(x.o, x.id));
  f.now = unlock;
  await assert.rejects(f.repo().play(x.o, "missing"));
  const other = owner();
  other.player.id = "other";
  await assert.rejects(f.repo().play(other, x.id));
  const pending = structuredClone(x.data);
  pending.matches[0].weekEnd = null;
  f.map.set(MATCHES_KEY, JSON.stringify(pending));
  await assert.rejects(f.repo().play(x.o, x.id));
  assert.equal(f.writes, 0);
});
test("refresh cannot resolve; overdue missing evidence is terminal without invented snapshot", async () => {
  const x = fixture(),
    pending = structuredClone(x.data);
  pending.matches[0].weekEnd = null;
  const f = memory(pending),
    r = f.repo();
  const ready = await r.refresh(x.o, null, x.sessions, unlock, "UTC");
  assert.equal(ready.data.matches[0].result, null);
  f.map.set(MATCHES_KEY, JSON.stringify(pending));
  const skipped = await r.refresh(x.o, null, x.sessions, expiry, "Asia/Tokyo");
  const m = skipped.data.matches.find((m) => m.id === x.id);
  assert.equal(m.weekEnd, null);
  assert.equal(m.result, null);
  assert.equal(m.skippedAt, expiry);
  assert.equal(D.matchStatus(m, unlock), "SKIPPED");
});
test("DST and timezone do not change persisted lifecycle endpoints", () => {
  for (const at of ["2026-03-04T12:00:00.000Z", "2026-10-28T12:00:00.000Z"]) {
    const w = C.matchWeek(at, "America/Vancouver"),
      m = fixture().data.matches[0];
    m.week = w;
    m.weekEnd.capturedAt = w.endExclusiveAt;
    assert.equal(D.matchStatus(m, w.endExclusiveAt), "READY");
    assert.equal(D.matchStatus(m, w.expiresAt), "SKIPPED");
    assert.equal(
      D.matchStatus(m, new Date(Date.parse(w.expiresAt) - 1).toISOString()),
      "READY",
    );
  }
});
test("legacy null-result records round trip with no rewrite", async () => {
  const x = fixture(),
    f = memory(x.data),
    raw = f.map.get(MATCHES_KEY);
  assert.deepEqual(await f.repo().load(), x.data);
  assert.equal(f.map.get(MATCHES_KEY), raw);
  assert.equal(f.writes, 0);
});
for (const [name, mutate] of [
  ["wrong outcome", (r) => (r.outcome = "WIN")],
  ["wrong power", (r) => r.playerMatchPower++],
  ["wrong rival power", (r) => r.rivalMatchPower++],
  ["early", (r) => (r.resolvedAt = start)],
  ["expired", (r) => (r.resolvedAt = expiry)],
  ["bad id", (r) => (r.id = "bad")],
  ["bad reference", (r) => (r.matchId = "other")],
])
  test(`invalid result rejected: ${name}`, async () => {
    const x = fixture();
    x.data.matches[0].result = D.resolveMatch(x.data.matches[0], unlock);
    mutate(x.data.matches[0].result);
    const f = memory(x.data),
      raw = f.map.get(MATCHES_KEY);
    await assert.rejects(f.repo().load());
    await assert.rejects(f.repo().play(x.o, x.id));
    assert.equal(f.writes, 0);
    assert.equal(f.map.get(MATCHES_KEY), raw);
  });
// Synthetic schema-valid fixed snapshots exercise adaptive history, never real user data.
function completedHistory(count, outcomes = []) {
  const o = owner();
  let data = { version: 1, matches: [] };
  for (let i = 0; i < count; i++) {
    const now = new Date(
      Date.parse("2026-06-02T12:00:00.000Z") + i * 7 * 86400000,
    ).toISOString();
    data = D.generateCurrentMatch(data, o, null, now, "UTC", () => 0.5);
    const m = data.matches.at(-1);
    m.weekEnd = E.reconstructWeekEnd(
      o.player,
      history(),
      m.week,
      3,
      m.week.endExclusiveAt,
    ).snapshot;
    // Full weekly participation produces a WIN at OVR 45, without any PR/growth change.
    m.weekEnd.trainingDays = [0, 1, 2].map((n) =>
      new Date(Date.parse(m.week.startAt) + n * 86400000)
        .toISOString()
        .slice(0, 10),
    );
    m.weekEnd.weeklyBonus = 10;
    m.weekEnd.playerMatchPower = 55;
    m.weekEnd.evidence.qualifyingSessionIds = ["a" + i, "b" + i, "c" + i];
    m.weekEnd.evidence.finalizedSessionIds = [
      ...m.weekEnd.evidence.qualifyingSessionIds,
    ];
    if (outcomes[i] === "DRAW") m.rival.condition = 10;
    if (outcomes[i] === "LOSS") {
      m.weekEnd.trainingDays = [];
      m.weekEnd.weeklyBonus = 0;
      m.weekEnd.playerMatchPower = m.weekEnd.ovr;
      m.weekEnd.evidence.qualifyingSessionIds = [];
      m.weekEnd.evidence.finalizedSessionIds = [];
    }
    m.result = D.resolveMatch(m, m.week.endExclusiveAt);
    data = D.parseMatches(JSON.stringify(data));
  }
  return { o, data };
}
for (const count of [0, 1, 2, 3, 4, 5, 7])
  test(`generation consumes authoritative newest five of ${count} completions`, () => {
    const { o, data } = completedHistory(count);
    const next = D.generateCurrentMatch(
      data,
      o,
      null,
      "2026-09-02T12:00:00.000Z",
      "UTC",
      () => 0.5,
    );
    const m = next.matches.at(-1),
      n = Math.min(count, 5);
    assert.deepEqual(
      m.generationEvidence.completedMatchIds,
      data.matches
        .slice(-n || data.matches.length)
        .reverse()
        .map((m) => m.id),
    );
    assert.equal(m.generationEvidence.wins, n);
    assert.deepEqual(
      m.generationEvidence.weights,
      n >= 5 ? [15, 45, 40] : n >= 3 ? [20, 50, 30] : [25, 50, 25],
    );
    assert.deepEqual(D.parseMatches(JSON.stringify(next)), next);
    assert.deepEqual(
      D.generateCurrentMatch(
        next,
        o,
        null,
        "2026-09-03T12:00:00.000Z",
        "UTC",
        () => {
          throw Error("reroll");
        },
      ),
      next,
    );
  });
test("SKIPPED excluded and frozen generation survives later manual play", () => {
  const { o, data } = completedHistory(3);
  const skipped = structuredClone(data.matches[2]);
  skipped.result = null;
  skipped.skippedAt = skipped.week.expiresAt;
  data.matches[2] = skipped;
  const next = D.generateCurrentMatch(
    data,
    o,
    null,
    "2026-09-02T12:00:00.000Z",
    "UTC",
    () => 0.5,
  );
  assert.equal(next.matches.at(-1).generationEvidence.wins, 2);
  // A result that arrives after generation never changes this generation evidence.
  const late = next.matches[2];
  delete late.skippedAt;
  late.result = D.resolveMatch(late, late.week.endExclusiveAt);
  assert.deepEqual(
    D.parseMatches(JSON.stringify(next)).matches.at(-1),
    next.matches.at(-1),
  );
});
test("forged adaptive references or wins, foreign ownership, and non-null rewards rejected", () => {
  const { data } = completedHistory(3);
  for (const change of [
    (m) => (m.generationEvidence.wins = 5),
    (m) => (m.generationEvidence.completedMatchIds = ["missing"]),
    (m) => (m.rewardDelivery = {}),
    (m) => (m.skippedAt = expiry),
  ]) {
    const x = structuredClone(data);
    change(x.matches.at(-1));
    assert.throws(() => D.parseMatches(JSON.stringify(x)));
  }
});

test("final millisecond can complete and later refresh preserves outcome and snapshots", async () => {
  const x = fixture("WIN"),
    f = memory(x.data);
  f.now = "2026-10-18T23:59:59.999Z";
  const saved = await f.repo().play(x.o, x.id);
  const old = structuredClone(saved.matches[0]);
  const refreshed = await f
    .repo()
    .refresh(x.o, null, x.sessions, expiry, "Asia/Tokyo");
  assert.deepEqual(
    refreshed.data.matches.find((m) => m.id === x.id),
    old,
  );
  assert.equal(D.matchStatus(old, expiry), "COMPLETED");
});

test("result before snapshot capture, missing snapshot, or completed plus skipped is corrupt", () => {
  const x = fixture();
  x.data.matches[0].result = D.resolveMatch(x.data.matches[0], unlock);
  for (const change of [
    (m) => (m.weekEnd.capturedAt = "2026-10-12T00:00:00.001Z"),
    (m) => (m.weekEnd = null),
    (m) => (m.skippedAt = expiry),
  ]) {
    const bad = structuredClone(x.data);
    change(bad.matches[0]);
    assert.throws(() => D.parseMatches(JSON.stringify(bad)));
  }
});

test("newest five count WIN only, excluding older wins and including DRAW/LOSS", () => {
  const { o, data } = completedHistory(7, [
    "WIN",
    "WIN",
    "LOSS",
    "DRAW",
    "WIN",
    "LOSS",
    "DRAW",
  ]);
  const next = D.generateCurrentMatch(
    data,
    o,
    null,
    "2026-09-02T12:00:00.000Z",
    "UTC",
    () => 0.5,
  );
  const evidence = next.matches.at(-1).generationEvidence;
  assert.equal(evidence.wins, 1);
  assert.deepEqual(evidence.weights, [25, 50, 25]);
  assert.deepEqual(
    evidence.completedMatchIds,
    data.matches
      .slice(-5)
      .reverse()
      .map((m) => m.id),
  );
  assert.deepEqual(D.parseMatches(JSON.stringify(next)), next);
});

test("clock before snapshot capture waits instead of offering PLAY", () => {
  const m = fixture().data.matches[0];
  m.weekEnd.capturedAt = "2026-10-13T00:00:00.000Z";
  assert.equal(D.matchStatus(m, unlock), "PENDING_EVIDENCE");
  assert.throws(() => D.resolveMatch(m, unlock));
});
