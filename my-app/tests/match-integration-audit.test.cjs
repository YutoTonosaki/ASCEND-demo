const test = require("node:test"),
  assert = require("node:assert/strict");
const { matchesOwnedBy } = require("../src/matches/scope.ts");
const M = require("../src/matches/domain.ts");
const C = require("../src/matches/calendar.ts");
const H = require("../src/matches/history.ts");
const { initializePlayer, overall } = require("../src/growth/domain.ts");
const { derivePersonalRecords } = require("../src/records/domain.ts");
const { beginCareer } = require("../src/career/domain.ts");
const { defaultProfile } = require("../src/coach/profile.ts");
const { standardExercises } = require("../src/data/exercises.ts");
const { newWorkout, newEntry } = require("../src/training/plans.ts");
const {
  startSession,
  confirmSet,
  position,
} = require("../src/sessions/domain.ts");
const {
  PlayerRepository,
  PLAYER_KEY,
} = require("../src/storage/player-repository.ts");
const {
  SessionRepository,
  SESSION_KEY,
} = require("../src/storage/session-repository.ts");
const {
  MatchRepository,
  MATCHES_KEY,
} = require("../src/storage/match-repository.ts");
const {
  RewardsRepository,
  REWARDS_KEY,
} = require("../src/storage/rewards-repository.ts");
const {
  SeasonsRepository,
  SEASONS_KEY,
} = require("../src/storage/seasons-repository.ts");
const {
  captureReward,
  balance,
  parseRewards,
} = require("../src/rewards/domain.ts");
const { calendarContext } = require("../src/seasons/calendar.ts");
const { playSaved } = require("../src/matches/presentation/play.ts");
const {
  completedPresentation,
} = require("../src/matches/presentation/model.ts");
const {
  CinematicController,
} = require("../src/matches/presentation/controller.ts");
const { clubById } = require("../src/config/clubs.ts");
function plan() {
  const e = newEntry(standardExercises.find((x) => x.id === "push-up"));
  return {
    ...newWorkout(),
    name: "Integration audit",
    exercises: [{ ...e, restSeconds: 0, sets: e.sets.slice(0, 1) }],
  };
}
const empty = () => ({ version: 1, active: null, completed: [] });
function owner() {
  return {
    player: initializePlayer(
      "audit",
      "2026-09-27T12:00:00.000Z",
      null,
      empty(),
    ),
    career: beginCareer("audit", "tokyo-zenith", "2026-09-27T12:00:01.000Z")
      .career,
  };
}
test("Provider publication requires current Player and Career scope, including hydration", () => {
  const d = {
    version: 1,
    matches: [{ playerId: "a", careerStartedAt: "joined" }],
  };
  assert.equal(matchesOwnedBy(d, "a", "joined"), true);
  for (const args of [
    [undefined, "joined"],
    ["a", undefined],
    ["b", "joined"],
    ["a", "other"],
  ])
    assert.equal(matchesOwnedBy(d, ...args), false);
  assert.equal(
    matchesOwnedBy({ version: 1, matches: [] }, "a", "joined"),
    true,
  );
  assert.equal(
    matchesOwnedBy(
      {
        ...d,
        matches: [
          ...d.matches,
          { playerId: "foreign", careerStartedAt: "joined" },
        ],
      },
      "a",
      "joined",
    ),
    false,
  );
});
test("real repository full loop across month: workouts, PR/Growth, frozen Match, Coins, report and closed Season join", async () => {
  let now = "2026-09-27T12:00:00.000Z";
  // Explicit set identity is required; create the historical fixture through the domain API.
  let previous = startSession(
    plan(),
    standardExercises,
    "2026-09-26T12:00:00.000Z",
  );
  previous = confirmSet(
    previous,
    position(previous).set.id,
    { type: "reps", reps: 10 },
    previous.startedAt,
  );
  let sessions = { ...empty(), completed: [previous] };
  const profile = defaultProfile(now);
  profile.preferredTrainingDaysPerWeek = 3;
  profile.baselineAssessments = [
    {
      exercise: standardExercises.find((x) => x.id === "push-up"),
      actual: { type: "reps", reps: 10 },
      source: "known",
      recordedAt: now,
    },
  ];
  let player = initializePlayer("audit", now, profile, sessions);
  const career = beginCareer(player.id, "tokyo-zenith", now).career;
  const map = new Map([
      [PLAYER_KEY, JSON.stringify({ version: 1, player })],
      [SESSION_KEY, JSON.stringify(sessions)],
    ]),
    writes = [];
  const adapter = {
    read: async (k) => map.get(k) ?? null,
    write: async (k, v) => {
      writes.push(k);
      map.set(k, v);
    },
    remove: async () => assert.fail("remove"),
  };
  const clock = () => now,
    pr = new PlayerRepository(adapter, clock),
    sr = new SessionRepository(adapter, clock),
    mr = new MatchRepository(adapter, () => 0.5, clock),
    rr = new RewardsRepository(adapter, clock),
    seasons = new SeasonsRepository(adapter);
  await pr.load();
  await sr.load();
  now = "2026-09-28T12:00:00.000Z";
  const generated = (
      await mr.refresh({ player, career }, profile, sessions, now, "UTC")
    ).data.matches[0],
    rival = JSON.stringify(generated.rival);
  let seasonData = await seasons.start(
    career,
    player,
    clubById("tokyo-zenith"),
    calendarContext(new Date(now)),
  );
  for (const [day, reps] of [
    ["2026-09-29", 11],
    ["2026-09-30", 12],
    ["2026-10-01", 13],
  ]) {
    now = day + "T12:00:00.000Z";
    sessions = await sr.commit({
      type: "start",
      plan: plan(),
      library: standardExercises,
    });
    const active = sessions.active;
    sessions = await sr.commit({
      type: "confirm",
      sessionId: active.id,
      setId: position(active).set.id,
      actual: { type: "reps", reps },
    });
    const completed = sessions.completed[0];
    assert.ok(
      JSON.parse(map.get(SESSION_KEY)).completed.some(
        (s) => s.id === completed.id,
      ),
    );
    player = (await pr.reconcile(sessions)).player;
    await rr.award(captureReward(completed, player.id));
    seasonData = await seasons.record(
      { player, career },
      completed,
      sessions,
      calendarContext(new Date(now)),
    );
    const current = (
      await mr.refresh({ player, career }, profile, sessions, now, "UTC")
    ).data.matches[0];
    assert.equal(JSON.stringify(current.rival), rival);
    assert.equal(current.weekEnd, null);
  }
  assert.ok(player.ratings.Chest > player.initialRatings.Chest);
  assert.equal(
    derivePersonalRecords(sessions.completed).records.find(
      (r) => r.exerciseId === "push-up",
    ).best.value,
    13,
  );
  assert.equal(balance(await rr.load()), 60);
  assert.equal(seasonData.seasons[0].evidence.length, 2);
  now = "2026-10-02T12:00:00.000Z";
  await seasons.complete(
    seasonData.seasons[0].id,
    career,
    player,
    calendarContext(new Date(now)),
  );
  const closed = map.get(SEASONS_KEY),
    savedPlayer = map.get(PLAYER_KEY),
    savedSessions = map.get(SESSION_KEY);
  now = "2026-10-05T00:00:00.000Z";
  let current = (
    await mr.refresh(
      { player, career },
      profile,
      sessions,
      now,
      "Pacific/Auckland",
    )
  ).data.matches.find((m) => m.id === generated.id);
  assert.equal(M.matchStatus(current, now), "READY");
  assert.equal(current.week.timeZone, "UTC");
  assert.equal(current.weekEnd.ovr, overall(player.ratings));
  assert.deepEqual(current.weekEnd.trainingDays, [
    "2026-09-29",
    "2026-09-30",
    "2026-10-01",
  ]);
  assert.equal(current.weekEnd.weeklyBonus, 10);
  const scope = {
    playerId: player.id,
    careerStartedAt: career.clubHistory[0].joinedAt,
  };
  const result = await playSaved(mr, { player, career }, current.id);
  await Promise.all(
    Array.from({ length: 5 }, () =>
      new RewardsRepository(adapter, clock).reconcileMatches(scope),
    ),
  );
  const rewards = await rr.load();
  assert.equal(balance(rewards), 85);
  assert.equal(rewards.receipts.length, 3);
  assert.equal(
    rewards.transactions.filter((t) => t.type === "match-result").length,
    1,
  );
  const rendered = completedPresentation(result.match);
  assert.equal(rendered.result.outcome, "WIN");
  const before = new Map(map),
    count = writes.length,
    controller = new CinematicController({
      schedule: () => 0,
      cancel: () => {},
    });
  controller.start(() => {}, false);
  controller.skip();
  controller.background();
  controller.dispose();
  const items = H.historyAt(await mr.load(), scope, rewards, now),
    season = (await seasons.load()).seasons[0];
  const stats = H.matchStatistics(H.seasonMatches(items, season), true);
  assert.equal(stats.wins, 1);
  assert.equal(stats.confirmedCoins, 25);
  assert.equal(H.matchMonth(result.match), "2026-09");
  assert.equal(map.get(SEASONS_KEY), closed);
  assert.equal(map.get(PLAYER_KEY), savedPlayer);
  assert.equal(map.get(SESSION_KEY), savedSessions);
  assert.deepEqual(map, before);
  assert.equal(writes.length, count);
  await new RewardsRepository(adapter, clock).reconcileMatches(scope);
  await mr.play({ player, career }, current.id);
  assert.equal(writes.length, count);
  assert.equal(parseRewards(map.get(REWARDS_KEY)).version, 2);
});
test("near-midnight travel cannot duplicate an ongoing Rival or create a missed week", () => {
  const o = owner();
  let data = M.generateCurrentMatch(
    { version: 1, matches: [] },
    o,
    null,
    "2026-09-28T00:01:00.000Z",
    "UTC",
    () => 0.5,
  );
  const snapshot = JSON.stringify(data);
  data = M.generateCurrentMatch(
    data,
    o,
    null,
    "2026-09-28T00:02:00.000Z",
    "America/Vancouver",
    () => assert.fail("reroll"),
  );
  assert.equal(JSON.stringify(data), snapshot);
  data = M.generateCurrentMatch(
    data,
    o,
    null,
    "2026-10-19T12:00:00.000Z",
    "Asia/Tokyo",
    () => 0.5,
  );
  assert.deepEqual(
    data.matches.map((m) => m.week.weekId),
    ["2026-09-28", "2026-10-19"],
  );
  assert.equal(C.matchDay("2026-10-04T23:59:59.999Z", "UTC"), "2026-10-04");
});
test("three years of valid saved history remain read-only and ordered", () => {
  const o = owner();
  o.player = initializePlayer(
    "audit",
    "2020-01-01T00:00:00.000Z",
    null,
    empty(),
  );
  o.career = beginCareer(
    "audit",
    "tokyo-zenith",
    "2020-01-01T00:00:00.000Z",
  ).career;
  let data = { version: 1, matches: [] };
  for (let i = 0; i < 156; i++) {
    const date = new Date(Date.UTC(2023, 0, 3 + i * 7)).toISOString();
    data = M.generateCurrentMatch(data, o, null, date, "UTC", () => 0.5);
  }
  data = M.parseMatches(JSON.stringify(data));
  const raw = JSON.stringify(data);
  const rows = H.historyAt(
    data,
    {
      playerId: o.player.id,
      careerStartedAt: o.career.clubHistory[0].joinedAt,
    },
    null,
    "2026-10-14T12:00:00.000Z",
  );
  assert.equal(rows.length, 156);
  assert.ok(rows[0].match.week.weekId > rows.at(-1).match.week.weekId);
  assert.equal(JSON.stringify(data), raw);
  assert.equal(H.matchStatistics(rows, false).played, 0);
});
