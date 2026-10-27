const test = require("node:test"),
  assert = require("node:assert/strict");
const C = require("../src/shop/catalog.ts"),
  D = require("../src/shop/domain.ts"),
  R = require("../src/rewards/domain.ts");
const { shopProducts } = require("../src/shop/discovery.ts");
const {
  titleTreatment,
  treatmentBackground,
} = require("../src/shop/visuals.ts");
const {
  ShopRepository,
  SHOP_KEY,
} = require("../src/storage/shop-repository.ts");
const { initializePlayer, overall } = require("../src/growth/domain.ts");
const { cardAppearance } = require("../src/cards/domain.ts");
const { en } = require("../src/localization/locales/en.ts"),
  { ja } = require("../src/localization/locales/ja.ts");
const additions = C.catalog.slice(10);
function fixture() {
  const player = initializePlayer(
    "expansion",
    "2026-08-01T00:00:00.000Z",
    null,
    { version: 1, active: null, completed: [] },
  );
  let rewards = R.emptyRewards();
  for (let i = 1; i <= 28; i++) {
    const localDay = `2026-09-${String(i).padStart(2, "0")}`;
    rewards = R.applyReward(rewards, {
      sessionId: `e-${i}`,
      playerId: player.id,
      completedAt: `${localDay}T12:00:00.000Z`,
      localDay,
      weekId: R.weekId(localDay),
      offsetMinutes: 0,
    });
  }
  const map = new Map([
      ["ascend.player.v1", JSON.stringify({ version: 1, player })],
      ["ascend.rewards.v1", JSON.stringify(rewards)],
    ]),
    writes = [];
  const adapter = {
    read: async (k) => map.get(k) ?? null,
    write: async (k, v) => {
      assert.equal(k, SHOP_KEY);
      map.set(k, v);
      writes.push(k);
    },
    remove: async () => assert.fail("remove"),
  };
  return {
    map,
    writes,
    player,
    rewards,
    repo: () => new ShopRepository(adapter, () => "2026-10-20T12:00:00.000Z"),
  };
}
test("expansion retains every legacy catalog field and appends ten deterministic entries", () => {
  assert.deepEqual(
    C.catalog.slice(0, 10),
    require("./fixtures/shop-v1-catalog.json"),
  );
  assert.equal(additions.length, 10);
  assert.equal(new Set(C.catalog.map((i) => i.id)).size, 20);
  assert.deepEqual(
    additions.map((i) => i.id),
    [
      "bg-training-ground",
      "bg-night-arena",
      "bg-cyber-grid",
      "border-carbon",
      "border-platinum",
      "border-champion",
      "aura-electric",
      "aura-crimson",
      "title-challenger",
      "title-legend",
    ],
  );
  assert.equal(new Set(additions.map((i) => i.treatment)).size, 10);
  for (const i of additions) {
    assert.ok(C.categories.includes(i.category));
    assert.ok(Number.isSafeInteger(i.price) && i.price > 0 && i.price <= 260);
    assert.ok(Object.isFrozen(i));
    for (const l of [en, ja]) {
      assert.ok(l[`shop.item.${i.id}.name`]?.trim());
      assert.ok(l[`shop.item.${i.id}.description`]?.trim());
    }
  }
});
for (const item of additions)
  test(`${item.id}: concurrent purchase, durable equip/unequip, no rating or reward writes`, async () => {
    const f = fixture(),
      before = new Map(f.map),
      oldOVR = overall(f.player.ratings);
    const saved = await Promise.all([
      f.repo().purchase(f.player.id, item.id),
      f.repo().purchase(f.player.id, item.id),
    ]);
    assert.equal(f.writes.length, 1);
    assert.equal(saved[0].wallet.available, R.balance(f.rewards) - item.price);
    const state = await f.repo().equip(f.player.id, item.category, item.id);
    assert.equal(state.data.equipment[item.category], item.id);
    assert.equal(state.wallet.spent, item.price);
    assert.deepEqual(await f.repo().load(f.player.id), state);
    await f.repo().equip(f.player.id, item.category, null);
    const result = await f.repo().load(f.player.id);
    assert.deepEqual(result.data.equipment, C.defaultEquipment());
    assert.equal(result.data.purchases.length, 1);
    assert.equal(result.wallet.spent, item.price);
    for (const [k, v] of before) assert.equal(f.map.get(k), v);
    assert.equal(overall(f.player.ratings), oldOVR);
    assert.equal(cardAppearance(oldOVR).tier, "bronze");
    assert.equal(
      C.cosmeticAppearance({
        ...C.defaultEquipment(),
        [item.category]: item.id,
      })[item.category].id,
      item.id,
    );
  });
