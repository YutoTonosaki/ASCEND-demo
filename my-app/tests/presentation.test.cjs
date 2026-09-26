const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  ratingUp,
  presentationIdentity,
} = require("../src/presentation/domain.ts");
const {
  PresentationRepository,
  PRESENTATION_KEY,
} = require("../src/storage/presentation-repository.ts");
const { PresentationController } = require("../src/presentation/controller.ts");
const areas = ["Chest", "Back", "Shoulders", "Arms", "Core", "Legs"];
const ratings = (n) => Object.fromEntries(areas.map((a) => [a, n]));
function player(changes = [], initial = ratings(44.9)) {
  const current = { ...initial };
  const events = changes.map(
    ([area, after, kind = "growth", sessionId = "s"], i) => {
      const before = current[area];
      current[area] = after;
      return {
        id: "e" + i,
        kind,
        sessionId,
        changes: [{ area, before, after }],
        at: "2026-09-25T12:00:00Z",
      };
    },
  );
  return {
    id: "p",
    initialRatings: initial,
    ratings: current,
    events,
    finalizedSessionIds: ["s"],
  };
}
function store(raw = null) {
  const values = new Map(raw === null ? [] : [[PRESENTATION_KEY, raw]]);
  return {
    values,
    writes: 0,
    fail: false,
    async read(k) {
      return values.get(k) ?? null;
    },
    async write(k, v) {
      assert.equal(k, PRESENTATION_KEY);
      if (this.fail) throw Error("disk");
      this.writes++;
      values.set(k, v);
    },
    async remove() {
      throw Error("never remove");
    },
  };
}
test("decimal-only increases do not present", () =>
  assert.equal(
    ratingUp(player([["Chest", 44.92]], ratings(44.574)), "s"),
    null,
  ));
test("single integer crossing uses floors of stored endpoints", () =>
  assert.deepEqual(ratingUp(player([["Chest", 45.12]]), "s").areas, [
    { area: "Chest", before: 44, after: 45, assessed: false },
  ]));
test("multiple areas are grouped once, growth and bonus retain net endpoints", () => {
  const p = player([
    ["Chest", 44.96],
    ["Chest", 45.05, "bonus"],
    ["Legs", 45.2],
    ["Chest", 45.12],
  ]);
  const r = ratingUp(p, "s");
  assert.equal(r.areas.length, 2);
  assert.equal(r.areas[0].after, 45);
  assert.equal(p.ratings.Chest, 45.12);
});
test("OVR uses all six fractional ratings, not area integer counts", () => {
  const yes = ratingUp(player([["Chest", 45.6]]), "s");
  assert.deepEqual(yes.ovr, { before: 44, after: 45 });
  const no = ratingUp(player([["Chest", 45.1]]), "s");
  assert.equal(no.ovr, null);
});
test("OVR can cross without any body integer crossing", () => {
  const initial = { ...ratings(45.05), Chest: 44.7 };
  const r = ratingUp(player([["Chest", 44.9]], initial), "s");
  assert.deepEqual(r.areas, []);
  assert.deepEqual(r.ovr, { before: 44, after: 45 });
});
test("later workouts do not alter the reconstructed prior workout result", () => {
  const p = player([
    ["Chest", 45.1],
    ["Chest", 46, "growth", "later"],
  ]);
  assert.equal(ratingUp(p, "s").areas[0].after, 45);
});
test("assessment is labeled and net decreases do not celebrate", () => {
  const p = player([
    ["Chest", 46, "assessment"],
    ["Legs", 40, "assessment"],
  ]);
  const r = ratingUp(p, "s");
  assert.equal(r.areas.length, 1);
  assert.equal(r.areas[0].assessed, true);
  assert.equal(r.ovr, null);
});
test("partial/unfinalized evidence does not produce a presentation", () => {
  const p = player([["Chest", 45.1]]);
  p.finalizedSessionIds = [];
  assert.equal(ratingUp(p, "s"), null);
});
test("duplicate or discontinuous evidence fails closed without mutation", () => {
  const p = player([["Chest", 45.1]]);
  p.events.push(p.events[0]);
  const raw = JSON.stringify(p);
  assert.throws(() => ratingUp(p, "s"));
  assert.equal(JSON.stringify(p), raw);
  const q = player([["Chest", 45.1]]);
  q.events[0].changes[0].before = 0;
  assert.throws(() => ratingUp(q, "s"));
});
test("interleaved sessions cannot guess a before OVR", () =>
  assert.throws(() =>
    ratingUp(
      player([
        ["Chest", 45.1],
        ["Legs", 45.1, "growth", "other"],
        ["Chest", 45.2],
      ]),
      "s",
    ),
  ));
