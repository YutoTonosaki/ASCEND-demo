const test = require("node:test");
const assert = require("node:assert/strict");
const D = require("../src/matches/domain.ts");
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
const {
  matchup,
  completedPresentation,
  reportModel,
} = require("../src/matches/presentation/model.ts");
const {
  CinematicController,
  STAGE_MS,
} = require("../src/matches/presentation/controller.ts");
const { playSaved } = require("../src/matches/presentation/play.ts");
const { historyAt } = require("../src/matches/history.ts");
const { applyMatchPayments } = require("../src/rewards/matches.ts");
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
function storage(data, mode) {
  let raw = JSON.stringify(data),
    writes = 0;
  const adapter = {
    read: async () => raw,
    write: async (key, value) => {
      assert.equal(key, MATCHES_KEY);
      if (mode === "fail") throw Error("write failure");
      raw = value;
      writes++;
      if (mode === "ack") throw Error("lost acknowledgment");
    },
    remove: async () => assert.fail("remove"),
  };
  return {
    repo: new MatchRepository(
      adapter,
      () => 0.5,
      () => unlock,
    ),
    raw: () => raw,
    writes: () => writes,
  };
}
for (const outcome of ["WIN", "DRAW", "LOSS"]) {
  test(`durable ${outcome} model uses frozen evidence and detached identity`, async () => {
    const f = fixture(outcome),
      db = storage(f.data);
    assert.throws(() => completedPresentation(f.data.matches[0]));
    const before = JSON.stringify(f.o);
    const { match } = await playSaved(db.repo, f.o, f.id);
    const m = completedPresentation(match);
    assert.equal(JSON.parse(db.raw()).matches[0].result.id, m.result.id);
    assert.equal(m.result.outcome, outcome);
    assert.equal(m.player.ovr, match.weekEnd.ovr);
    assert.equal(m.player.power, match.result.playerMatchPower);
    assert.equal(m.rival.power, match.result.rivalMatchPower);
    assert.equal(m.expectedReward, { WIN: 25, DRAW: 15, LOSS: 10 }[outcome]);
    assert.equal(m.player.club.id, match.club.id);
    assert.equal(m.rival.name, match.rival.name);
    assert.equal(m.rival.club.id, match.rival.club.id);
    assert.equal(m.player.bonus, match.weekEnd.weeklyBonus);
    assert.equal(JSON.stringify(f.o), before);
    match.club.name = "changed";
    assert.notEqual(m.player.club.name, "changed");
    assert.ok(Object.isFrozen(m.player.ratings));
    assert.equal(db.writes(), 1);
    await playSaved(db.repo, f.o, f.id);
    assert.equal(db.writes(), 1);
  });
}
test("failed write cannot produce a cinematic", async () => {
  const f = fixture(),
    db = storage(f.data, "fail"),
    raw = db.raw();
  await assert.rejects(playSaved(db.repo, f.o, f.id), /write/);
  assert.equal(db.raw(), raw);
});
test("lost acknowledgment recovers saved result without second PLAY", async () => {
  const f = fixture(),
    db = storage(f.data, "ack");
  const r = await playSaved(db.repo, f.o, f.id);
  assert.equal(r.match.result.id, D.resultId(f.id));
  assert.equal(db.writes(), 1);
});
test("confirmation read failure suppresses playback", async () => {
  const f = fixture(),
    db = storage(f.data);
  await assert.rejects(
    playSaved(
      {
        play: db.repo.play.bind(db.repo),
        load: async () => {
          throw Error("read");
        },
      },
      f.o,
      f.id,
    ),
  );
  assert.ok(JSON.parse(db.raw()).matches[0].result);
});
test("missing snapshots and skipped records cannot enter completed renderer", () => {
  const m = fixture().data.matches[0];
  assert.throws(() => completedPresentation(m));
  assert.throws(() => matchup({ ...m, weekEnd: null }));
  assert.throws(() => matchup({ ...m, skippedAt: expiry }));
});
function playback() {
  const queued = [],
    cancelled = [],
    seen = [];
  const c = new CinematicController({
    schedule: (fn, ms) => {
      const t = { fn, ms };
      queued.push(t);
      return t;
    },
    cancel: (t) => cancelled.push(t),
  });
  return {
    c,
    queued,
    cancelled,
    seen,
    start: (reduce = false) => c.start((s) => seen.push(s), reduce),
  };
}
test("fixed authored stage order and durations", () => {
  const p = playback();
  p.start();
  for (let i = 0; i < 3; i++) p.queued[i].fn();
  assert.deepEqual(p.seen, ["vs", "simulation", "reveal", "report"]);
  assert.deepEqual(
    p.queued.map((t) => t.ms),
    [2000, 8000, 2000],
  );
  assert.deepEqual(STAGE_MS, { vs: 2000, simulation: 8000, reveal: 2000 });
});
for (const count of [0, 1, 2])
  test(`skip stage ${count} cancels timer and stale callbacks`, () => {
    const p = playback();
    p.start();
    for (let i = 0; i < count; i++) p.queued[i].fn();
    p.c.skip();
    p.c.skip();
    const length = p.seen.length;
    p.queued.forEach((t) => t.fn());
    assert.equal(p.seen.at(-1), "report");
    assert.equal(p.seen.length, length);
    assert.ok(p.cancelled.includes(p.queued[count]));
  });
