const test = require("node:test"),
  assert = require("node:assert/strict");
const H = require("../src/matches/history.ts");
const M = require("../src/matches/domain.ts");
const E = require("../src/matches/evidence.ts");
const R = require("../src/rewards/domain.ts");
const P = require("../src/rewards/matches.ts");
const S = require("../src/seasons/domain.ts");
const L = require("../src/localization/core.ts");
const { en } = require("../src/localization/locales/en.ts"),
  { ja } = require("../src/localization/locales/ja.ts");
const { initializePlayer } = require("../src/growth/domain.ts");
const { beginCareer } = require("../src/career/domain.ts");
const { clubs } = require("../src/config/clubs.ts");
const sessions = { version: 1, active: null, completed: [] };
const now = "2026-10-13T12:00:00.000Z";
function owner(id = "history-player", joined = "2026-01-01T00:00:00.000Z") {
  return {
    player: initializePlayer(id, "2026-01-01T00:00:00.000Z", null, sessions),
    career: beginCareer(id, "tokyo-zenith", joined).career,
  };
}
const scope = (o) => ({
  playerId: o.player.id,
  careerStartedAt: o.career.clubHistory[0].joinedAt,
});
function match(day = "2026-10-06", outcome = "LOSS", tz = "UTC", o = owner()) {
  const d = M.generateCurrentMatch(
      { version: 1, matches: [] },
      o,
      null,
      day + "T12:00:00.000Z",
      tz,
      () => 0.5,
    ),
    m = d.matches[0];
  if (outcome !== "UPCOMING" && outcome !== "PENDING_EVIDENCE")
    m.weekEnd = E.reconstructWeekEnd(
      o.player,
      sessions,
      m.week,
      3,
      m.week.endExclusiveAt,
    ).snapshot;
  if (outcome === "WIN" || outcome === "DRAW") {
    m.weekEnd.trainingDays = [0, 1, 2].map((i) =>
      new Date(Date.parse(m.week.weekId + "T12:00:00.000Z") + i * 86400000)
        .toISOString()
        .slice(0, 10),
    );
    m.weekEnd.weeklyBonus = 10;
    m.weekEnd.playerMatchPower = 55;
    m.weekEnd.evidence.qualifyingSessionIds = ["a", "b", "c"];
    m.weekEnd.evidence.finalizedSessionIds = ["a", "b", "c"];
  }
  if (outcome === "DRAW") m.rival.condition = 10;
  if (["WIN", "DRAW", "LOSS"].includes(outcome))
    m.result = M.resolveMatch(
      m,
      new Date(Date.parse(m.week.endExclusiveAt) + 3600000).toISOString(),
    );
  if (outcome === "SKIPPED") m.skippedAt = m.week.expiresAt;
  return M.parseMatches(JSON.stringify(d)).matches[0];
}
const data = (...matches) => ({ version: 1, matches });
const items = (d, rewards = R.emptyRewards(), at = now, o = owner()) =>
  H.historyAt(d, scope(o), rewards, at);
function season(month = "2026-09", o = owner()) {
  const at = month + "-02T12:00:00.000Z";
  return S.startSeason(
    S.emptySeasons(),
    o.career,
    o.player,
    clubs["tokyo-zenith"],
    { at, monthId: month, localDay: month + "-02", offsetMinutes: 0 },
  ).seasons[0];
}
function freeze(v) {
  if (v && typeof v === "object") {
    Object.freeze(v);
    Object.values(v).forEach(freeze);
  }
  return v;
}

