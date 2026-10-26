const test = require("node:test"),
  assert = require("node:assert/strict");
const C = require("../src/shop/catalog.ts"),
  D = require("../src/shop/domain.ts"),
  R = require("../src/rewards/domain.ts");
const {
    ShopRepository,
    SHOP_KEY,
  } = require("../src/storage/shop-repository.ts"),
  {
    RewardsRepository,
    REWARDS_KEY,
  } = require("../src/storage/rewards-repository.ts");
const { initializePlayer } = require("../src/growth/domain.ts"),
  { PLAYER_KEY } = require("../src/storage/player-repository.ts");
const { en } = require("../src/localization/locales/en.ts"),
  { ja } = require("../src/localization/locales/ja.ts");
function earnings(days = 12) {
  let rewards = R.emptyRewards();
  for (let i = 0; i < days; i++) {
    const at = new Date(Date.UTC(2026, 8, 1 + i, 12)).toISOString(),
      localDay = at.slice(0, 10);
    rewards = R.applyReward(rewards, {
      sessionId: `s-${i}`,
      playerId: "p",
      completedAt: at,
      localDay,
      weekId: R.weekId(localDay),
      offsetMinutes: 0,
    });
  }
  return rewards;
}
function fixture(days = 12) {
  const player = initializePlayer("p", "2026-08-01T00:00:00.000Z", null, {
    version: 1,
    active: null,
    completed: [],
  });
  const map = new Map([
      [PLAYER_KEY, JSON.stringify({ version: 1, player })],
      [REWARDS_KEY, JSON.stringify(earnings(days))],
    ]),
    writes = [];
  const f = {
    map,
    writes,
    fail: false,
    ack: false,
    drop: false,
    readFail: false,
    at: "2027-01-01T12:00:00.000Z",
  };
  f.adapter = {
    read: async (k) => {
      if (f.readFail) throw Error("read");
      return map.get(k) ?? null;
    },
    write: async (k, v) => {
      assert.ok([SHOP_KEY, REWARDS_KEY].includes(k));
      if (f.fail && k === SHOP_KEY) throw Error("write");
      if (!(f.drop && k === SHOP_KEY)) map.set(k, v);
      writes.push(k);
      if (f.ack && k === SHOP_KEY) throw Error("ack");
    },
    remove: async () => assert.fail("remove"),
  };
  f.repo = () => new ShopRepository(f.adapter, () => f.at);
  return f;
}
test("catalog: exact stable IDs, order, prices, categories, rarity and EN/JA metadata", () => {
  assert.equal(C.catalog.length, 10);
  assert.equal(new Set(C.catalog.map((i) => i.id)).size, 10);
  assert.deepEqual(
    C.catalog.map((i) => i.price),
    [40, 90, 180, 35, 85, 175, 100, 260, 30, 150],
  );
  for (const i of C.catalog) {
    assert.ok(C.categories.includes(i.category));
    assert.ok(["bronze", "silver", "gold", "purple"].includes(i.rarity));
    assert.ok(Number.isSafeInteger(i.price) && i.price > 0);
    for (const l of [en, ja]) {
      assert.ok(l[`shop.item.${i.id}.name`]);
      assert.ok(l[`shop.item.${i.id}.description`]);
    }
  }
  assert.equal(C.cosmeticById("unknown"), undefined);
  assert.ok(Object.isFrozen(C.catalog));
});
test("missing store defaults are free and reads/unequip perform zero writes", async () => {
  const f = fixture(),
    r = f.repo(),
    s = await r.load("p");
  assert.equal(s.wallet.available, R.balance(earnings()));
  assert.deepEqual(s.data.equipment, C.defaultEquipment());
  await r.equip("p", "aura", null);
  assert.equal(f.writes.length, 0);
  assert.equal(f.map.has(SHOP_KEY), false);
});
test("uninitialized installation can view wallet, cannot buy or create entitlements", async () => {
  const f = fixture();
  f.map.delete(PLAYER_KEY);
  assert.equal(
    (await f.repo().load(null)).wallet.available,
    R.balance(earnings()),
  );
  await assert.rejects(f.repo().purchase("p", "bg-midnight"));
  assert.equal(f.map.has(SHOP_KEY), false);
});
for (const item of C.catalog)
  test(`purchase ${item.id}: debit and ownership are a single durable record`, async () => {
    const f = fixture(60),
      before = f.map.get(REWARDS_KEY),
      next = await f.repo().purchase("p", item.id),
      p = next.data.purchases[0];
    assert.equal(p.id, D.purchaseId("p", item.id));
    assert.equal(p.price, item.price);
    assert.equal(next.wallet.available, next.wallet.earned - item.price);
    assert.equal(f.map.get(REWARDS_KEY), before);
    assert.equal(f.writes.length, 1);
    const reloaded = await f.repo().load("p");
    assert.deepEqual(reloaded, next);
    assert.equal(reloaded.data.ownerId, "p");
  });
