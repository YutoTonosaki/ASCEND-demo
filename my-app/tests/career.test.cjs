const test = require("node:test"),
  assert = require("node:assert/strict");
const {
  clubs,
  startingClubs,
  clubById,
  leagues,
} = require("../src/config/clubs.ts");
const {
  beginCareer,
  parseCareer,
  currentTenure,
} = require("../src/career/domain.ts");
const {
  CareerRepository,
  CAREER_KEY,
} = require("../src/storage/career-repository.ts");
const at = "2026-10-01T12:00:00.000Z";
function fixture(raw = null) {
  const map = new Map(raw === null ? [] : [[CAREER_KEY, raw]]);
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
        throw Error("no remove");
      },
    },
  };
}
test("12 unique resolvable original clubs; all environments, valid reputation/OVR/crests/preferences", () => {
  assert.equal(Object.keys(clubs).length, 12);
  assert.equal(new Set(Object.values(clubs).map((c) => c.id)).size, 12);
  assert.deepEqual(
    new Set(Object.values(clubs).map((c) => c.league)),
    new Set(Object.keys(leagues)),
  );
  for (const [id, c] of Object.entries(clubs)) {
    assert.equal(clubById(id), c);
    assert.equal(id, c.id);
    assert.ok(c.reputation >= 1 && c.reputation <= 5);
    assert.ok(
      Number.isInteger(c.recommendedOVR) &&
        c.recommendedOVR >= 0 &&
        c.recommendedOVR <= 99,
    );
    assert.equal(c.environment, c.league.toLowerCase());
    assert.match(c.crest.outlinePath, /^M/);
    assert.match(c.crest.markPath, /^M/);
    assert.ok(c.crest.viewBox);
    assert.deepEqual(c.preferredArchetypes, []);
  }
  assert.equal(clubById("unknown"), undefined);
  assert.equal(clubById("toString"), undefined);
});
for (const club of startingClubs)
  test(`${club.name} can start without OVR gate`, () => {
    const d = beginCareer("player", club.id, at);
    assert.equal(d.career.clubHistory.length, 1);
    assert.equal(currentTenure(d.career).clubId, club.id);
    assert.equal(currentTenure(d.career).leftAt, null);
  });
test("only three Japanese starting clubs; foreign/unknown clubs fail", () => {
  assert.equal(startingClubs.length, 3);
  assert.throws(() => beginCareer("p", "london-crown", at));
  assert.throws(() => beginCareer("p", "missing", at));
  assert.throws(() => beginCareer(" ", "tokyo-zenith", at));
});
test("missing storage is readonly not-started; browsing catalog does not write", async () => {
  const f = fixture(),
    r = new CareerRepository(f.adapter);
  assert.deepEqual(await r.load(), { version: 1, career: null });
  startingClubs.map((c) => clubById(c.id));
  assert.equal(f.writes, 0);
  assert.equal(f.map.size, 0);
});
test("confirmation writes once; queued different choices cannot switch clubs; reload/remount retains history", async () => {
  const f = fixture(),
    r = new CareerRepository(f.adapter, () => at);
  const [a, b] = await Promise.all([
    r.join("p", "tokyo-zenith"),
    r.join("p", "osaka-forge"),
  ]);
  assert.deepEqual(a, b);
  assert.equal(f.writes, 1);
  assert.equal(a.career.clubHistory.length, 1);
  assert.equal(currentTenure(a.career).clubId, "tokyo-zenith");
  assert.deepEqual(await new CareerRepository(f.adapter).load(), a);
});
test("results detached; editing return value cannot rewrite durable record", async () => {
  const f = fixture(),
    r = new CareerRepository(f.adapter, () => at);
  const a = await r.join("p", "tokyo-zenith");
  a.career.clubHistory[0].clubId = "osaka-forge";
  assert.equal(currentTenure((await r.load()).career).clubId, "tokyo-zenith");
});
test("different Player cannot take over existing career", async () => {
  const f = fixture(),
    r = new CareerRepository(f.adapter, () => at);
  await r.join("p", "tokyo-zenith");
  await assert.rejects(r.join("other", "osaka-forge"));
  assert.equal(f.writes, 1);
});
for (const raw of [
  "bad",
  JSON.stringify({ version: 2, career: {} }),
  JSON.stringify({ version: 1, career: null }),
  JSON.stringify({ version: 1, career: { playerId: "p", clubHistory: [] } }),
])
  test(`corrupt/newer/incomplete storage preserved ${raw}`, async () => {
    const f = fixture(raw),
      r = new CareerRepository(f.adapter);
    await assert.rejects(r.load());
    await assert.rejects(r.join("p", "tokyo-zenith"));
    assert.equal(f.map.get(CAREER_KEY), raw);
    assert.equal(f.writes, 0);
  });
test("failed write never claims career; retry creates one entry with retry commit timestamp; other keys unchanged", async () => {
  const f = fixture();
  for (const k of [
    "player",
    "rewards",
    "sessions",
    "presentation",
    "training",
    "coach",
  ])
    f.map.set(`ascend.${k}.v1`, `${k} evidence`);
  const before = [...f.map];
  let now = at;
  const r = new CareerRepository(f.adapter, () => now);
  f.fail = true;
  await assert.rejects(r.join("p", "tokyo-zenith"));
  assert.deepEqual([...f.map], before);
  assert.equal((await r.load()).career, null);
  f.fail = false;
  now = "2026-10-02T12:00:00.000Z";
  const d = await r.join("p", "tokyo-zenith");
  assert.equal(currentTenure(d.career).joinedAt, now);
  assert.deepEqual(
    [...f.map].filter(([k]) => k !== CAREER_KEY),
    before,
  );
});
test("read failure prevents join; no stale overwrite", async () => {
  const f = fixture(),
    r = new CareerRepository(f.adapter, () => at);
  await r.load();
  f.adapter.read = async () => {
    throw Error("unreadable");
  };
  await assert.rejects(r.join("p", "tokyo-zenith"));
  assert.equal(f.writes, 0);
});
for (const change of [
  (d) => (d.career.clubHistory[0].leftAt = at),
  (d) => (d.career.clubHistory[0].clubId = "missing"),
  (d) => (d.career.clubHistory[0].joinedAt = "not-date"),
  (d) => d.career.clubHistory.push({ ...d.career.clubHistory[0] }),
])
  test("contradictory current history fails closed", () => {
    const d = beginCareer("p", "tokyo-zenith", at);
    change(d);
    assert.throws(() => parseCareer(JSON.stringify(d)));
  });
test("future closed tenures remain; current derived only from final open entry", () => {
  const d = beginCareer("p", "tokyo-zenith", at);
  const next = "2027-01-01T12:00:00.000Z";
  d.career.clubHistory[0].leftAt = next;
  d.career.clubHistory.push({
    clubId: "berlin-einheit",
    joinedAt: next,
    leftAt: null,
  });
  const parsed = parseCareer(JSON.stringify(d));
  assert.equal(currentTenure(parsed.career).clubId, "berlin-einheit");
  assert.equal(parsed.career.clubHistory[0].clubId, "tokyo-zenith");
  d.career.clubHistory[1].joinedAt = at;
  assert.throws(() => parseCareer(JSON.stringify(d)));
});