test("history orders all saved target weeks descending, not result or payment dates", () => {
  const a = match("2026-09-29"),
    b = match("2026-10-06"),
    c = match("2026-10-13", "UPCOMING");
  assert.deepEqual(
    items(data(a, c, b)).map((i) => i.match.week.weekId),
    ["2026-10-12", "2026-10-05", "2026-09-28"],
  );
});
test("history filters Player and Career identity, including same Player with another Career", () => {
  const o = owner(),
    foreign = owner("another"),
    otherCareer = owner("history-player", "2026-02-01T00:00:00.000Z");
  const own = match(),
    a = match("2026-10-06", "LOSS", "UTC", foreign),
    b = match("2026-10-06", "LOSS", "UTC", otherCareer);
  assert.deepEqual(
    items(data(a, own, b)).map((i) => i.match.id),
    [own.id],
  );
  assert.equal(
    H.historyAt(data(own), scope(foreign), R.emptyRewards(), now).length,
    0,
  );
});
for (const outcome of ["WIN", "DRAW", "LOSS"])
  test(
    "completed " + outcome + " retains factual result and exact saved powers",
    () => {
      const m = match("2026-10-06", outcome),
        i = items(data(m))[0];
      assert.equal(i.status, "COMPLETED");
      assert.equal(i.match.result.outcome, outcome);
      assert.equal(i.match.result.playerMatchPower, m.weekEnd.playerMatchPower);
      assert.equal(
        i.match.result.rivalMatchPower,
        m.rival.ovr + m.rival.condition,
      );
    },
  );
for (const [day, state] of [
  ["2026-10-13", "UPCOMING"],
  ["2026-10-06", "PENDING_EVIDENCE"],
  ["2026-09-29", "SKIPPED"],
])
  test("distinct lifecycle " + state + " is never a result", () => {
    const m = match(day, state),
      i = items(data(m))[0];
    assert.equal(i.status, state);
    assert.equal(i.match.result, null);
    assert.equal(i.payment.state, "ineligible");
  });
test("READY is a saved snapshot without outcome or earned Coins", () => {
  const m = match("2026-10-06", "READY"),
    i = items(data(m))[0];
  assert.equal(i.status, "READY");
  assert.equal(i.match.result, null);
  assert.equal(i.payment.confirmed, 0);
});
test("empty history has no samples or mock Rival and zero-played rate is null", () => {
  const list = items(data());
  assert.deepEqual(list, []);
  const stats = H.matchStatistics(list, true);
  assert.equal(stats.played, 0);
  assert.equal(stats.winRate, null);
  assert.equal(stats.confirmedCoins, 0);
});
test("saved identities, both Clubs, weekly goal/ratings and condition are retained without catalog lookups", () => {
  const m = match();
  m.club.name = "Original Player Club";
  m.rival.club.name = "Original Rival Club";
  m.rival.name = "Original Rival";
  const before = JSON.stringify(m),
    i = items(data(freeze(m)))[0];
  assert.equal(i.match.club.name, "Original Player Club");
  assert.equal(i.match.rival.club.name, "Original Rival Club");
  assert.equal(i.match.rival.name, "Original Rival");
  assert.equal(i.match.weekEnd.ovr, 45);
  assert.equal(i.match.goalSnapshot, 3);
  assert.equal(i.match.weekEnd.weeklyBonus, 0);
  assert.equal(i.match.rival.condition, 7);
  assert.equal(JSON.stringify(m), before);
});
test("missing week-end evidence remains null rather than current OVR/zero targets", () => {
  const m = match("2026-10-06", "PENDING_EVIDENCE"),
    o = owner();
  o.player.ratings.Core = 99;
  const i = items(data(m), R.emptyRewards(), now, o)[0];
  assert.equal(i.match.weekEnd, null);
  assert.equal(i.status, "PENDING_EVIDENCE");
});
test("completed reward due differs from confirmed paid amount", () => {
  const m = match("2026-10-06", "WIN"),
    d = data(m),
    pending = items(d)[0];
  assert.deepEqual(pending.payment, {
    state: "pending",
    expected: 25,
    confirmed: 0,
  });
  const rewards = P.applyMatchPayments(
    R.emptyRewards(),
    d,
    scope(owner()),
    now,
  );
  assert.deepEqual(items(d, rewards)[0].payment, {
    state: "paid",
    expected: 25,
    confirmed: 25,
  });
});
test("unavailable Rewards never imply zero confirmed Coins", () => {
  const list = items(data(match()), null);
  assert.equal(list[0].payment.state, "unavailable");
  assert.equal(list[0].payment.confirmed, null);
  assert.equal(H.matchStatistics(list, false).confirmedCoins, null);
  assert.equal(H.matchStatistics(list, true).confirmedCoins, null);
});
test("duplicate or mismatched payment evidence fails closed", () => {
  const m = match(),
    d = data(m),
    paid = P.applyMatchPayments(R.emptyRewards(), d, scope(owner()), now);
  const duplicate = structuredClone(paid);
  duplicate.transactions.push(duplicate.transactions[0]);
  assert.throws(() => items(d, duplicate));
  for (const field of [
    "amount",
    "playerId",
    "resultId",
    "outcome",
    "resolvedAt",
  ]) {
    const bad = structuredClone(paid);
    bad.transactions[0][field] = "wrong";
    assert.throws(() => items(d, bad));
  }
});
for (const [day, month] of [
  ["2026-10-06", "2026-10"],
  ["2026-09-29", "2026-09"],
  ["2026-12-29", "2026-12"],
  ["2027-01-05", "2027-01"],
])
  test("Monday month association " + day, () => {
    const m = match(day, "UPCOMING");
    assert.equal(H.matchMonth(m), month);
  });