test("insufficient Coins never creates a purchase/debit", async () => {
  const f = fixture(1),
    before = new Map(f.map);
  await assert.rejects(
    f.repo().purchase("p", "bg-midnight"),
    (e) => e.code === "insufficient",
  );
  assert.deepEqual(f.map, before);
});
test("duplicate and concurrent BUY across repository remounts charge once", async () => {
  const f = fixture();
  const values = await Promise.all(
    Array.from({ length: 8 }, () => f.repo().purchase("p", "bg-midnight")),
  );
  assert.ok(values.every((v) => v.data.purchases.length === 1));
  assert.equal(f.writes.length, 1);
});
test("two competing items cannot overspend limited balance", async () => {
  const f = fixture(4);
  const results = await Promise.allSettled([
    f.repo().purchase("p", "bg-midnight"),
    f.repo().purchase("p", "border-steel"),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const saved = await f.repo().load("p");
  assert.equal(saved.data.purchases.length, 1);
  assert.ok(saved.wallet.available >= 0);
});
for (const mode of ["fail", "drop"])
  test(`${mode} write does not publish owned or lower balance`, async () => {
    const f = fixture(),
      before = new Map(f.map);
    f[mode] = true;
    await assert.rejects(f.repo().purchase("p", "bg-midnight"));
    assert.deepEqual(f.map, before);
    assert.equal((await f.repo().load("p")).data.purchases.length, 0);
  });
test("lost write acknowledgment rereads durable ownership and never charges twice", async () => {
  const f = fixture();
  f.ack = true;
  const a = await f.repo().purchase("p", "bg-midnight"),
    b = await f.repo().purchase("p", "bg-midnight");
  assert.deepEqual(a, b);
  assert.equal(f.writes.length, 1);
});
test("post-commit read failure recovers by reload without another charge", async () => {
  const f = fixture(),
    write = f.adapter.write;
  f.adapter.write = async (k, v) => {
    await write(k, v);
    f.readFail = true;
  };
  await assert.rejects(f.repo().purchase("p", "bg-midnight"));
  f.readFail = false;
  assert.equal((await f.repo().load("p")).data.purchases.length, 1);
  await f.repo().purchase("p", "bg-midnight");
  assert.equal(f.writes.length, 1);
});
test("all equipment categories equip, replace and restore defaults without spending", async () => {
  const f = fixture(100),
    r = f.repo();
  for (const i of C.catalog) await r.purchase("p", i.id);
  const spent = (await r.load("p")).wallet.spent;
  for (const i of C.catalog) {
    const saved = await r.equip("p", i.category, i.id);
    assert.equal(saved.data.equipment[i.category], i.id);
    assert.equal(saved.wallet.spent, spent);
  }
  for (const category of C.categories) await r.equip("p", category, null);
  assert.deepEqual(
    (await f.repo().load("p")).data.equipment,
    C.defaultEquipment(),
  );
  assert.equal((await r.load("p")).wallet.spent, spent);
});
test("reject unowned, wrong-category and unknown equipment", async () => {
  const f = fixture(),
    r = f.repo();
  await assert.rejects(
    r.equip("p", "title", "title-rookie"),
    (e) => e.code === "unowned",
  );
  await r.purchase("p", "bg-midnight");
  for (const [category, id] of [
    ["title", "bg-midnight"],
    ["background", "unknown"],
    ["badge", null],
  ])
    await assert.rejects(r.equip("p", category, id));
});
test("equipment write failure preserves previous durable equipment", async () => {
  const f = fixture(),
    r = f.repo();
  await r.purchase("p", "bg-midnight");
  const before = f.map.get(SHOP_KEY);
  f.fail = true;
  await assert.rejects(r.equip("p", "background", "bg-midnight"));
  assert.equal(f.map.get(SHOP_KEY), before);
});
test("equipment lost acknowledgment recovers durable equipped item", async () => {
  const f = fixture();
  await f.repo().purchase("p", "bg-midnight");
  f.ack = true;
  assert.equal(
    (await f.repo().equip("p", "background", "bg-midnight")).data.equipment
      .background,
    "bg-midnight",
  );
});
test("foreign owner publication/actions fail closed", async () => {
  const f = fixture();
  await f.repo().purchase("p", "bg-midnight");
  const before = f.map.get(SHOP_KEY);
  await assert.rejects(f.repo().load("other"));
  await assert.rejects(f.repo().purchase("other", "border-steel"));
  await assert.rejects(f.repo().equip("other", "background", "bg-midnight"));
  const p = JSON.parse(f.map.get(PLAYER_KEY));
  p.player.id = "other";
  f.map.set(PLAYER_KEY, JSON.stringify(p));
  await assert.rejects(f.repo().load("other"));
  assert.equal(f.map.get(SHOP_KEY), before);
});
for (const raw of [
  "{bad",
  JSON.stringify({ version: 2 }),
  JSON.stringify({
    version: 1,
    catalogVersion: 1,
    ownerId: "p",
    purchases: [],
    equipment: C.defaultEquipment(),
  }),
])
  test(`corrupt/newer store preserved ${raw.slice(0, 30)}`, async () => {
    const f = fixture();
    f.map.set(SHOP_KEY, raw);
    await assert.rejects(f.repo().load("p"));
    await assert.rejects(f.repo().purchase("p", "bg-midnight"));
    assert.equal(f.map.get(SHOP_KEY), raw);
  });
for (const change of [
  (d) => d.purchases.push({ ...d.purchases[0] }),
  (d) => (d.purchases[0].price = 0),
  (d) => (d.purchases[0].price = 41),
  (d) => (d.purchases[0].itemId = "unknown"),
  (d) => (d.purchases[0].id = "other"),
  (d) => (d.equipment.title = "bg-midnight"),
  (d) => (d.equipment.aura = "aura-blue"),
  (d) => (d.equipment.unknown = null),
])
  test("malformed/duplicated/inconsistent entitlement rejected", async () => {
    const f = fixture();
    await f.repo().purchase("p", "bg-midnight");
    const doc = JSON.parse(f.map.get(SHOP_KEY));
    change(doc);
    const raw = JSON.stringify(doc);
    f.map.set(SHOP_KEY, raw);
    await assert.rejects(f.repo().load("p"));
    assert.equal(f.map.get(SHOP_KEY), raw);
  });
test("missing or changed funding evidence cannot become a free entitlement", async () => {
  const f = fixture();
  await f.repo().purchase("p", "bg-midnight");
  f.map.set(REWARDS_KEY, JSON.stringify(earnings(0)));
  await assert.rejects(f.repo().load("p"));
});
test("funding references reject duplicated/unknown IDs and insufficient historical funding", async () => {
  for (const ids of [["bad"], ["bad", "bad"], []]) {
    const f = fixture();
    await f.repo().purchase("p", "bg-midnight");
    const d = JSON.parse(f.map.get(SHOP_KEY));
    d.purchases[0].fundingIds = ids;
    f.map.set(SHOP_KEY, JSON.stringify(d));
    await assert.rejects(f.repo().load("p"));
  }
});
test("new earnings and purchase use the same queue without lost credits", async () => {
  const f = fixture(1),
    rewardRepo = new RewardsRepository(f.adapter, () => f.at);
  const intent = {
    sessionId: "new-day",
    playerId: "p",
    completedAt: "2026-12-01T12:00:00.000Z",
    localDay: "2026-12-01",
    weekId: "2026-11-30",
    offsetMinutes: 0,
  };
  await Promise.allSettled([
    rewardRepo.award(intent),
    f.repo().purchase("p", "title-rookie"),
  ]);
  const saved = await f.repo().load("p");
  assert.equal(saved.wallet.earned, 20);
  assert.equal(saved.data.purchases.length, 0);
});
test("Rewards v1/v2 stay immutable, unsupported Rewards blocks purchase", async () => {
  for (const version of [1, 2]) {
    const f = fixture(),
      d = earnings();
    d.version = version;
    const raw = JSON.stringify(d);
    f.map.set(REWARDS_KEY, raw);
    await f.repo().purchase("p", "bg-midnight");
    assert.equal(f.map.get(REWARDS_KEY), raw);
  }
  const f = fixture();
  f.map.set(REWARDS_KEY, '{"version":3}');
  await assert.rejects(f.repo().purchase("p", "bg-midnight"));
  assert.equal(f.map.has(SHOP_KEY), false);
});
test("unsafe wallet and invalid clock rejected", async () => {
  assert.throws(() =>
    D.wallet(
      { transactions: [{ id: "x", amount: Number.MAX_SAFE_INTEGER + 1 }] },
      D.emptyShop(),
    ),
  );
  const f = fixture();
  f.at = "bad";
  await assert.rejects(f.repo().purchase("p", "bg-midnight"));
});
test("purchasing/equipping preserves every unrelated gameplay key", async () => {
  const f = fixture(60);
  for (const k of [
    "career",
    "sessions",
    "matches",
    "seasons",
    "coach",
    "presentation",
    "training",
  ])
    f.map.set(`ascend.${k}.v1`, k);
  const before = new Map(f.map);
  await f.repo().purchase("p", "bg-nebula");
  await f.repo().equip("p", "background", "bg-nebula");
  for (const [k, v] of before) assert.equal(f.map.get(k), v);
  assert.ok(f.writes.every((k) => k === SHOP_KEY));
});
test("detached snapshots and preview cannot mutate ownership/equipment", async () => {
  const f = fixture(),
    saved = await f.repo().purchase("p", "bg-midnight"),
    raw = f.map.get(SHOP_KEY);
  saved.data.equipment.background = "bg-midnight";
  saved.data.purchases[0].price = 0;
  const appearance = C.cosmeticAppearance({
    ...C.defaultEquipment(),
    background: "bg-nebula",
  });
  assert.equal(appearance.background.id, "bg-nebula");
  assert.equal(f.map.get(SHOP_KEY), raw);
  assert.equal(
    C.cosmeticAppearance({
      ...C.defaultEquipment(),
      background: "title-rookie",
    }).background,
    undefined,
  );
});
test("Match payment and purchase serialize, preserve immutable result and share a v2 wallet", async () => {
  const { beginCareer } = require("../src/career/domain.ts"),
    M = require("../src/matches/domain.ts"),
    E = require("../src/matches/evidence.ts"),
    { MATCHES_KEY } = require("../src/storage/match-repository.ts");
  const f = fixture(2),
    player = JSON.parse(f.map.get(PLAYER_KEY)).player,
    career = beginCareer("p", "tokyo-zenith", player.initializedAt).career;
  const data = M.generateCurrentMatch(
      { version: 1, matches: [] },
      { player, career },
      null,
      "2026-10-06T12:00:00.000Z",
      "UTC",
      () => 0.5,
    ),
    m = data.matches[0];
  m.weekEnd = E.reconstructWeekEnd(
    player,
    { version: 1, active: null, completed: [] },
    m.week,
    3,
    m.week.endExclusiveAt,
  ).snapshot;
  m.result = M.resolveMatch(m, "2026-10-12T12:00:00.000Z");
  const raw = JSON.stringify(M.parseMatches(JSON.stringify(data)));
  f.map.set(MATCHES_KEY, raw);
  const rewards = new RewardsRepository(f.adapter, () => f.at),
    owner = { playerId: "p", careerStartedAt: career.clubHistory[0].joinedAt };
  await Promise.all([
    rewards.reconcileMatches(owner),
    f.repo().purchase("p", "title-rookie"),
  ]);
  const s = await f.repo().load("p");
  assert.equal(s.wallet.earned, 30);
  assert.equal(s.wallet.available, 0);
  assert.equal(s.data.purchases.length, 1);
  assert.equal(f.map.get(MATCHES_KEY), raw);
  await rewards.reconcileMatches(owner);
  assert.equal((await f.repo().load("p")).wallet.available, 0);
  assert.equal(R.parseRewards(f.map.get(REWARDS_KEY)).version, 2);
});
test("corrupt Player and damaged funding source block purchase without writes", async () => {
  const f = fixture(),
    before = f.map.get(REWARDS_KEY);
  f.map.set(PLAYER_KEY, '{"version":99}');
  await assert.rejects(f.repo().purchase("p", "bg-midnight"));
  assert.equal(f.map.has(SHOP_KEY), false);
  assert.equal(f.map.get(REWARDS_KEY), before);
});
test("funding from the future and purchases before initialization fail closed", async () => {
  const f = fixture();
  f.at = "2026-08-02T00:00:00.000Z";
  await assert.rejects(f.repo().purchase("p", "bg-midnight"));
  assert.equal(f.map.has(SHOP_KEY), false);
  f.at = "2026-12-01T12:00:00.000Z";
  await f.repo().purchase("p", "bg-midnight");
  const d = JSON.parse(f.map.get(SHOP_KEY));
  d.purchases[0].at = "2026-07-01T00:00:00.000Z";
  f.map.set(SHOP_KEY, JSON.stringify(d));
  await assert.rejects(f.repo().load("p"));
});
test("unknown purchase IDs never charge", async () => {
  const f = fixture(),
    before = new Map(f.map);
  await assert.rejects(
    f.repo().purchase("p", "not-a-cosmetic"),
    (e) => e.code === "item",
  );
  assert.deepEqual(f.map, before);
});

test("reported 70 Coins wallet buys Midnight once, retains 30 and durable equipment", async () => {
  const f = fixture(4),
    r = f.repo();
  assert.equal((await r.load("p")).wallet.available, 70);
  const rewardsBefore = f.map.get(REWARDS_KEY);
  const bought = await r.purchase("p", "bg-midnight");
  assert.equal(bought.wallet.available, 30);
  assert.equal(bought.data.purchases[0].price, 40);
  await r.equip("p", "background", "bg-midnight");
  await Promise.all([
    f.repo().purchase("p", "bg-midnight"),
    f.repo().purchase("p", "bg-midnight"),
  ]);
  const restored = await f.repo().load("p");
  assert.equal(restored.wallet.available, 30);
  assert.equal(restored.data.purchases.length, 1);
  assert.equal(restored.data.equipment.background, "bg-midnight");
  assert.equal(f.map.get(REWARDS_KEY), rewardsBefore);
});
