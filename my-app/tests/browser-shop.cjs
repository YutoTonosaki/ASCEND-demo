require("./register.cjs");
const { chromium } = require("playwright"),
  assert = require("node:assert/strict");
const R = require("../src/rewards/domain.ts"),
  S = require("../src/shop/domain.ts");
const { initializePlayer } = require("../src/growth/domain.ts");
const sessions = { version: 1, active: null, completed: [] };
const player = {
  version: 1,
  player: initializePlayer(
    "shop-browser",
    "2026-08-01T00:00:00.000Z",
    null,
    sessions,
  ),
};
let rewards = R.emptyRewards();
for (let i = 0; i < 20; i++) {
  const at = new Date(Date.UTC(2026, 8, 1 + i, 12)).toISOString(),
    localDay = at.slice(0, 10);
  rewards = R.applyReward(rewards, {
    sessionId: `earned-${i}`,
    playerId: player.player.id,
    completedAt: at,
    localDay,
    weekId: R.weekId(localDay),
    offsetMinutes: 0,
  });
}
const foreign = S.equip(
  S.buy(
    S.emptyShop(),
    rewards,
    "foreign",
    "bg-midnight",
    "2026-10-21T12:00:00.000Z",
  ),
  "foreign",
  "background",
  "bg-midnight",
);
const earned = R.balance(rewards),
  seed = {
    "ascend.player.v1": JSON.stringify(player),
    "ascend.sessions.v1": JSON.stringify(sessions),
    "ascend.rewards.v1": JSON.stringify(rewards),
  };
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 320, height: 844 },
      reducedMotion: "reduce",
      timezoneId: "UTC",
    });
    page.setDefaultTimeout(45000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript((seed) => {
      if (!localStorage.getItem("qa-shop-seed")) {
        for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v);
        localStorage.setItem("qa-shop-seed", "1");
      }
      window.qaWrites = [];
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        if (k.startsWith("ascend.")) window.qaWrites.push(k);
        return set.call(this, k, v);
      };
    }, seed);
    const url = process.env.ASCEND_QA_URL;
    assert.ok(url);
    const button = (name) => page.getByRole("button", { name, exact: true }),
      tab = (name) => page.getByRole("tab", { name, exact: true }).click();
    const raw = () =>
      page.evaluate(() =>
        Object.fromEntries(
          Object.entries(localStorage).filter(([k]) => k.startsWith("ascend.")),
        ),
      );
    const load = async () => {
      await page.goto(url);
      await page.getByTestId("home-card-tier").waitFor();
      await page.waitForFunction(() =>
        [...document.querySelectorAll('[data-testid="coin-balance"]')].some(
          (n) => /Coins$|Balance unavailable/.test(n.textContent),
        ),
      );
    };
    const wallet = async (coins) => {
      await page.waitForFunction((coins) => {
        const nodes = [
          ...document.querySelectorAll('[data-testid="coin-balance"]'),
        ];
        return (
          nodes.length && nodes.every((n) => n.textContent === `${coins} Coins`)
        );
      }, coins);
    };
    await load();
    await wallet(earned);
    const before = await raw();
    assert.equal(before["ascend.shop.v1"], undefined);
    await tab("SHOP");
    await button("Backgrounds").click();
    assert.equal(await button("VIEW Steel Border").count(), 0);
    await button("VIEW Midnight Background").click();
    await button("BUY").click();
    await button("CANCEL").click();
    await button("CLOSE").click();
    assert.deepEqual(await raw(), before);
    assert.deepEqual(await page.evaluate(() => window.qaWrites), []);
    async function buy(name, price) {
      await button(`VIEW ${name}`).click();
      await button("BUY").click();
      await button("CONFIRM").click();
      await button("EQUIP").waitFor();
      const d = S.parseShop((await raw())["ascend.shop.v1"]);
      assert.equal(d.purchases.at(-1).price, price);
      await button("EQUIP").click();
      await button("UNEQUIP").waitFor();
      await button("CLOSE").click();
    }
    await buy("Midnight Background", 40);
    await wallet(earned - 40);
    await button("Borders").click();
    await buy("Steel Border", 35);
    await button("Auras").click();
    await buy("Blue Aura", 100);
    await button("Titles").click();
    await buy("Rookie", 30);
    await wallet(earned - 205);
    const purchased = await raw();
    assert.equal(S.parseShop(purchased["ascend.shop.v1"]).purchases.length, 4);
    for (const [k, v] of Object.entries(before)) assert.equal(purchased[k], v);
    await tab("PLAYER");
    await page.getByTestId("cosmetic-bg-midnight").waitFor();
    await page.getByTestId("cosmetic-border").waitFor();
    await page.getByTestId("cosmetic-aura").waitFor();
    await page
      .getByTestId("cosmetic-title")
      .getByText("Rookie", { exact: true })
      .waitFor();
    await page.screenshot({
      path: "/tmp/ascend-shop-equipped-320.png",
      fullPage: true,
    });
    assert.equal(
      JSON.parse((await raw())["ascend.player.v1"]).player.ratings.Chest,
      45,
    );
    await load();
    await wallet(earned - 205);
    await tab("SHOP");
    await button("Auras").click();
    await button("VIEW Purple Aura").click();
    assert.ok(await button("BUY").isDisabled());
    await button("CLOSE").click();
    await button("Titles").click();
    await button("VIEW Rookie").click();
    await button("UNEQUIP").click();
    await button("EQUIP").waitFor();
    await button("CLOSE").click();
    await tab("PLAYER");
    assert.equal(await page.getByTestId("cosmetic-title").count(), 0);
    await wallet(earned - 205);
    // Failure, retry and lost acknowledgment operate on the Shop key only.
    await tab("SHOP");
    await button("Borders").click();
    await button("VIEW Chrome Border").click();
    await page.evaluate(() => {
      window.qaSet = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        if (k === "ascend.shop.v1") throw Error("isolated shop failure");
        return window.qaSet.call(this, k, v);
      };
    });
    const failedBefore = await raw();
    await button("BUY").click();
    await button("CONFIRM").click();
    await page
      .getByRole("alert")
      .filter({ hasText: /SHOP storage/ })
      .last()
      .waitFor();
    assert.deepEqual(await raw(), failedBefore);
    await page.evaluate(() => (Storage.prototype.setItem = window.qaSet));
    await button("RETRY").last().click();
    await button("BUY").click();
    await button("CONFIRM").click();
    await button("EQUIP").waitFor();
    await button("CLOSE").click();
    await wallet(0);
    const saved = await raw();
    assert.equal(S.parseShop(saved["ascend.shop.v1"]).purchases.length, 5);
    // The available balance never reverts to earned-only across HOME/SHOP/restart.
    await tab("HOME");
    await wallet(0);
    await load();
    await wallet(0);
    await tab("SHOP");
    assert.deepEqual(await raw(), saved);
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await button("Language").click();
    await button("日本語").click();
    await button("設定を閉じる").click();
    await page
      .getByText("使用可能なトレーニングコイン", { exact: true })
      .first()
      .waitFor();
    assert.deepEqual(
      Object.fromEntries(
        Object.entries(await raw()).filter(([k]) => k !== "ascend.settings.v1"),
      ),
      Object.fromEntries(
        Object.entries(saved).filter(([k]) => k !== "ascend.settings.v1"),
      ),
    );
    await page.getByRole("button", { name: "称号", exact: true }).click();
    await page
      .getByRole("button", { name: "ルーキーを見る", exact: true })
      .click();
    await page.getByText("所持済み", { exact: true }).last().waitFor();
    await button("装備する").click();
    await button("装備を外す").waitFor();
    await page.evaluate(() => {
      const nodes = [...document.querySelectorAll("*")].filter((el) =>
        [...el.childNodes].some(
          (n) => n.nodeType === 3 && n.textContent.trim(),
        ),
      );
      const sizes = nodes.map((el) => ({
        el,
        size: parseFloat(getComputedStyle(el).fontSize),
        line: parseFloat(getComputedStyle(el).lineHeight),
      }));
      for (const { el, size, line } of sizes) {
        el.style.fontSize = `${size * 1.5}px`;
        if (Number.isFinite(line)) el.style.lineHeight = `${line * 1.5}px`;
      }
    });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: "/tmp/ascend-shop-ja-large.png",
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    await button("閉じる").click();
    const durable = await raw();
    assert.equal(durable["ascend.rewards.v1"], before["ascend.rewards.v1"]);
    assert.equal(durable["ascend.player.v1"], before["ascend.player.v1"]);
    await page.close();
    console.log(
      "SHOP passed: browse/filter/preview/cancel zero writes, atomic purchases, four equipped layers, zero available balance, insufficient funds, failure/retry, reload, EN/JA/320/large/reduced motion, gameplay isolation",
    );
    // Lost acknowledgment and unsupported storage, on separate isolated contexts.
    for (const mode of ["ack", "corrupt", "newer", "foreign"]) {
      const p = await browser.newPage({
        viewport: { width: 320, height: 844 },
        reducedMotion: "reduce",
      });
      p.setDefaultTimeout(45000);
      await p.addInitScript(
        ({ seed, mode, foreign }) => {
          for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v);
          if (mode === "foreign")
            localStorage.setItem("ascend.shop.v1", JSON.stringify(foreign));
          if (mode === "corrupt")
            localStorage.setItem("ascend.shop.v1", "{bad");
          if (mode === "newer")
            localStorage.setItem("ascend.shop.v1", '{"version":99}');
        },
        { seed, mode, foreign },
      );
      await p.goto(url);
      await p.getByTestId("home-card-tier").waitFor();
      await p.getByRole("tab", { name: "SHOP", exact: true }).click();
      if (mode === "ack") {
        await p
          .getByRole("button", {
            name: "VIEW Midnight Background",
            exact: true,
          })
          .click();
        await p.getByRole("button", { name: "BUY", exact: true }).waitFor();
        await p.evaluate(() => {
          const set = Storage.prototype.setItem;
          Storage.prototype.setItem = function (k, v) {
            set.call(this, k, v);
            if (k === "ascend.shop.v1") throw Error("ack");
          };
        });
        await p.getByRole("button", { name: "BUY", exact: true }).click();
        await p.getByRole("button", { name: "CONFIRM", exact: true }).click();
        await p.getByRole("button", { name: "EQUIP", exact: true }).waitFor();
        assert.equal(
          await p.evaluate(
            () =>
              JSON.parse(localStorage.getItem("ascend.shop.v1")).purchases
                .length,
          ),
          1,
        );
      } else if (mode === "foreign") {
        await p
          .getByText("Balance unavailable", { exact: true })
          .first()
          .waitFor();
        assert.equal(await p.getByText("EQUIPPED", { exact: true }).count(), 0);
        assert.equal(
          await p.evaluate(() => localStorage.getItem("ascend.shop.v1")),
          JSON.stringify(foreign),
        );
        await p.getByRole("tab", { name: "PLAYER", exact: true }).click();
        await p.getByTestId("cosmetic-default-background").waitFor();
      } else {
        await p
          .getByText("Balance unavailable", { exact: true })
          .first()
          .waitFor();
        assert.equal(
          await p.evaluate(() => localStorage.getItem("ascend.shop.v1")),
          mode === "corrupt" ? "{bad" : '{"version":99}',
        );
      }
      await p.close();
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
