const test = require("node:test"),
  assert = require("node:assert/strict");
const {
  calendarContext,
  localMonth,
  validCalendar,
} = require("../src/seasons/calendar.ts");
const D = require("../src/seasons/domain.ts");
const { clubs } = require("../src/config/clubs.ts");
const { initializePlayer } = require("../src/growth/domain.ts");
const { beginCareer } = require("../src/career/domain.ts");
const {
  SeasonsRepository,
  SEASONS_KEY,
} = require("../src/storage/seasons-repository.ts");
const { standardExercises } = require("../src/data/exercises.ts");
const { newWorkout, newEntry } = require("../src/training/plans.ts");
const {
  startSession,
  confirmSet,
  position,
} = require("../src/sessions/domain.ts");
const startAt = "2026-10-03T12:00:00.000Z",
  clock = (at) => calendarContext(new Date(at));
function fixture() {
  const player = initializePlayer("p", "2026-10-01T12:00:00.000Z", null, {
    version: 1,
    active: null,
    completed: [],
  });
  player.ratings.Chest = 45.75;
  const career = beginCareer(
    "p",
    "tokyo-zenith",
    "2026-10-02T12:00:00.000Z",
  ).career;
  return { player, career, club: structuredClone(clubs["tokyo-zenith"]) };
}
function started() {
  const f = fixture();
  return {
    ...f,
    data: D.startSeason(
      D.emptySeasons(),
      f.career,
      f.player,
      f.club,
      clock(startAt),
    ),
  };
}
function workout(at, reps = 10) {
  const e = newEntry(standardExercises.find((e) => e.id === "push-up"));
  let s = startSession(
    {
      ...newWorkout(),
      name: "Season test",
      exercises: [{ ...e, restSeconds: 0, sets: e.sets.slice(0, 1) }],
    },
    standardExercises,
    at,
  );
  return confirmSet(s, position(s).set.id, { type: "reps", reps }, at);
}
const history = (...sessions) => ({
  version: 1,
  active: null,
  completed: sessions,
});
function memory(raw) {
  const map = new Map(raw === undefined ? [] : [[SEASONS_KEY, raw]]);
  let fail = false,
    writes = 0;
  return {
    map,
    get writes() {
      return writes;
    },
    set fail(v) {
      fail = v;
    },
    adapter: {
      read: async (k) => map.get(k) ?? null,
      write: async (k, v) => {
        if (fail) throw Error("write failed");
        writes++;
        map.set(k, v);
      },
      remove: async () => {
        throw Error("forbidden");
      },
    },
  };
}
for (const [at, month] of [
  ["2026-10-31T12:00:00Z", "2026-10"],
  ["2026-11-01T12:00:00Z", "2026-11"],
  ["2026-12-31T12:00:00Z", "2026-12"],
  ["2027-01-01T12:00:00Z", "2027-01"],
  ["2028-02-29T12:00:00Z", "2028-02"],
  ["2027-02-28T12:00:00Z", "2027-02"],
])
  test(`calendar ${at}`, () => {
    assert.equal(localMonth(new Date(at)), month);
    assert.ok(validCalendar(clock(at)));
  });
for (const [tz, at, month, day] of [
  ["America/Los_Angeles", "2026-11-01T06:55:00Z", "2026-10", "2026-10-31"],
  ["Asia/Tokyo", "2026-10-31T15:05:00Z", "2026-11", "2026-11-01"],
  ["Pacific/Kiritimati", "2026-12-31T10:05:00Z", "2027-01", "2027-01-01"],
])
  test(`local boundary ${tz}`, () => {
    const old = process.env.TZ;
    try {
      process.env.TZ = tz;
      const c = clock(at);
      assert.equal(c.monthId, month);
      assert.equal(c.localDay, day);
      process.env.TZ = "UTC";
      assert.ok(validCalendar(c));
      assert.equal(c.localDay, day);
    } finally {
      if (old === undefined) delete process.env.TZ;
      else process.env.TZ = old;
    }
  });
