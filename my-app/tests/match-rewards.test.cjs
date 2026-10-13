const test = require("node:test");
const assert = require("node:assert/strict");
const D = require("../src/rewards/domain.ts");
const P = require("../src/rewards/matches.ts");
const M = require("../src/matches/domain.ts");
const E = require("../src/matches/evidence.ts");
const { initializePlayer } = require("../src/growth/domain.ts");
const { beginCareer } = require("../src/career/domain.ts");
const {
  RewardsRepository,
  REWARDS_KEY,
} = require("../src/storage/rewards-repository.ts");
const {
  MatchRepository,
  MATCHES_KEY,
} = require("../src/storage/match-repository.ts");
const sessions = { version: 1, active: null, completed: [] };
const at = "2026-10-12T12:00:00.000Z";
function fixture(outcome = "LOSS", complete = true) {
  const owner = {
    player: initializePlayer(
      "reward-player",
      "2026-01-01T00:00:00.000Z",
      null,
      sessions,
    ),
    career: beginCareer(
      "reward-player",
      "tokyo-zenith",
      "2026-01-01T00:00:00.000Z",
    ).career,
  };
  const data = M.generateCurrentMatch(
    { version: 1, matches: [] },
    owner,
    null,
    "2026-10-06T12:00:00.000Z",
    "UTC",
    () => 0.5,
  );
  const m = data.matches[0];
  m.weekEnd = E.reconstructWeekEnd(
    owner.player,
    sessions,
    m.week,
    3,
    m.week.endExclusiveAt,
  ).snapshot;
  // Isolated, schema-valid participation snapshots, never actual workout records.
  if (outcome === "WIN" || outcome === "DRAW") {
    m.weekEnd.trainingDays = ["2026-10-05", "2026-10-06", "2026-10-07"];
    m.weekEnd.weeklyBonus = 10;
    m.weekEnd.playerMatchPower = 55;
    m.weekEnd.evidence.qualifyingSessionIds = ["a", "b", "c"];
    m.weekEnd.evidence.finalizedSessionIds = ["a", "b", "c"];
  }
  if (outcome === "DRAW") m.rival.condition = 10;
  if (complete) m.result = M.resolveMatch(m, at);
  return {
    owner,
    paymentOwner: {
      playerId: owner.player.id,
      careerStartedAt: owner.career.clubHistory[0].joinedAt,
    },
    data: M.parseMatches(JSON.stringify(data)),
    id: m.id,
  };
}
function memory(matchData, rewards) {
  const map = new Map();
  if (matchData) map.set(MATCHES_KEY, JSON.stringify(matchData));
  if (rewards)
    map.set(
      REWARDS_KEY,
      typeof rewards === "string" ? rewards : JSON.stringify(rewards),
    );
  const f = {
    map,
    writes: [],
    fail: false,
    ack: false,
    noOp: false,
    readFail: false,
    matchWriteFail: false,
  };
  f.adapter = {
    read: async (k) => {
      if (f.readFail) throw Error("read");
      return map.get(k) ?? null;
    },
    write: async (k, v) => {
      if (
        (k === REWARDS_KEY && f.fail) ||
        (k === MATCHES_KEY && f.matchWriteFail)
      )
        throw Error("write");
      f.writes.push(k);
      if (!f.noOp) map.set(k, v);
      if (k === REWARDS_KEY && f.ack) throw Error("lost acknowledgment");
    },
    remove: async () => assert.fail("no reset"),
  };
  f.repo = () => new RewardsRepository(f.adapter, () => at);
  return f;
}
const intent = (id, day = "2026-10-05") => ({
  sessionId: id,
  playerId: null,
  completedAt: day + "T12:00:00.000Z",
  localDay: day,
  weekId: D.weekId(day),
  offsetMinutes: 0,
});
for (const [outcome, amount] of [
  ["WIN", 25],
  ["DRAW", 15],
  ["LOSS", 10],
])
  test(`${outcome} pays exact total automatically from saved outcome`, async () => {
    const x = fixture(outcome),
      f = memory(x.data),
      raw = JSON.stringify(x.data);
    const paid = await f.repo().reconcileMatches(x.paymentOwner);
    assert.equal(paid.version, 2);
    assert.equal(D.balance(paid), amount);
    assert.equal(paid.receipts.length, 0);
    const tx = paid.transactions[0];
    assert.equal(tx.id, P.matchRewardId(x.id));
    assert.equal(tx.resultId, x.data.matches[0].result.id);
    assert.equal(tx.outcome, outcome);
    assert.equal(tx.playerId, x.paymentOwner.playerId);
    assert.equal(tx.createdAt, at);
    assert.equal(f.map.get(MATCHES_KEY), raw);
    assert.deepEqual(f.writes, [REWARDS_KEY]);
  });