test("background safely ends sequence", () => {
  const p = playback();
  p.start();
  p.c.background();
  assert.equal(p.seen.at(-1), "report");
});
test("Reduce Motion starts at report without timer", () => {
  const p = playback();
  p.start(true);
  assert.deepEqual(p.seen, ["report"]);
  assert.equal(p.queued.length, 0);
});
test("dispose prevents publication from stale timers", () => {
  const p = playback();
  p.start();
  p.c.dispose();
  p.queued[0].fn();
  assert.deepEqual(p.seen, ["vs"]);
});
test("new match cancels previous timeline", () => {
  const p = playback();
  p.start();
  const stale = p.queued[0];
  p.start();
  stale.fn();
  assert.deepEqual(p.seen, ["vs", "vs"]);
});
test("report expected/paid/pending/unavailable uses existing transaction evidence", async () => {
  const f = fixture("WIN"),
    db = storage(f.data),
    saved = await playSaved(db.repo, f.o, f.id);
  const owner = {
    playerId: f.o.player.id,
    careerStartedAt: f.o.career.clubHistory[0].joinedAt,
  };
  const empty = { version: 1, receipts: [], transactions: [] };
  const paid = applyMatchPayments(empty, saved.data, owner, unlock);
  for (const [data, state] of [
    [empty, "pending"],
    [null, "unavailable"],
    [paid, "paid"],
  ]) {
    const item = historyAt(saved.data, owner, data, unlock)[0];
    assert.equal(reportModel(item).payment.state, state);
    assert.equal(reportModel(item).model.expectedReward, 25);
  }
  const before = db.raw();
  const p = playback();
  p.start();
  p.c.skip();
  p.c.dispose();
  assert.equal(db.raw(), before);
  assert.equal(db.writes(), 1);
});
test("no renderer contract is published before saved confirmation read", async () => {
  const f = fixture(),
    db = storage(f.data);
  let release;
  const gate = new Promise((resolve) => (release = resolve));
  let published = false;
  const work = playSaved(
    {
      play: db.repo.play.bind(db.repo),
      load: async () => {
        await gate;
        return db.repo.load();
      },
    },
    f.o,
    f.id,
  ).then((r) => {
    published = true;
    return r;
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(JSON.parse(db.raw()).matches[0].result);
  assert.equal(published, false);
  release();
  await work;
  assert.equal(published, true);
});
test("expired PLAY cannot publish a completed presentation", async () => {
  const f = fixture(),
    db = storage(f.data);
  const expired = new MatchRepository(
    {
      read: async () => db.raw(),
      write: async () => {},
      remove: async () => {},
    },
    () => 0.5,
    () => expiry,
  );
  await assert.rejects(playSaved(expired, f.o, f.id));
});
test("upcoming PLAY cannot publish a completed presentation", async () => {
  const f = fixture(),
    db = storage(f.data);
  const early = new MatchRepository(
    {
      read: async () => db.raw(),
      write: async () => assert.fail(),
      remove: async () => {},
    },
    () => 0.5,
    () => start,
  );
  await assert.rejects(playSaved(early, f.o, f.id));
});
test("repeated SKIP publishes report once", () => {
  const p = playback();
  p.start();
  p.c.skip();
  p.c.skip();
  p.c.background();
  assert.deepEqual(p.seen, ["vs", "report"]);
});
