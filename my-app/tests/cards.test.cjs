const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  cardAppearance,
  deriveCardTier,
  deriveCardFinish,
  cardEvolution,
} = require("../src/cards/domain.ts");
const { overall } = require("../src/growth/domain.ts");
const { ratingUp } = require("../src/presentation/domain.ts");
const { PresentationController } = require("../src/presentation/controller.ts");
const {
  PresentationRepository,
} = require("../src/storage/presentation-repository.ts");
for (const [ovr, tier, finish] of [
  [0, "bronze", "standard"],
  [49, "bronze", "standard"],
  [50, "bronze", "high"],
  [59, "bronze", "high"],
  [60, "silver", "standard"],
  [74, "silver", "standard"],
  [75, "gold", "standard"],
  [89, "gold", "standard"],
  [90, "elite", "standard"],
  [98, "elite", "standard"],
  [99, "ascend", "standard"],
])
  test(`OVR ${ovr}: ${tier} ${finish}`, () => {
    assert.equal(deriveCardTier(ovr), tier);
    assert.equal(deriveCardFinish(ovr), finish);
  });
for (const [a, b, from, to] of [
  [59, 60, "bronze", "silver"],
  [74, 75, "silver", "gold"],
  [89, 90, "gold", "elite"],
  [98, 99, "elite", "ascend"],
  [59, 91, "bronze", "elite"],
])
  test(`evolution ${a} to ${b}`, () =>
    assert.deepEqual(cardEvolution(a, b), { from, to, ovr: b }));
test("finish-only, unchanged and decreasing tiers do not celebrate", () => {
  for (const [a, b] of [
    [49, 50],
    [60, 74],
    [90, 90],
    [75, 74],
  ])
    assert.equal(cardEvolution(a, b), null);
});
test("next evolution and maximum are deterministic", () => {
  assert.deepEqual(cardAppearance(59).next, { tier: "silver", minimum: 60 });
  assert.equal(cardAppearance(99).next, null);
  assert.equal(cardAppearance(98).next.minimum, 99);
});
test("invalid input is never silently assigned a final tier", () => {
  for (const n of [-1, 100, NaN, 59.9]) assert.throws(() => deriveCardTier(n));
});
const areas = ["Chest", "Back", "Shoulders", "Arms", "Core", "Legs"];
const ratings = (n) => Object.fromEntries(areas.map((a) => [a, n]));
function evidence() {
  return {
    id: "p",
    initialRatings: ratings(59.99),
    ratings: ratings(60),
    events: [
      {
        id: "e",
        sessionId: "s",
        kind: "growth",
        changes: areas.map((area) => ({ area, before: 59.99, after: 60 })),
      },
    ],
    finalizedSessionIds: ["s"],
  };
}
test("evolution uses the existing OVR and detached factual after snapshot", () => {
  const p = evidence(),
    raw = JSON.stringify(p),
    r = ratingUp(p, "s");
  assert.equal(r.evolution.ovr, overall(p.ratings));
  assert.equal(r.evolution.to, cardAppearance(overall(p.ratings)).tier);
  r.afterRatings.Chest = 1;
  assert.equal(JSON.stringify(p), raw);
});
test("history, duplicate callbacks, reload share one consumption identity", async () => {
  let raw = null,
    writes = 0;
  const adapter = {
    read: async () => raw,
    write: async (k, v) => {
      assert.equal(k, "ascend.presentation.v1");
      raw = v;
      writes++;
    },
    remove: async () => assert.fail(),
  };
  const p = evidence(),
    c = new PresentationController(new PresentationRepository(adapter));
  assert.equal(await c.next(p, ["s"]), null);
  c.request("s");
  assert.ok((await c.next(p, ["s"])).evolution);
  c.request("s");
  assert.equal(await c.next(p, ["s"]), null);
  const reloaded = new PresentationController(
    new PresentationRepository(adapter),
  );
  reloaded.request("s");
  assert.equal(await reloaded.next(p, ["s"]), null);
  assert.equal(writes, 1);
});
test("consumption failure suppresses rating and evolution together", async () => {
  const c = new PresentationController(
    new PresentationRepository({
      read: async () => null,
      write: async () => {
        throw Error("disk");
      },
      remove: async () => assert.fail(),
    }),
  );
  c.request("s");
  assert.equal(await c.next(evidence(), ["s"]), null);
});