for (const status of ["UPCOMING", "READY", "PENDING_EVIDENCE", "SKIPPED"])
  test(`${status} has zero eligibility and no writes`, async () => {
    const x = fixture("LOSS", false),
      m = x.data.matches[0];
    if (status === "UPCOMING" || status === "PENDING_EVIDENCE")
      m.weekEnd = null;
    if (status === "SKIPPED") m.skippedAt = m.week.expiresAt;
    const f = memory(x.data);
    assert.equal(D.balance(await f.repo().reconcileMatches(x.paymentOwner)), 0);
    assert.equal(f.writes.length, 0);
  });
test("legacy v1 read is byte-preserving and upgrade retains every workout receipt/transaction", async () => {
  let old = D.emptyRewards();
  for (const [i, day] of ["2026-10-05", "2026-10-06", "2026-10-07"].entries())
    old = D.applyReward(old, intent(String(i), day));
  const x = fixture("WIN"),
    f = memory(x.data, old),
    raw = f.map.get(REWARDS_KEY);
  assert.deepEqual(await f.repo().load(), old);
  assert.equal(f.map.get(REWARDS_KEY), raw);
  assert.equal(f.writes.length, 0);
  const paid = await f.repo().reconcileMatches(x.paymentOwner);
  assert.equal(D.balance(paid), 85);
  assert.deepEqual(paid.receipts, old.receipts);
  assert.deepEqual(
    paid.transactions.slice(0, old.transactions.length),
    old.transactions,
  );
  assert.equal(D.weeklyDays(paid, "2026-10-05"), 3);
  assert.equal(D.sessionRewards(paid, "2").total, 40);
});
test("Match payment does not consume the next workout daily/weekly entitlement", async () => {
  const x = fixture(),
    f = memory(x.data);
  await f.repo().reconcileMatches(x.paymentOwner);
  let d = await f.repo().award(intent("a"));
  assert.equal(D.balance(d), 20);
  assert.equal(D.weeklyDays(d, "2026-10-05"), 1);
  d = await f.repo().award(intent("b", "2026-10-06"));
  d = await f.repo().award(intent("c", "2026-10-07"));
  assert.equal(D.balance(d), 70);
  assert.equal(D.sessionRewards(d, "c").total, 40);
  assert.equal(
    (await f.repo().award(intent("same"))).transactions.filter(
      (t) => t.type === "daily-workout",
    ).length,
    3,
  );
});
test("repeated/concurrent reconciliation, repository remount and restart have one effect", async () => {
  const x = fixture("WIN"),
    f = memory(x.data);
  const results = await Promise.all(
    Array.from({ length: 5 }, () => f.repo().reconcileMatches(x.paymentOwner)),
  );
  for (const r of results) assert.equal(D.balance(r), 25);
  assert.equal(f.writes.length, 1);
  assert.equal(D.balance(await f.repo().load()), 25);
  await f.repo().reconcileMatches(x.paymentOwner);
  assert.equal(f.writes.length, 1);
});
test("shared adapter queue preserves concurrent workout and Match writes without deadlock", async () => {
  const x = fixture("DRAW"),
    f = memory(x.data);
  await Promise.all([
    f.repo().reconcileMatches(x.paymentOwner),
    f.repo().award(intent("a")),
    f.repo().award(intent("b", "2026-10-06")),
    f.repo().reconcileMatches(x.paymentOwner),
  ]);
  const paid = await f.repo().load();
  assert.equal(D.balance(paid), 35);
  assert.equal(paid.receipts.length, 2);
  assert.equal(paid.transactions.length, 3);
});
test("concurrent PLAY and reconciliation, then persisted-result detection, pays once", async () => {
  const x = fixture("WIN", false),
    f = memory(x.data),
    matches = new MatchRepository(
      f.adapter,
      () => 0.5,
      () => at,
    );
  await Promise.all([
    f.repo().reconcileMatches(x.paymentOwner),
    matches.play(x.owner, x.id),
    matches.play(x.owner, x.id),
  ]);
  await f.repo().reconcileMatches(x.paymentOwner);
  assert.equal(D.balance(await f.repo().load()), 25);
  assert.equal(f.writes.filter((k) => k === MATCHES_KEY).length, 1);
  assert.equal(f.writes.filter((k) => k === REWARDS_KEY).length, 1);
});
test("result persisted but app stopped before payment recovers legacy null delivery once", async () => {
  const x = fixture(),
    f = memory(x.data);
  assert.equal(x.data.matches[0].rewardDelivery, null);
  assert.equal(D.balance(await f.repo().reconcileMatches(x.paymentOwner)), 10);
  assert.equal(
    (await new MatchRepository(f.adapter).load()).matches[0].rewardDelivery,
    null,
  );
  assert.equal(D.balance(await f.repo().reconcileMatches(x.paymentOwner)), 10);
  assert.equal(f.writes.length, 1);
});
test("failed Rewards write preserves Match result and all unrelated keys, then retries once", async () => {
  const x = fixture("WIN"),
    f = memory(x.data);
  for (const key of [
    "player",
    "sessions",
    "coach",
    "career",
    "seasons",
    "presentation",
    "training",
    "settings",
  ])
    f.map.set(`ascend.${key}.v1`, key);
  const before = [...f.map];
  f.fail = true;
  await assert.rejects(f.repo().reconcileMatches(x.paymentOwner));
  assert.deepEqual([...f.map], before);
  f.fail = false;
  assert.equal(D.balance(await f.repo().reconcileMatches(x.paymentOwner)), 25);
  assert.deepEqual(
    [...f.map].filter(([k]) => k !== REWARDS_KEY),
    before,
  );
});
test("lost Rewards acknowledgment recovers durable transaction without another credit", async () => {
  const x = fixture(),
    f = memory(x.data);
  f.ack = true;
  await assert.rejects(f.repo().reconcileMatches(x.paymentOwner));
  const raw = f.map.get(REWARDS_KEY);
  f.ack = false;
  assert.equal(D.balance(await f.repo().reconcileMatches(x.paymentOwner)), 10);
  assert.equal(f.map.get(REWARDS_KEY), raw);
  assert.equal(f.writes.length, 1);
});
test("fulfilled but non-durable storage write is not reported as confirmed", async () => {
  const x = fixture(),
    f = memory(x.data);
  f.noOp = true;
  await assert.rejects(f.repo().reconcileMatches(x.paymentOwner));
  assert.equal(f.map.get(REWARDS_KEY), undefined);
  f.noOp = false;
  assert.equal(D.balance(await f.repo().reconcileMatches(x.paymentOwner)), 10);
});
test("no Match acknowledgment write is required; Match write failure cannot block confirmed payment", async () => {
  const x = fixture("DRAW"),
    f = memory(x.data);
  f.matchWriteFail = true;
  assert.equal(D.balance(await f.repo().reconcileMatches(x.paymentOwner)), 15);
  const raw = f.map.get(MATCHES_KEY);
  assert.equal(raw, JSON.stringify(x.data));
  assert.equal(D.balance(await f.repo().reconcileMatches(x.paymentOwner)), 15);
  assert.deepEqual(f.writes, [REWARDS_KEY]);
});
test("paid transaction with null Match acknowledgment is authoritative after reload", async () => {
  const x = fixture("WIN"),
    paid = P.applyMatchPayments(D.emptyRewards(), x.data, x.paymentOwner, at),
    f = memory(x.data, paid);
  assert.equal(D.balance(await f.repo().load()), 25);
  await f.repo().reconcileMatches(x.paymentOwner);
  assert.equal(f.writes.length, 0);
});
for (const raw of [
  "broken",
  '{"version":3,"receipts":[],"transactions":[]}',
  '{"version":2,"receipts":[],"transactions":[{"type":"unknown"}]}',
])
  test("bad Rewards preserved " + raw, async () => {
    const x = fixture(),
      f = memory(x.data, raw);
    await assert.rejects(f.repo().load());
    await assert.rejects(f.repo().reconcileMatches(x.paymentOwner));
    assert.equal(f.map.get(REWARDS_KEY), raw);
    assert.equal(f.writes.length, 0);
  });