test("frozen timezone attribution does not follow device timezone or later resolution month", () => {
  const m = match("2026-09-29", "LOSS", "America/Vancouver");
  assert.equal(m.week.weekId, "2026-09-28");
  assert.ok(m.result.resolvedAt.startsWith("2026-10"));
  const old = process.env.TZ;
  try {
    for (const tz of [
      "Asia/Tokyo",
      "America/Vancouver",
      "Pacific/Kiritimati",
    ]) {
      process.env.TZ = tz;
      assert.equal(H.matchMonth(m), "2026-09");
      assert.equal(
        H.seasonMatches(items(data(m)), season("2026-09")).length,
        1,
      );
    }
  } finally {
    if (old === undefined) delete process.env.TZ;
    else process.env.TZ = old;
  }
});
test("Season association filters ownership/month and never invents a Season", () => {
  const d = data(match("2026-09-29"), match("2026-10-06")),
    list = items(d),
    s = season();
  assert.equal(H.seasonMatches(list, s).length, 1);
  assert.equal(H.seasonMatches(list, season("2026-11")).length, 0);
  assert.equal(H.seasonMatches(list, { ...s, playerId: "other" }).length, 0);
  assert.equal(
    H.seasonMatches(list, { ...s, careerStartedAt: "2026-02-01T00:00:00.000Z" })
      .length,
    0,
  );
  assert.equal(d.matches.length, 2);
});
test("W/D/L, skipped exclusion, correct rate and confirmed Coins without duplicate counting", () => {
  const d = data(
    match("2026-09-08", "WIN"),
    match("2026-09-15", "DRAW"),
    match("2026-09-22", "LOSS"),
    match("2026-09-29", "SKIPPED"),
    match("2026-10-13", "UPCOMING"),
  );
  const rewardSource = data(...d.matches.filter((m) => m.result));
  const paid = P.applyMatchPayments(
    R.emptyRewards(),
    rewardSource,
    scope(owner()),
    now,
  );
  const list = items(d, paid),
    stats = H.matchStatistics([...list, ...list], true);
  assert.deepEqual(stats, {
    played: 3,
    wins: 1,
    draws: 1,
    losses: 1,
    skipped: 1,
    winRate: stats.winRate,
    expectedCoins: 50,
    confirmedCoins: 50,
  });
  assert.ok(Math.abs(stats.winRate - 100 / 3) < 1e-12);
});
test("Season Match Coins count confirmed subset, not expected unpaid rewards or workout Coins", () => {
  const a = match("2026-09-08", "WIN"),
    b = match("2026-09-15", "DRAW"),
    d = data(a, b);
  let paid = P.applyMatchPayments(
    R.emptyRewards(),
    data(a),
    scope(owner()),
    now,
  );
  paid = R.applyReward(paid, {
    sessionId: "work",
    playerId: null,
    completedAt: "2026-09-09T12:00:00.000Z",
    localDay: "2026-09-09",
    weekId: "2026-09-07",
    offsetMinutes: 0,
  });
  const stats = H.matchStatistics(
    H.seasonMatches(items(d, paid), season()),
    true,
  );
  assert.equal(R.balance(paid), 35);
  assert.equal(stats.expectedCoins, 40);
  assert.equal(stats.confirmedCoins, 25);
});
test("late completion/payment updates read-only statistics without changing completed Season bytes", () => {
  const o = owner(),
    s = season(),
    finished = S.completeSeason(
      { version: 1, seasons: [s] },
      s.id,
      o.career,
      o.player,
      {
        at: "2026-10-02T12:00:00.000Z",
        localDay: "2026-10-02",
        monthId: "2026-10",
        offsetMinutes: 0,
      },
    ).seasons[0];
  const m = match("2026-09-29", "READY"),
    d = data(m),
    before = JSON.stringify(finished);
  freeze(finished);
  assert.equal(
    H.matchStatistics(H.seasonMatches(items(d), finished), true).played,
    0,
  );
  m.result = M.resolveMatch(m, "2026-10-06T12:00:00.000Z");
  const pending = H.matchStatistics(H.seasonMatches(items(d), finished), true);
  assert.equal(pending.played, 1);
  assert.equal(pending.confirmedCoins, 0);
  const paid = P.applyMatchPayments(R.emptyRewards(), d, scope(o), now);
  assert.equal(
    H.matchStatistics(H.seasonMatches(items(d, paid), finished), true)
      .confirmedCoins,
    10,
  );
  assert.equal(JSON.stringify(finished), before);
});
test("repeated selectors are deterministic and mutate none of their inputs", () => {
  const d = data(match()),
    paid = P.applyMatchPayments(R.emptyRewards(), d, scope(owner()), now),
    s = season("2026-10");
  const before = JSON.stringify([d, paid, s]);
  freeze(d);
  freeze(paid);
  freeze(s);
  const first = items(d, paid);
  for (let i = 0; i < 20; i++) {
    assert.deepEqual(items(d, paid), first);
    H.matchStatistics(H.seasonMatches(first, s), true);
  }
  assert.equal(JSON.stringify([d, paid, s]), before);
});
test("calendar labels are locale-aware while saved Mondays remain the same across timezones", () => {
  const old = process.env.TZ;
  try {
    for (const tz of ["America/Vancouver", "Asia/Tokyo"]) {
      process.env.TZ = tz;
      assert.equal(L.formatCalendarDay("en", "2026-09-28"), "Sep 28, 2026");
      assert.equal(L.formatCalendarDay("ja", "2026-09-28"), "2026年9月28日");
    }
  } finally {
    if (old === undefined) delete process.env.TZ;
    else process.env.TZ = old;
  }
  for (const day of ["bad", "2026-02-29", "2026-13-01"])
    assert.equal(L.formatCalendarDay("en", day), "—");
});
test("unlock/result formatting uses saved timezone and language, with deterministic invalid fallback", () => {
  const english = L.formatZonedDate(
      "en",
      "2026-10-12T07:00:00.000Z",
      "America/Vancouver",
    ),
    japanese = L.formatZonedDate(
      "ja",
      "2026-10-12T07:00:00.000Z",
      "America/Vancouver",
    );
  assert.match(english, /Oct 12, 2026/);
  assert.match(japanese, /2026年10月12日/);
  assert.notEqual(english, japanese);
  assert.equal(L.formatZonedDate("en", now, "fake/zone"), "—");
  assert.equal(L.formatZonedDate("ja", "bad", "UTC"), "—");
});
test("every History key has both languages and interpolation is resolved", () => {
  const keys = Object.keys(en).filter((k) => k.startsWith("history."));
  assert.ok(keys.length > 35);
  for (const key of keys) {
    assert.ok(ja[key]);
    assert.equal(typeof L.translate("en", key), "string");
    assert.equal(typeof L.translate("ja", key), "string");
  }
  assert.equal(L.translate("ja", "history.dayCount", { count: 3 }), "3日");
  assert.equal(
    L.translate("en", "history.expectedTotal", { amount: 25 }),
    "Expected from completed Matches · 25 Coins",
  );
});