test("invalid calendars rejected", () => {
  assert.throws(() => localMonth(new Date("bad")));
  assert.equal(
    validCalendar({ ...clock(startAt), localDay: "2026-02-30" }),
    false,
  );
  assert.equal(validCalendar({ ...clock(startAt), offsetMinutes: 999 }), false);
});
test("no Career cannot start; wrong owner/club rejected", () => {
  const f = fixture();
  assert.throws(() =>
    D.startSeason(D.emptySeasons(), null, f.player, f.club, clock(startAt)),
  );
  assert.throws(() =>
    D.startSeason(
      D.emptySeasons(),
      { ...f.career, playerId: "other" },
      f.player,
      f.club,
      clock(startAt),
    ),
  );
  assert.throws(() =>
    D.startSeason(
      D.emptySeasons(),
      f.career,
      f.player,
      clubs["osaka-forge"],
      clock(startAt),
    ),
  );
});
test("explicit start is number 1, current month only; no retro seasons", () => {
  const f = started(),
    s = f.data.seasons[0];
  assert.equal(s.number, 1);
  assert.equal(s.monthId, "2026-10");
  assert.equal(f.data.seasons.length, 1);
  assert.equal(
    s.id,
    D.seasonIdentity("p", f.career.clubHistory[0].joinedAt, "2026-10"),
  );
});
test("double start same month returns unchanged; another active blocked", () => {
  const f = started();
  assert.deepEqual(
    D.startSeason(f.data, f.career, f.player, f.club, clock(startAt)),
    f.data,
  );
  assert.throws(() =>
    D.startSeason(
      f.data,
      f.career,
      f.player,
      f.club,
      clock("2026-11-02T12:00:00Z"),
    ),
  );
});
test("fractional rating, OVR and card start snapshot detached", () => {
  const f = started(),
    s = f.data.seasons[0];
  assert.equal(s.startingPlayer.ratings.Chest, 45.75);
  assert.equal(s.startingPlayer.ovr, 45);
  assert.equal(s.startingPlayer.tier, "bronze");
  assert.equal(s.startingPlayer.finish, "standard");
  f.player.ratings.Chest = 99;
  assert.equal(s.startingPlayer.ratings.Chest, 45.75);
});
test("Club snapshot independent of future catalog edits", () => {
  const f = started();
  f.club.name = "Changed";
  f.club.crest.markPath = "M0 0";
  f.club.reputation = 5;
  assert.equal(f.data.seasons[0].club.name, "Tokyo Zenith");
  assert.notEqual(f.data.seasons[0].club.crest.markPath, "M0 0");
  assert.equal(f.data.seasons[0].club.reputation, 1);
});
test("current month cannot complete; later month captures final fractional ratings/card", () => {
  const f = started(),
    id = f.data.seasons[0].id;
  assert.throws(() =>
    D.completeSeason(
      f.data,
      id,
      f.career,
      f.player,
      clock("2026-10-20T12:00:00Z"),
    ),
  );
  for (const a in f.player.ratings) f.player.ratings[a] = 60.25;
  const d = D.completeSeason(
    f.data,
    id,
    f.career,
    f.player,
    clock("2026-11-01T12:00:00Z"),
  );
  assert.equal(d.seasons[0].end.player.ovr, 60);
  assert.equal(d.seasons[0].end.player.tier, "silver");
  assert.equal(d.seasons[0].end.player.ratings.Core, 60.25);
  f.player.ratings.Core = 99;
  assert.equal(d.seasons[0].end.player.ratings.Core, 60.25);
  assert.deepEqual(
    D.completeSeason(d, id, f.career, f.player, clock("2026-12-01T12:00:00Z")),
    d,
  );
});
test("skipped months create next number only on explicit start", () => {
  const f = started();
  let d = D.completeSeason(
    f.data,
    f.data.seasons[0].id,
    f.career,
    f.player,
    clock("2027-01-05T12:00:00Z"),
  );
  assert.equal(d.seasons.length, 1);
  d = D.startSeason(
    d,
    f.career,
    f.player,
    f.club,
    clock("2027-01-05T12:00:01Z"),
  );
  assert.deepEqual(
    d.seasons.map((s) => [s.number, s.monthId]),
    [
      [1, "2026-10"],
      [2, "2027-01"],
    ],
  );
  assert.deepEqual(D.parseSeasons(JSON.stringify(d)), d);
});
test("backward month cannot create false Season", () => {
  const f = started();
  const d = D.completeSeason(
    f.data,
    f.data.seasons[0].id,
    f.career,
    f.player,
    clock("2027-01-05T12:00:00Z"),
  );
  assert.throws(() =>
    D.startSeason(d, f.career, f.player, f.club, clock("2026-09-05T12:00:00Z")),
  );
});
test("old workout, pre-start completion and different-month completion excluded", () => {
  const f = started(),
    s = f.data.seasons[0];
  for (const at of [
    "2026-09-30T12:00:00Z",
    "2026-10-02T12:00:00Z",
    "2026-11-01T12:00:00Z",
  ]) {
    const w = workout(new Date(at).toISOString());
    assert.equal(D.captureEvidence(s, w, history(w)), null);
  }
});
test("one completed workout counts once; first PR is not improvement", () => {
  const f = started(),
    s = f.data.seasons[0],
    w = workout("2026-10-04T12:00:00.000Z");
  const e = D.captureEvidence(s, w, history(w)),
    d = D.associateEvidence(f.data, s.id, e);
  assert.deepEqual(D.statistics(d.seasons[0]), {
    workouts: 1,
    trainingDays: 1,
    prImprovements: 0,
  });
  assert.deepEqual(D.associateEvidence(d, s.id, e), d);
});
test("two same-day workouts, then another day; factual PR improvements once per set", () => {
  const f = started(),
    s = f.data.seasons[0],
    old = workout("2026-10-02T12:00:00.000Z", 10),
    a = workout("2026-10-04T12:00:00.000Z", 12),
    b = workout("2026-10-04T13:00:00.000Z", 12),
    c = workout("2026-10-05T12:00:00.000Z", 13);
  let d = f.data;
  for (const w of [a, b, c])
    d = D.associateEvidence(
      d,
      s.id,
      D.captureEvidence(s, w, history(old, a, b, c)),
    );
  assert.deepEqual(D.statistics(d.seasons[0]), {
    workouts: 3,
    trainingDays: 2,
    prImprovements: 2,
  });
  const done = D.completeSeason(
    d,
    s.id,
    f.career,
    f.player,
    clock("2026-11-01T12:00:00Z"),
  );
  assert.deepEqual(done.seasons[0].end.stats, D.statistics(d.seasons[0]));
  assert.throws(() =>
    D.associateEvidence(done, s.id, {
      ...d.seasons[0].evidence[0],
      sessionId: "new",
    }),
  );
});
test("unconfirmed/incomplete session cannot become evidence", () => {
  const f = started(),
    w = workout("2026-10-04T12:00:00.000Z");
  w.status = "active";
  w.completedAt = null;
  assert.throws(() => D.captureEvidence(f.data.seasons[0], w, history(w)));
});
test("session must match saved evidence; invalid history rejects PR derivation", () => {
  const f = started(),
    w = workout("2026-10-04T12:00:00.000Z");
  assert.throws(() => D.captureEvidence(f.data.seasons[0], w, history()));
  assert.throws(() => D.captureEvidence(f.data.seasons[0], w, history(w, {})));
});
test("captured completion calendar survives timezone change", () => {
  const f = started(),
    w = workout("2026-10-04T23:30:00.000Z"),
    old = process.env.TZ;
  try {
    process.env.TZ = "UTC";
    const captured = clock(w.completedAt);
    process.env.TZ = "Asia/Tokyo";
    const e = D.captureEvidence(f.data.seasons[0], w, history(w), captured);
    assert.equal(e.localDay, "2026-10-04");
    const d = D.associateEvidence(f.data, f.data.seasons[0].id, e);
    assert.deepEqual(D.parseSeasons(JSON.stringify(d)), d);
  } finally {
    if (old === undefined) delete process.env.TZ;
    else process.env.TZ = old;
  }
});
for (const [name, change] of [
  ["number gap", (d) => (d.seasons[0].number = 2)],
  ["wrong month", (d) => (d.seasons[0].monthId = "2026-11")],
  ["duplicate month", (d) => d.seasons.push(structuredClone(d.seasons[0]))],
  [
    "active not last",
    (d) => {
      d.seasons.push({ ...structuredClone(d.seasons[0]), number: 2 });
    },
  ],
  ["rating mismatch", (d) => (d.seasons[0].startingPlayer.ovr = 99)],
  ["invalid rating", (d) => (d.seasons[0].startingPlayer.ratings.Core = -1)],
  ["Club missing", (d) => delete d.seasons[0].club.crest],
  ["unknown version", (d) => (d.version = 2)],
  ["identity conflict", (d) => (d.seasons[0].id = "fake")],
])
  test(`validation: ${name}`, () => {
    const d = started().data;
    change(d);
    assert.throws(() => D.parseSeasons(JSON.stringify(d)));
  });