for (const raw of [
  "broken",
  '{"version":2,"matches":[]}',
  '{"version":1,"matches":[{}]}',
])
  test("bad Match preserved and payment suppressed " + raw, async () => {
    const x = fixture(),
      f = memory();
    f.map.set(MATCHES_KEY, raw);
    await assert.rejects(f.repo().reconcileMatches(x.paymentOwner));
    assert.equal(f.map.get(MATCHES_KEY), raw);
    assert.equal(f.map.has(REWARDS_KEY), false);
    assert.equal(f.writes.length, 0);
  });
for (const [name, mutate] of [
  ["negative", (t) => (t.amount = -10)],
  ["wrong amount", (t) => (t.amount = 25)],
  ["wrong owner", (t) => (t.playerId = "other")],
  ["wrong result", (t) => (t.resultId = "wrong")],
  ["wrong ID", (t) => (t.id = "wrong")],
  ["unknown type", (t) => (t.type = "gift")],
  ["SKIPPED", (t) => (t.outcome = "SKIPPED")],
  ["date", (t) => (t.createdAt = "invalid")],
  ["pre-result date", (t) => (t.createdAt = "2026-01-01T00:00:00.000Z")],
  ["career", (t) => (t.careerStartedAt = "2026-02-01T00:00:00.000Z")],
])
  test("transaction corruption rejected: " + name, () => {
    const x = fixture(),
      paid = P.applyMatchPayments(D.emptyRewards(), x.data, x.paymentOwner, at);
    mutate(paid.transactions[0]);
    assert.throws(() => D.parseRewards(JSON.stringify(paid)));
  });
