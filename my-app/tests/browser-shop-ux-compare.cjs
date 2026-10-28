// Browser-only measurements, same isolated fixture on baseline and candidate.
const { seed } = require("./shop-ux-fixture.cjs");
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const mode = process.env.ASCEND_QA_COMPARE || "after";
(async () => {
  const browser = await chromium.launch();
  const metrics = [];
  try {
    for (const [locale, width, height, scale] of [
      ["en", 390, 844, 1],
      ["en", 320, 568, 1],
      ["ja", 320, 568, 1.5],
    ]) {
      const ja = locale === "ja";
      const context = await browser.newContext({
        viewport: { width, height },
        hasTouch: true,
        isMobile: true,
        timezoneId: "UTC",
        reducedMotion: "reduce",
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
        const set = Storage.prototype.setItem;
        Storage.prototype.setItem = function (k, v) {
          if (k.startsWith("ascend.")) window.uxWrites.push(k);
          return set.call(this, k, v);
        };
      }, seed(locale));
      const button = (name) => page.getByRole("button", { name, exact: true });
      await page.goto(process.env.ASCEND_QA_URL);
      await page
        .getByTestId("coin-balance")
        .filter({ hasText: ja ? "70 コイン" : "70 Coins" })
        .first()
        .waitFor();
      await page
        .getByRole("tab", { name: ja ? "ショップ" : "SHOP", exact: true })
        .tap();
      await button(
        ja ? "ミッドナイト背景を見る" : "VIEW Midnight Background",
      ).waitFor();
      if (scale > 1)
        await page.evaluate((scale) => {
          const apply = () => {
            const nodes = [...document.querySelectorAll("*")].filter(
              (el) =>
                !el.dataset.uxScaled &&
                [...el.childNodes].some(
                  (n) => n.nodeType === 3 && n.textContent.trim(),
                ),
            );
            const sizes = nodes.map((el) => [
              el,
              parseFloat(getComputedStyle(el).fontSize),
              parseFloat(getComputedStyle(el).lineHeight),
            ]);
            for (const [el, size, line] of sizes) {
              el.dataset.uxScaled = "1";
              el.style.fontSize = `${size * scale}px`;
              if (Number.isFinite(line))
                el.style.lineHeight = `${line * scale}px`;
            }
          };
          apply();
          new MutationObserver(apply).observe(document.body, {
            childList: true,
            subtree: true,
          });
        }, scale);
      if (mode === "after")
        await page.getByTestId(`shop-grid-${scale > 1 ? 1 : 2}`).waitFor();
      await page.waitForTimeout(600);
      const measurement = await page.evaluate(
        ({ mode, ja }) => {
          const tab = document.querySelector("[role=tablist]");
          const bottom = tab ? tab.getBoundingClientRect().top : innerHeight;
          const visible = (el) => {
            if (!el) return false;
            const r = el.getBoundingClientRect();
            const top = document.elementFromPoint(
              r.x + r.width / 2,
              r.y + r.height / 2,
            );
            return (
              !!top &&
              (el.contains(top) || top.contains(el)) &&
              r.width > 0 &&
              r.height > 0 &&
              r.top >= 0 &&
              r.bottom <= bottom
            );
          };
          const views = [...document.querySelectorAll("[role=button]")].filter(
            (el) =>
              (el.getAttribute("aria-label") || "").startsWith(
                ja ? "" : "VIEW ",
              ) &&
              (ja
                ? (el.getAttribute("aria-label") || "").endsWith("を見る")
                : true),
          );
          const tiles =
            mode === "after"
              ? [...document.querySelectorAll('[data-testid^="shop-tile-"]')]
              : views.map((el) => el.parentElement);
          const scrolls = [...document.querySelectorAll("*")].filter(
            (el) =>
              ["auto", "scroll"].includes(getComputedStyle(el).overflowY) &&
              el.scrollHeight > el.clientHeight + 20,
          );
          window.uxMainScroll = scrolls.sort(
            (a, b) => b.scrollHeight - a.scrollHeight,
          )[0];
          const wallet = [
            ...document.querySelectorAll("[data-testid=coin-balance]"),
          ].find(visible);
          const filter = [...document.querySelectorAll("[role=button]")].find(
            (el) => el.getAttribute("aria-label") === (ja ? "すべて" : "All"),
          );
          window.uxFilter = filter;
          return {
            fullProducts: tiles.filter(visible).length,
            partialProducts: tiles.filter((el) => {
              const r = el.getBoundingClientRect();
              return r.width > 0 && r.bottom > 0 && r.top < bottom;
            }).length,
            walletVisible: !!wallet,
            filterVisible: visible(filter),
            initialBuyVisible: [
              ...document.querySelectorAll("[role=button]"),
            ].some(
              (el) =>
                (el.getAttribute("aria-label") || "").startsWith(
                  ja ? "ミッドナイト背景を購入" : "BUY Midnight",
                ) && visible(el),
            ),
          };
        },
        { mode, ja },
      );
      const folder =
        process.env.ASCEND_QA_SCREENSHOT_DIR ||
        path.join(require("node:os").tmpdir(), "ascend-shop-ux-comparison");
      fs.mkdirSync(folder, { recursive: true });
      await page.screenshot({
        path: path.join(folder, `${mode}-${locale}-${width}-${scale}.png`),
      });
      const language = require(`../src/localization/locales/${locale}.ts`)[
        locale
      ];
      const lastName = language["shop.details"].replace(
        "{name}",
        language[
          `shop.item.${mode === "before" ? "title-rising-star" : require("../src/shop/catalog.ts").catalog.at(-1).id}.name`
        ],
      );
      for (let i = 0; i < 30; i++) {
        await page.evaluate(() => {
          if (window.uxMainScroll)
            window.uxMainScroll.scrollTop = window.uxMainScroll.scrollHeight;
        });
        await page.waitForTimeout(120);
        if (await button(lastName).count()) {
          const r = await button(lastName)
            .boundingBox({ timeout: 1000 })
            .catch(() => null);
          if (r && r.y >= 0 && r.y + r.height <= height) break;
        }
      }
      const lastBox = await button(lastName).boundingBox();
      assert.ok(
        lastBox && lastBox.y >= 0 && lastBox.y + lastBox.height <= height,
        "Last product reached by list scrolling",
      );
      const end = await page.evaluate(() => {
        const el = window.uxMainScroll;
        const visible = (e) => {
          if (!e) return false;
          const r = e.getBoundingClientRect();
          const top = document.elementFromPoint(
            r.x + r.width / 2,
            r.y + r.height / 2,
          );
          return (
            !!top &&
            (e.contains(top) || top.contains(e)) &&
            r.width > 0 &&
            r.top >= 0 &&
            r.bottom <= innerHeight
          );
        };
        return {
          scrollPixels: el?.scrollTop ?? 0,
          scrollRange: el ? el.scrollHeight - el.clientHeight : 0,
          walletAtEnd: [
            ...document.querySelectorAll("[data-testid=coin-balance]"),
          ].some(visible),
          filterAtEnd: visible(window.uxFilter),
        };
      });
      assert.deepEqual(await page.evaluate(() => window.uxWrites), []);
      await page.evaluate(() => {
        if (window.uxMainScroll) window.uxMainScroll.scrollTop = 0;
      });
      await page.waitForTimeout(150);
      if (mode === "before") {
        await button(
          ja ? "ミッドナイト背景を見る" : "VIEW Midnight Background",
        ).tap();
        await button(ja ? "購入" : "BUY").tap();
      } else
        await button(
          ja ? "ミッドナイト背景を購入" : "BUY Midnight Background",
        ).tap();
      await page.getByTestId("shop-purchase-confirmation").waitFor();
      const dict = require(`../src/localization/locales/${locale}.ts`)[locale];
      await button(dict["common.confirm"]).tap();
      if (mode === "before") {
        await button(dict["shop.equip"]).waitFor();
        await button(dict["common.close"]).tap();
        await button(
          ja ? "ミッドナイト背景を見る" : "VIEW Midnight Background",
        ).tap();
        await button(dict["shop.equip"]).tap();
        await button(dict["shop.unequip"]).waitFor();
      } else {
        await button(
          ja ? "ミッドナイト背景を装備" : "EQUIP Midnight Background",
        ).tap();
        await button(
          ja ? "ミッドナイト背景の装備を外す" : "UNEQUIP Midnight Background",
        ).waitFor();
      }
      assert.deepEqual(errors, []);
      metrics.push({
        locale,
        width,
        height,
        scale,
        ...measurement,
        ...end,
        purchaseTaps: mode === "before" ? 3 : 2,
        equipTaps: mode === "before" ? 2 : 1,
      });
      await context.close();
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(
    `/tmp/shop-ux-${mode}-metrics.json`,
    JSON.stringify(metrics, null, 2),
  );
  console.log(JSON.stringify(metrics, null, 2));
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