test("completed stats cannot contradict evidence", () => {
  const f = started(),
    d = D.completeSeason(
      f.data,
      f.data.seasons[0].id,
      f.career,
      f.player,
      clock("2026-11-01T12:00:00Z"),
    );
  d.seasons[0].end.stats.workouts = 10;
  assert.throws(() => D.parseSeasons(JSON.stringify(d)));
});
test("missing reads/startup readonly and no auto month mutation", async () => {
  const f = memory(),
    r = new SeasonsRepository(f.adapter);
  assert.deepEqual(await r.load(), D.emptySeasons());
  assert.equal(f.writes, 0);
  const x = started();
  await r.start(x.career, x.player, x.club, clock(startAt));
  const before = f.map.get(SEASONS_KEY);
  await new SeasonsRepository(f.adapter).load();
  assert.equal(f.map.get(SEASONS_KEY), before);
});
test("double start/reload; all unrelated keys remain unchanged", async () => {
  const f = memory(),
    r = new SeasonsRepository(f.adapter),
    x = fixture();
  for (const k of [
    "career",
    "player",
    "sessions",
    "rewards",
    "presentation",
    "coach",
    "training",
  ])
    f.map.set(`ascend.${k}.v1`, k);
  const before = [...f.map];
  const [a, b] = await Promise.all([
    r.start(x.career, x.player, x.club, clock(startAt)),
    r.start(x.career, x.player, x.club, clock(startAt)),
  ]);
  assert.deepEqual(a, b);
  assert.equal(f.writes, 1);
  assert.deepEqual(
    [...f.map].filter(([k]) => k !== SEASONS_KEY),
    before,
  );
  assert.deepEqual(await new SeasonsRepository(f.adapter).load(), a);
});
for (const raw of [
  "bad",
  JSON.stringify({ version: 2, seasons: [] }),
  JSON.stringify({ version: 1, seasons: [{}] }),
])
  test(`corrupt storage preserved ${raw}`, async () => {
    const f = memory(raw),
      r = new SeasonsRepository(f.adapter),
      x = fixture();
    await assert.rejects(r.load());
    await assert.rejects(r.start(x.career, x.player, x.club, clock(startAt)));
    assert.equal(f.map.get(SEASONS_KEY), raw);
    assert.equal(f.writes, 0);
  });