test("duplicate transaction and duplicate Match payment identities rejected", () => {
  const x = fixture(),
    paid = P.applyMatchPayments(D.emptyRewards(), x.data, x.paymentOwner, at);
  paid.transactions.push({ ...paid.transactions[0] });
  assert.throws(() => D.parseRewards(JSON.stringify(paid)));
  paid.transactions[1].id = "different";
  assert.throws(() => D.parseRewards(JSON.stringify(paid)));
});
test("version 1 cannot smuggle a Match payment; supported version 2 retains strict workout replay", () => {
  const x = fixture(),
    paid = P.applyMatchPayments(D.emptyRewards(), x.data, x.paymentOwner, at);
  paid.version = 1;
  assert.throws(() => D.parseRewards(JSON.stringify(paid)));
  paid.version = 2;
  const mixed = D.applyReward(paid, intent("a"));
  mixed.transactions.find((t) => t.type === "daily-workout").amount = 999;
  assert.throws(() => D.parseRewards(JSON.stringify(mixed)));
});
test("structural payment is cross-checked against durable result, not accepted alone", async () => {
  const x = fixture(),
    paid = P.applyMatchPayments(D.emptyRewards(), x.data, x.paymentOwner, at);
  const unresolved = fixture("LOSS", false),
    f = memory(unresolved.data, paid);
  await assert.rejects(f.repo().load());
  await assert.rejects(f.repo().reconcileMatches(x.paymentOwner));
  assert.equal(f.writes.length, 0);
});
test("wrong reconciliation ownership and missing read data fail without overwrite", async () => {
  const x = fixture(),
    f = memory(x.data);
  await assert.rejects(
    f.repo().reconcileMatches({ ...x.paymentOwner, playerId: "other" }),
  );
  assert.equal(f.writes.length, 0);
  f.readFail = true;
  await assert.rejects(f.repo().reconcileMatches(x.paymentOwner));
  assert.equal(f.map.has(REWARDS_KEY), false);
});
test("future resolution relative to clock waits without inventing award time", async () => {
  const x = fixture(),
    f = memory(x.data),
    r = new RewardsRepository(
      f.adapter,
      () => x.data.matches[0].week.endExclusiveAt,
    );
  await assert.rejects(r.reconcileMatches(x.paymentOwner));
  assert.equal(f.writes.length, 0);
});
test("empty stores and unresolved legacy Match remain read-only without automatic initialization", async () => {
  const f = memory(),
    x = fixture("LOSS", false);
  assert.deepEqual(
    await f.repo().reconcileMatches(x.paymentOwner),
    D.emptyRewards(),
  );
  assert.equal(f.writes.length, 0);
  f.map.set(MATCHES_KEY, JSON.stringify(x.data));
  assert.deepEqual(await new MatchRepository(f.adapter).load(), x.data);
  await f.repo().reconcileMatches(x.paymentOwner);
  assert.equal(f.writes.length, 0);
});
test("detached payment results cannot mutate durable data", async () => {
  const x = fixture(),
    f = memory(x.data),
    d = await f.repo().reconcileMatches(x.paymentOwner);
  d.transactions[0].amount = 999;
  assert.equal(D.balance(await f.repo().load()), 10);
});