test("new products cannot bypass insufficient funds", () => {
  for (const item of additions)
    assert.throws(
      () =>
        D.buy(
          D.emptyShop(),
          R.emptyRewards(),
          "p",
          item.id,
          "2026-10-20T12:00:00.000Z",
        ),
      (e) => e.code === "insufficient",
    );
});
test("old purchases/equipment remain valid and same-slot replacements retain other slots", async () => {
  const f = fixture(),
    r = f.repo();
  await r.purchase(f.player.id, "bg-midnight");
  await r.equip(f.player.id, "background", "bg-midnight");
  const legacy = await r.load(f.player.id);
  assert.deepEqual(D.parseShop(JSON.stringify(legacy.data)), legacy.data);
  await r.purchase(f.player.id, "border-carbon");
  await r.equip(f.player.id, "border", "border-carbon");
  await r.purchase(f.player.id, "bg-training-ground");
  const s = await r.equip(f.player.id, "background", "bg-training-ground");
  assert.equal(s.data.equipment.border, "border-carbon");
  assert.deepEqual(s.data.purchases[0], legacy.data.purchases[0]);
  assert.equal(s.data.version, 1);
  assert.equal(s.data.catalogVersion, 1);
});
test("ownership/category filters are deterministic, detached read-only joins", () => {
  const f = fixture();
  let data = D.buy(
    D.emptyShop(),
    f.rewards,
    "p",
    "bg-training-ground",
    "2026-10-20T12:00:00.000Z",
  );
  data = D.equip(data, "p", "background", "bg-training-ground");
  const before = JSON.stringify(data);
  assert.equal(shopProducts("all", "all", data).length, 20);
  assert.deepEqual(
    shopProducts("all", "owned", data).map((i) => i.id),
    ["bg-training-ground"],
  );
  assert.equal(shopProducts("all", "unowned", data).length, 19);
  assert.equal(shopProducts("title", "owned", data).length, 0);
  assert.equal(shopProducts("background", "unowned", data).length, 5);
  assert.equal(JSON.stringify(data), before);
  assert.deepEqual(shopProducts("all", "owned", null), []);
  assert.deepEqual(shopProducts("all", "unowned", null), []);
});
test("new visual metadata remains separate from earned tier and supplies consistent title/background tokens", () => {
  for (const i of additions.filter((i) => i.category === "background"))
    assert.deepEqual(treatmentBackground(i), ["#10151e", i.color, "#151a23"]);
  assert.equal(
    titleTreatment(C.cosmeticById("title-challenger")).borderBottomWidth,
    1,
  );
  assert.equal(titleTreatment(C.cosmeticById("title-legend")).borderWidth, 1);
  assert.deepEqual(titleTreatment(C.cosmeticById("title-rookie")), {
    color: "#e6af7e",
  });
  for (const ovr of [0, 49, 50, 59, 60, 75, 90, 99]) {
    const before = cardAppearance(ovr);
    for (const i of additions)
      C.cosmeticAppearance({ ...C.defaultEquipment(), [i.category]: i.id });
    assert.deepEqual(cardAppearance(ovr), before);
  }
});