test("failed start publishes nothing, retry safe", async () => {
  const f = memory(),
    r = new SeasonsRepository(f.adapter),
    x = fixture();
  f.fail = true;
  await assert.rejects(r.start(x.career, x.player, x.club, clock(startAt)));
  assert.deepEqual(await r.load(), D.emptySeasons());
  f.fail = false;
  await r.start(x.career, x.player, x.club, clock(startAt));
  assert.equal(f.writes, 1);
});
test("failed completion leaves active; retry closes once without changing other keys", async () => {
  const x = started(),
    f = memory(JSON.stringify(x.data)),
    r = new SeasonsRepository(f.adapter);
  f.map.set("ascend.player.v1", "untouched");
  f.fail = true;
  await assert.rejects(
    r.complete(
      x.data.seasons[0].id,
      x.career,
      x.player,
      clock("2026-11-01T12:00:00Z"),
    ),
  );
  assert.equal((await r.load()).seasons[0].end, null);
  f.fail = false;
  await r.complete(
    x.data.seasons[0].id,
    x.career,
    x.player,
    clock("2026-11-01T12:00:00Z"),
  );
  await r.complete(
    x.data.seasons[0].id,
    x.career,
    x.player,
    clock("2026-11-01T12:00:00Z"),
  );
  assert.equal(f.writes, 1);
  assert.equal(f.map.get("ascend.player.v1"), "untouched");
});
test("failed evidence/retry/dedup/restart and isolation of workout PR growth coins presentation", async () => {
  const x = started(),
    f = memory(JSON.stringify(x.data)),
    r = new SeasonsRepository(f.adapter),
    w = workout("2026-10-04T12:00:00.000Z");
  for (const k of ["sessions", "player", "rewards", "presentation"])
    f.map.set(`ascend.${k}.v1`, k);
  const before = [...f.map];
  f.fail = true;
  await assert.rejects(
    r.record(fixture(), w, history(w), clock(w.completedAt)),
  );
  assert.deepEqual([...f.map], before);
  f.fail = false;
  await r.record(fixture(), w, history(w), clock(w.completedAt));
  await r.record(fixture(), w, history(w), clock(w.completedAt));
  const d = await new SeasonsRepository(f.adapter).load();
  assert.equal(d.seasons[0].evidence.length, 1);
  assert.equal(f.writes, 1);
  assert.deepEqual(
    [...f.map].filter(([k]) => k !== SEASONS_KEY),
    before.filter(([k]) => k !== SEASONS_KEY),
  );
});
test("no active Season completion callbacks write nothing", async () => {
  const f = memory(),
    r = new SeasonsRepository(f.adapter),
    w = workout("2026-10-04T12:00:00.000Z");
  await r.record(fixture(), w, history(w), clock(w.completedAt));
  assert.equal(f.writes, 0);
});
test("read failure blocks writes", async () => {
  const f = memory(),
    r = new SeasonsRepository(f.adapter),
    x = fixture();
  f.adapter.read = async () => {
    throw Error("read failed");
  };
  await assert.rejects(r.start(x.career, x.player, x.club, clock(startAt)));
  assert.equal(f.writes, 0);
});