test("history and Player/debug reads cannot enqueue historical celebrations", async () => {
  const a = store(),
    c = new PresentationController(new PresentationRepository(a));
  assert.equal(await c.next(player([["Chest", 45.1]]), ["s"]), null);
  assert.equal(a.writes, 0);
});
test("request waits for durable session and finalized growth, including bonus", async () => {
  const a = store(),
    c = new PresentationController(new PresentationRepository(a));
  c.request("s");
  const p = player([["Chest", 44.98]]);
  p.finalizedSessionIds = [];
  assert.equal(await c.next(p, ["s"]), null);
  const final = player([
    ["Chest", 44.98],
    ["Chest", 45.1, "bonus"],
  ]);
  assert.equal(await c.next(final, []), null);
  assert.equal((await c.next(final, ["s"])).areas[0].after, 45);
});
test("mark-before-show, duplicate callbacks, repeated reads and remount never replay", async () => {
  const a = store(),
    p = player([["Chest", 45.1]]),
    c = new PresentationController(new PresentationRepository(a));
  c.request("s");
  const result = await c.next(p, ["s"]);
  assert.ok(
    JSON.parse(a.values.get(PRESENTATION_KEY)).consumed.includes(
      result.identity,
    ),
  );
  c.request("s");
  assert.equal(await c.next(p, ["s"]), null);
  const remount = new PresentationController(new PresentationRepository(a));
  remount.request("s");
  assert.equal(await remount.next(p, ["s"]), null);
  assert.equal(a.writes, 1);
});
test("reload before presentation drops volatile request instead of retroactive replay", async () => {
  const a = store(),
    c = new PresentationController(new PresentationRepository(a));
  c.request("s");
  const remount = new PresentationController(new PresentationRepository(a));
  assert.equal(await remount.next(player([["Chest", 45.1]]), ["s"]), null);
});
test("concurrent duplicate consumption is serialized", async () => {
  const a = store(),
    r = new PresentationRepository(a);
  assert.deepEqual(await Promise.all([r.consume("id"), r.consume("id")]), [
    true,
    false,
  ]);
  assert.equal(a.writes, 1);
});
test("asynchronous presentation write must finish before a result can be shown", async () => {
  const a = store();
  let release;
  const write = a.write.bind(a);
  a.write = async (k, v) => {
    await new Promise((r) => (release = r));
    await write(k, v);
  };
  const c = new PresentationController(new PresentationRepository(a));
  c.request("s");
  let returned = false;
  const job = c.next(player([["Chest", 45.1]]), ["s"]).then((r) => {
    returned = true;
    return r;
  });
  await new Promise((r) => setImmediate(r));
  assert.equal(returned, false);
  release();
  assert.ok(await job);
});
test("corrupt, unknown-version and failed presentation storage preserve all evidence", async () => {
  for (const raw of [
    "bad",
    JSON.stringify({ version: 2, consumed: [] }),
    JSON.stringify({ version: 1, consumed: [null] }),
  ]) {
    const a = store(raw),
      c = new PresentationController(new PresentationRepository(a)),
      p = player([["Chest", 45.1]]),
      before = JSON.stringify(p);
    c.request("s");
    assert.equal(await c.next(p, ["s"]), null);
    assert.equal(a.values.get(PRESENTATION_KEY), raw);
    assert.equal(JSON.stringify(p), before);
    assert.equal(a.writes, 0);
  }
  const a = store();
  a.fail = true;
  const c = new PresentationController(new PresentationRepository(a));
  c.request("s");
  assert.equal(await c.next(player([["Chest", 45.1]]), ["s"]), null);
});
test("identities use player and session IDs, not timestamps", () =>
  assert.notEqual(
    presentationIdentity("p", "s"),
    presentationIdentity("p", "t"),
  ));