test("post-commit confirmation read failure recovers without a second payment", async () => {
  const x = fixture(),
    f = memory(x.data),
    read = f.adapter.read;
  let rejectRead = true;
  f.adapter.read = async (key) => {
    if (key === REWARDS_KEY && f.writes.length && rejectRead)
      throw Error("confirmation read failed");
    return read(key);
  };
  await assert.rejects(f.repo().reconcileMatches(x.paymentOwner));
  const raw = f.map.get(REWARDS_KEY);
  assert.equal(D.balance(D.parseRewards(raw)), 10);
  rejectRead = false;
  assert.equal(D.balance(await f.repo().reconcileMatches(x.paymentOwner)), 10);
  assert.equal(f.map.get(REWARDS_KEY), raw);
  assert.equal(f.writes.length, 1);
});

test("a structurally valid payment for a different valid outcome is rejected against source", async () => {
  const loss = fixture("LOSS"),
    win = fixture("WIN");
  const paid = P.applyMatchPayments(
    D.emptyRewards(),
    loss.data,
    loss.paymentOwner,
    at,
  );
  const f = memory(win.data, paid),
    before = [...f.map];
  await assert.rejects(f.repo().load());
  await assert.rejects(f.repo().reconcileMatches(win.paymentOwner));
  assert.deepEqual([...f.map], before);
  assert.equal(f.writes.length, 0);
});

test("session summary excludes Match transactions even if IDs share the same text", async () => {
  const x = fixture(),
    f = memory(x.data);
  await f.repo().reconcileMatches(x.paymentOwner);
  const d = await f.repo().award(intent(x.id));
  assert.equal(D.balance(d), 20);
  assert.equal(D.sessionRewards(d, x.id).total, 10);
  assert.equal(D.sessionRewards(d, x.id).transactions.length, 1);
});

test("all legacy unpaid completed Matches settle together in one durable document", async () => {
  const x = fixture();
  let data = { version: 1, matches: [] };
  for (const day of ["2026-09-02", "2026-09-09", "2026-09-16"]) {
    data = M.generateCurrentMatch(
      data,
      x.owner,
      null,
      day + "T12:00:00.000Z",
      "UTC",
      () => 0.5,
    );
    const m = data.matches.at(-1);
    m.weekEnd = E.reconstructWeekEnd(
      x.owner.player,
      sessions,
      m.week,
      3,
      m.week.endExclusiveAt,
    ).snapshot;
    m.result = M.resolveMatch(m, m.week.endExclusiveAt);
    data = M.parseMatches(JSON.stringify(data));
  }
  const f = memory(data),
    paid = await f.repo().reconcileMatches(x.paymentOwner);
  assert.equal(D.balance(paid), 30);
  assert.equal(paid.transactions.length, 3);
  assert.deepEqual(
    paid.transactions.map((t) => t.matchId),
    data.matches.map((m) => m.id),
  );
  assert.deepEqual(f.writes, [REWARDS_KEY]);
  await f.repo().reconcileMatches(x.paymentOwner);
  assert.equal(f.writes.length, 1);
});
