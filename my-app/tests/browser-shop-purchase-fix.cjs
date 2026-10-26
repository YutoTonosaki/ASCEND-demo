// Isolated touch-enabled browser QA; this is not native iPhone execution.
require("./register.cjs");
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const R = require("../src/rewards/domain.ts");
const { initializePlayer } = require("../src/growth/domain.ts");
const { parseShop } = require("../src/shop/domain.ts");
const sessions = { version: 1, active: null, completed: [] };
const player = {
  version: 1,
  player: initializePlayer(
    "purchase-fix",
    "2026-08-01T00:00:00.000Z",
    null,
    sessions,
  ),
};
function seed(days = 4) {
  let rewards = R.emptyRewards();
  for (let i = 0; i < days; i++) {
    const localDay = `2026-09-0${i + 1}`;
    rewards = R.applyReward(rewards, {
      sessionId: `fixture-${i}`,
      playerId: player.player.id,
      completedAt: `${localDay}T12:00:00.000Z`,
      localDay,
      weekId: R.weekId(localDay),
      offsetMinutes: 0,
    });
  }
  return {
    "ascend.player.v1": JSON.stringify(player),
    "ascend.sessions.v1": JSON.stringify(sessions),
    "ascend.rewards.v1": JSON.stringify(rewards),
  };
}
(async () => {
  const browser = await chromium.launch();
  try {
    for (const mode of process.env.ASCEND_QA_BASELINE
      ? ["en"]
      : ["en", "ja-large", "unavailable", "insufficient", "uninitialized"]) {
      const data = seed(mode === "insufficient" ? 1 : 4),
        ja = mode === "ja-large";
      if (ja)
        data["ascend.settings.v1"] = JSON.stringify({
          version: 1,
          settings: { locale: "ja" },
        });
      if (mode === "unavailable") data["ascend.rewards.v1"] = "{damaged";
      if (mode === "uninitialized") delete data["ascend.player.v1"];
      const context = await browser.newContext({
        viewport: { width: 320, height: 568 },
        hasTouch: true,
        isMobile: true,
        timezoneId: "UTC",
        reducedMotion: "reduce",
      });
      const page = await context.newPage(),
        errors = [];
      page.setDefaultTimeout(45000);
      page.on("pageerror", (e) => errors.push(e.message));
      await page.addInitScript((data) => {
        if (!localStorage.getItem("qa-purchase-seeded")) {
          for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v);
          localStorage.setItem("qa-purchase-seeded", "yes");
        }
        window.purchaseWrites = [];
        const set = Storage.prototype.setItem;
        Storage.prototype.setItem = function (k, v) {
          if (k.startsWith("ascend.")) window.purchaseWrites.push(k);
          return set.call(this, k, v);
        };
      }, data);
      const url = process.env.ASCEND_QA_URL,
        button = (name) => page.getByRole("button", { name, exact: true });
      const raw = () =>
        page.evaluate(() =>
          Object.fromEntries(
            Object.entries(localStorage).filter(([k]) =>
              k.startsWith("ascend."),
            ),
          ),
        );
      await page.goto(url);
      await page
        .getByTestId("coin-balance")
        .filter({
          hasText:
            mode === "unavailable"
              ? "Balance unavailable"
              : ja
                ? "70 コイン"
                : mode === "insufficient"
                  ? "10 Coins"
                  : "70 Coins",
        })
        .first()
        .waitFor();
      await page
        .getByRole("tab", { name: ja ? "ショップ" : "SHOP", exact: true })
        .tap();
      const before = await raw();
      await button(
        ja ? "ミッドナイト背景を見る" : "VIEW Midnight Background",
      ).tap();
      const buy = button(ja ? "購入" : "BUY");
      await buy.waitFor();
      if (process.env.ASCEND_QA_BASELINE) {
        const rect = await buy.boundingBox();
        console.log(
          "BASELINE BUY position (without scrolling)",
          rect,
          "viewport",
          page.viewportSize(),
        );
        assert.ok(
          rect.y >= page.viewportSize().height,
          "Old BUY starts below viewport",
        );
        await page.screenshot({ path: "/tmp/ascend-shop-fix-before.png" });
        await context.close();
        continue;
      }
      // Reuse the established modal-only safe-area probe simulation.
      if (mode === "en") {
        await page
          .locator('body > div[style*="safe-area-inset"]')
          .last()
          .evaluate((el) => {
            el.style.setProperty("padding-top", "59px", "important");
            el.style.setProperty("padding-bottom", "34px", "important");
            for (const name of ["transitionend", "webkitTransitionEnd"])
              el.dispatchEvent(new Event(name));
          });
        await page.waitForFunction(() => {
          const buy = [...document.querySelectorAll('[role="button"]')].find(
            (el) => el.getAttribute("aria-label") === "BUY",
          );
          const close = [...document.querySelectorAll('[role="button"]')].find(
            (el) => el.getAttribute("aria-label") === "CLOSE",
          );
          return (
            buy &&
            close &&
            buy.getBoundingClientRect().bottom <= 534 &&
            close.getBoundingClientRect().top >= 59
          );
        });
      }
      async function enlarge() {
        if (!ja) return;
        await page.evaluate(() => {
          const nodes = [...document.querySelectorAll("*")].filter((el) =>
            [...el.childNodes].some(
              (n) => n.nodeType === 3 && n.textContent.trim(),
            ),
          );
          const sizes = nodes
            .filter((el) => !el.dataset.qaEnlarged)
            .map((el) => [
              el,
              parseFloat(getComputedStyle(el).fontSize),
              parseFloat(getComputedStyle(el).lineHeight),
            ]);
          for (const [el, size, line] of sizes) {
            el.dataset.qaEnlarged = "yes";
            el.style.fontSize = `${size * 1.5}px`;
            if (Number.isFinite(line)) el.style.lineHeight = `${line * 1.5}px`;
          }
        });
      }
      await enlarge();
      async function reachable(locator) {
        const b = await locator.boundingBox();
        assert.ok(
          b &&
            b.y >= 0 &&
            b.y + b.height <= 568 - (mode === "en" ? 34 : 0) &&
            b.height >= 44,
          JSON.stringify(b),
        );
        assert.equal(
          await locator.evaluate((el) => {
            const r = el.getBoundingClientRect();
            const top = document.elementFromPoint(
              r.x + r.width / 2,
              r.y + r.height / 2,
            );
            return el === top || el.contains(top);
          }),
          true,
        );
        return b;
      }
      const box = await reachable(buy);
      assert.equal(
        await page
          .locator('[aria-modal="true"]')
          .getByText(ja ? "購入" : "BUY", { exact: true })
          .count(),
        1,
        "Only the actionable BUY, without a misleading plain-text BUY status",
      );
      if (["unavailable", "insufficient", "uninitialized"].includes(mode)) {
        assert.equal(await buy.isDisabled(), true);
        const explanation =
          mode === "unavailable"
            ? /SHOP storage or wallet is unavailable/
            : mode === "insufficient"
              ? /INSUFFICIENT COINS/
              : /Initialize your Player/;
        await page
          .getByTestId("shop-item-actions")
          .getByText(explanation)
          .waitFor();
        assert.deepEqual(await raw(), before);
        assert.deepEqual(await page.evaluate(() => window.purchaseWrites), []);
      } else {
        assert.equal(await buy.isEnabled(), true);
        const moved = await page.getByTestId("player-card").evaluate((card) => {
          let el = card.parentElement;
          while (
            el &&
            !["auto", "scroll"].includes(getComputedStyle(el).overflowY)
          )
            el = el.parentElement;
          if (!el) return false;
          el.scrollTop = el.scrollHeight;
          return el.scrollTop > 0;
        });
        assert.equal(moved, true, "Preview content scrolls independently");
        assert.ok(
          Math.abs((await reachable(buy)).y - box.y) < 1,
          "BUY remains fixed while preview scrolls",
        );
        await page.screenshot({ path: `/tmp/ascend-shop-fix-${mode}.png` });
        // Coordinate touch avoids Playwright scrolling an offscreen button into view for us.
        await page.touchscreen.tap(
          box.x + box.width / 2,
          box.y + box.height / 2,
        );
        await page.getByTestId("shop-purchase-confirmation").waitFor();
        await enlarge();
        assert.ok(
          (
            await page.getByTestId("shop-purchase-confirmation").innerText()
          ).includes(ja ? "40コイン" : "40 Coins"),
        );
        assert.ok(
          (
            await page.getByTestId("shop-purchase-confirmation").innerText()
          ).includes(ja ? "30コイン" : "30 Coins"),
        );
        assert.equal(
          await page.locator('[aria-modal="true"]').count(),
          1,
          "One modal for details and confirmation",
        );
        const cancel = button(ja ? "キャンセル" : "CANCEL");
        await reachable(cancel);
        if (ja)
          await page.screenshot({
            path: "/tmp/ascend-shop-fix-confirm-ja.png",
          });
        await cancel.tap();
        assert.deepEqual(await raw(), before);
        assert.deepEqual(await page.evaluate(() => window.purchaseWrites), []);
        await buy.tap();
        await page.getByTestId("shop-purchase-confirmation").waitFor();
        await enlarge();
        const confirm = button(ja ? "確認" : "CONFIRM");
        // Japanese common.confirm is resolved from the actual translation dictionary.
        const localizedConfirm = ja
          ? button(
              require("../src/localization/locales/ja.ts").ja["common.confirm"],
            )
          : confirm;
        await reachable(localizedConfirm);
        await localizedConfirm.tap();
        const equip = button(ja ? "装備する" : "EQUIP");
        await equip.waitFor();
        await page
          .getByText(ja ? "所持済み" : "OWNED", { exact: true })
          .last()
          .waitFor();
        await reachable(equip);
        const bought = await raw(),
          shop = parseShop(bought["ascend.shop.v1"]);
        assert.equal(shop.purchases.length, 1);
        assert.equal(shop.purchases[0].price, 40);
        for (const [k, v] of Object.entries(before)) assert.equal(bought[k], v);
        assert.equal(
          await buy.count(),
          0,
          "Owned item has EQUIP instead of another BUY",
        );
        await equip.tap();
        await button(ja ? "装備を外す" : "UNEQUIP").waitFor();
        await button(ja ? "閉じる" : "CLOSE").tap();
        await page
          .getByRole("tab", { name: ja ? "プレイヤー" : "PLAYER", exact: true })
          .tap();
        await page.getByTestId("cosmetic-bg-midnight").waitFor();
        const saved = await raw();
        await page.goto(url);
        await page
          .getByTestId("coin-balance")
          .filter({ hasText: ja ? "30 コイン" : "30 Coins" })
          .first()
          .waitFor();
        await page
          .getByRole("tab", { name: ja ? "ショップ" : "SHOP", exact: true })
          .tap();
        await button(
          ja ? "ミッドナイト背景を見る" : "VIEW Midnight Background",
        ).tap();
        await button(ja ? "装備を外す" : "UNEQUIP").waitFor();
        assert.equal(await buy.count(), 0);
        assert.deepEqual(await raw(), saved);
        assert.equal(
          parseShop(saved["ascend.shop.v1"]).equipment.background,
          "bg-midnight",
        );
      }
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      assert.deepEqual(errors, []);
      console.log(`purchase-fix ${mode} passed`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
