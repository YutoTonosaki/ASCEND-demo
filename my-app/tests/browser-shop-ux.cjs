// Isolated browser touch QA; not physical iPhone verification.
const { seed } = require("./shop-ux-fixture.cjs");
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { parseShop } = require("../src/shop/domain.ts");
(async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [320, 390]) {
      const context = await browser.newContext({
        viewport: { width, height: 844 },
        isMobile: true,
        hasTouch: true,
        reducedMotion: "reduce",
        timezoneId: "UTC",
      });
      const page = await context.newPage();
      page.setDefaultTimeout(45000);
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.addInitScript((data) => {
        if (!localStorage.getItem("qa-ux")) {
          for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v);
          localStorage.setItem("qa-ux", "yes");
        }
        window.uxWrites = [];
        window.uxFail = false;
        const set = Storage.prototype.setItem;
        Storage.prototype.setItem = function (k, v) {
          if (k.startsWith("ascend.")) window.uxWrites.push(k);
          if (k === "ascend.shop.v1" && window.uxFail)
            throw new Error("Isolated write failure");
          return set.call(this, k, v);
        };
      }, seed());
      const button = (name) => page.getByRole("button", { name, exact: true });
      const raw = () =>
        page.evaluate(() =>
          Object.fromEntries(
            Object.entries(localStorage).filter(([k]) =>
              k.startsWith("ascend."),
            ),
          ),
        );
      const tab = (name) => page.getByRole("tab", { name, exact: true }).tap();
      const touch = async (locator) => {
        const b = await locator.boundingBox();
        assert.ok(
          b && b.height >= 44 && b.y >= 0 && b.y + b.height <= 844,
          JSON.stringify(b),
        );
        assert.equal(
          await locator.evaluate((el) => {
            const r = el.getBoundingClientRect(),
              top = document.elementFromPoint(
                r.x + r.width / 2,
                r.y + r.height / 2,
              );
            return el === top || el.contains(top);
          }),
          true,
        );
        await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
      };
      await page.goto(process.env.ASCEND_QA_URL);
      await page
        .getByTestId("coin-balance")
        .filter({ hasText: "70 Coins" })
        .first()
        .waitFor();
      await tab("SHOP");
      await page.getByTestId("shop-grid-2").waitFor();
      const before = await raw();
      assert.equal(await page.getByTestId("player-card").count(), 0);
      await page
        .getByTestId("shop-tile-bg-midnight")
        .getByText("40 Coins", { exact: true })
        .waitFor();
      await page
        .getByTestId("shop-tile-bg-midnight")
        .getByText("Bronze", { exact: true })
        .waitFor();
      assert.equal(await button("BUY Midnight Background").isEnabled(), true);
      assert.equal(await button("BUY Stadium Background").isDisabled(), true);
      await page
        .getByTestId("shop-tile-bg-stadium")
        .getByText("INSUFFICIENT COINS", { exact: true })
        .waitFor();
      const first = await page
          .getByTestId("shop-tile-bg-midnight")
          .boundingBox(),
        second = await page.getByTestId("shop-tile-bg-stadium").boundingBox();
      assert.ok(Math.abs(first.y - second.y) < 1 && second.x > first.x);
      assert.ok(
        first.y + first.height < 780,
        "First row visible without scrolling",
      );
      await button("Backgrounds").tap();
      await touch(button("BUY Midnight Background"));
      await page.getByTestId("shop-purchase-confirmation").waitFor();
      assert.match(
        await page.getByTestId("shop-purchase-confirmation").innerText(),
        /30 Coins/,
      );
      assert.equal(await page.locator("[aria-modal=true]").count(), 1);
      await touch(button("CANCEL"));
      assert.deepEqual(await raw(), before);
      assert.deepEqual(await page.evaluate(() => window.uxWrites), []);
      await touch(button("BUY Midnight Background"));
      await touch(button("CONFIRM"));
      await button("EQUIP Midnight Background").waitFor();
      assert.equal(
        await button("Backgrounds").getAttribute("aria-selected"),
        "true",
      );
      assert.equal(
        parseShop((await raw())["ascend.shop.v1"]).purchases.length,
        1,
      );
      await page
        .getByTestId("coin-balance")
        .filter({ hasText: "30 Coins" })
        .last()
        .waitFor();
      await touch(button("EQUIP Midnight Background"));
      await button("UNEQUIP Midnight Background").waitFor();
      const owned = await raw();
      assert.equal(
        parseShop(owned["ascend.shop.v1"]).equipment.background,
        "bg-midnight",
      );
      await tab("PLAYER");
      await page.getByTestId("cosmetic-bg-midnight").waitFor();
      await tab("SHOP");
      await touch(button("UNEQUIP Midnight Background"));
      await button("EQUIP Midnight Background").waitFor();
      assert.equal(
        parseShop((await raw())["ascend.shop.v1"]).equipment.background,
        null,
      );
      assert.equal(
        parseShop((await raw())["ascend.shop.v1"]).purchases.length,
        1,
      );
      await button("Titles").tap();
      await page.getByTestId("shop-tile-title-rising-star").waitFor();
      assert.equal(await page.getByTestId("shop-tile-bg-midnight").count(), 0);
      await button("All").tap();
      const beforePreview = await raw();
      await button("VIEW Midnight Background").tap();
      await button("PREVIEW ON MY CARD").tap();
      await page
        .locator('[aria-modal="true"]')
        .getByTestId("player-card")
        .waitFor();
      assert.deepEqual(
        await raw(),
        beforePreview,
        "Opening the real card preview writes nothing",
      );
      await touch(button("EQUIP"));
      await button("UNEQUIP").waitFor();
      await button("CLOSE").tap();
      // Scroll, open and close details; preserve a reasonable position and pinned controls.
      const scroll = page.getByTestId("shop-grid-2");
      await scroll.evaluate((el) => {
        el.scrollTop = 250;
      });
      await page.waitForTimeout(200);
      const position = await scroll.evaluate((el) => el.scrollTop);
      const view = page
        .getByRole("button", { name: /^VIEW / })
        .filter({ visible: true });
      const candidates = await view.all();
      let target;
      for (const v of candidates) {
        const r = await v.boundingBox();
        if (r && r.y > 250 && r.y + r.height < 720) {
          target = v;
          break;
        }
      }
      if (target) {
        await target.tap();
        await button("CLOSE").tap();
        assert.ok(
          Math.abs((await scroll.evaluate((el) => el.scrollTop)) - position) <
            3,
          "Details preserve offset",
        );
      }
      await scroll.evaluate((el) => {
        el.scrollTop = 0;
      });
      // Equip errors must not publish success; reload allows safe retry.
      await page.evaluate(() => {
        window.uxFail = true;
      });
      const saved = await raw();
      await button("UNEQUIP Midnight Background").tap();
      await page
        .getByText(/SHOP storage or wallet is unavailable/)
        .first()
        .waitFor();
      assert.deepEqual(await raw(), saved);
      await page.evaluate(() => {
        window.uxFail = false;
      });
      await button("RETRY").tap();
      await button("UNEQUIP Midnight Background").waitFor();
      await page.setViewportSize({ width: 280, height: 844 });
      await page.getByTestId("shop-grid-1").waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      await page.setViewportSize({ width, height: 844 });
      await page.getByTestId("shop-grid-2").waitFor();
      const final = await raw();
      for (const [k, v] of Object.entries(before)) assert.equal(final[k], v);
      await page.goto(process.env.ASCEND_QA_URL);
      await page
        .getByTestId("coin-balance")
        .filter({ hasText: "30 Coins" })
        .first()
        .waitFor();
      await tab("SHOP");
      await button("UNEQUIP Midnight Background").waitFor();
      assert.deepEqual(await raw(), final);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      assert.deepEqual(errors, []);
      console.log(`shop-ux ${width} passed`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