test("multiple improved weighted metrics count one source set", () => {
  const x = started();
  function weighted(at, kg, reps) {
    const exercise = standardExercises.find(
      (e) => e.trackingType === "weight_reps",
    );
    const entry = newEntry(exercise);
    const s = startSession(
      {
        ...newWorkout(),
        name: "Weighted season",
        exercises: [{ ...entry, restSeconds: 0, sets: entry.sets.slice(0, 1) }],
      },
      standardExercises,
      at,
    );
    return confirmSet(
      s,
      position(s).set.id,
      { type: "weight_reps", weightKg: kg, reps },
      at,
    );
  }
  const a = weighted("2026-10-04T12:00:00.000Z", 10, 8);
  const b = weighted("2026-10-05T12:00:00.000Z", 12, 8);
  const c = weighted("2026-10-06T12:00:00.000Z", 12, 9);
  assert.equal(
    D.captureEvidence(x.data.seasons[0], c, history(a, b, c)).prSetIds.length,
    1,
  );
});

test("pre-start set improvements in a later completed session are excluded", () => {
  const x = started();
  const old = workout("2026-10-01T12:00:00.000Z", 5);
  const entry = newEntry(standardExercises.find((e) => e.id === "push-up"));
  let s = startSession(
    {
      ...newWorkout(),
      name: "Boundary session",
      exercises: [{ ...entry, restSeconds: 0, sets: entry.sets.slice(0, 2) }],
    },
    standardExercises,
    "2026-10-02T12:00:00.000Z",
  );
  s = confirmSet(
    s,
    position(s).set.id,
    { type: "reps", reps: 10 },
    "2026-10-02T12:00:01.000Z",
  );
  s = confirmSet(
    s,
    position(s).set.id,
    { type: "reps", reps: 5 },
    "2026-10-04T12:00:00.000Z",
  );
  const e = D.captureEvidence(x.data.seasons[0], s, history(old, s));
  assert.ok(e);
  assert.deepEqual(e.prSetIds, []);
});

test("evidence cannot be written under a different Player identity", async () => {
  const x = started(),
    f = memory(JSON.stringify(x.data));
  const r = new SeasonsRepository(f.adapter),
    w = workout("2026-10-04T12:00:00.000Z");
  const owner = fixture();
  owner.player.id = "different";
  await assert.rejects(r.record(owner, w, history(w), clock(w.completedAt)));
  assert.equal(f.writes, 0);
});
