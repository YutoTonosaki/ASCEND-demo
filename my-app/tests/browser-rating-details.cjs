require("./register.cjs");
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { squatPRFixture, workout, data, at } = require("./fixtures/session-progression.cjs");
const { reconcilePlayer } = require("../src/growth/domain.ts");
const { isPlayerData } = require("../src/growth/validation.ts");
const { ratingDetails } = require("../src/growth/rating-details.ts");
const url = process.env.ASCEND_QA_URL || "http://127.0.0.1:8151";
const bytes = page => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort()
  .map(k => [k, localStorage.getItem(k)])));
(async () => {
  const browser = await chromium.launch({ headless: true,
    executablePath: process.env.ASCEND_QA_CHROME });
  try {
    for (const locale of ["en", "ja"]) {
      const f = squatPRFixture();
      const press = workout([["overhead-press", [{ type: "weight_reps", weightKg: 33.33, reps: 5 }]]], 50).completed;
      const sessions = data(f.previous, press);
      const player = { version: 1, player: reconcilePlayer(f.before, sessions, at(60)) };
      assert.ok(isPlayerData(player));
      const expected = ratingDetails(player.player);
      assert.equal(expected.regions.find(r => r.area === "Shoulders").formatted, "51.99");
      const context = await browser.newContext({ viewport: { width: 320, height: 844 }, reducedMotion: "reduce" });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", e => errors.push(e.message));
      await page.goto(url);
      await page.evaluate(({ sessions, player, locale }) => {
        localStorage.setItem("ascend.sessions.v1", JSON.stringify(sessions));
        localStorage.setItem("ascend.player.v1", JSON.stringify(player));
        localStorage.setItem("ascend.settings.v1", JSON.stringify({ version: 1, settings: { locale } }));
      }, { sessions, player, locale });
      await page.addInitScript(() => {
        window.__ratingWrites = [];
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
          window.__ratingWrites.push(key); return original.call(this, key, value);
        };
      });
      await page.goto(url);
      await page.getByRole("tab", { name: locale === "ja" ? "プレイヤー" : "PLAYER", exact: true }).click();
      const show = locale === "ja" ? "小数の詳細を見る" : "VIEW FRACTIONAL DETAILS";
      const hide = locale === "ja" ? "小数の詳細を閉じる" : "HIDE FRACTIONAL DETAILS";
      const button = page.getByRole("button", { name: show, exact: true });
      await button.waitFor();
      assert.equal(await button.getAttribute("aria-expanded"), "false");
      const card = await page.locator('[data-testid="player-card"]:visible').innerText();
      const saved = await bytes(page);
      const integers = {};
      for (const area of Object.keys(player.player.ratings)) {
        integers[area] = await page.getByTestId(`rating-${area}`).innerText();
      }
      await page.evaluate(() => { window.__ratingWrites = []; });
      await button.click();
      const close = page.getByRole("button", { name: hide, exact: true });
      assert.equal(await close.getAttribute("aria-expanded"), "true");
      const details = page.getByTestId("player-rating-details");
      for (const region of expected.regions) {
        await details.getByText(new RegExp(region.formatted.replace(".", "\\."))).first().waitFor();
      }
      await details.getByText(locale === "ja" ? /暫定の能力値を3部位/ : /Includes 3 provisional ratings/).waitFor();
      await details.getByText((locale === "ja" ? "6部位の平均 · " : "Six-region mean · ") + expected.meanFormatted, { exact: true }).waitFor();
      await details.getByText((locale === "ja" ? "次のOVR · " : "Next OVR · ") + expected.nextOVR, { exact: true }).waitFor();
      await details.getByText((locale === "ja" ? "必要な平均の上昇 · あと約" : "Mean increase required · approximately ") + expected.remainingFormatted, { exact: true }).waitFor();
      await page.evaluate(() => {
        const nodes = [...document.querySelectorAll('[data-testid="player-rating-details"] *, [aria-expanded] *')]
          .map(node => ({ node, font: parseFloat(getComputedStyle(node).fontSize), line: parseFloat(getComputedStyle(node).lineHeight) }));
        for (const { node, font, line } of nodes) {
          node.style.fontSize = font * 1.5 + "px";
          if (Number.isFinite(line)) node.style.lineHeight = line * 1.5 + "px";
        }
      });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await details.screenshot({ path: `/tmp/ascend-rating-details-${locale}-320.png` });
      await close.click();
      assert.equal(await details.count(), 0);
      assert.equal(await page.getByRole("button", { name: show }).getAttribute("aria-expanded"), "false");
      assert.equal(await page.locator('[data-testid="player-card"]:visible').innerText(), card);
      for (const area of Object.keys(integers)) assert.equal(await page.getByTestId(`rating-${area}`).innerText(), integers[area]);
      assert.deepEqual(await bytes(page), saved);
      assert.deepEqual(await page.evaluate(() => window.__ratingWrites), []);
      await page.goto(url);
      await page.getByRole("tab", { name: locale === "ja" ? "プレイヤー" : "PLAYER", exact: true }).click();
      await page.getByRole("button", { name: show }).click();
      await page.getByTestId("player-rating-details").waitFor();
      assert.deepEqual(await bytes(page), saved);
      assert.deepEqual(errors, []);
      console.log(`PASS ${locale}: six decimals/51.99/mean/next/provisional/expanded accessibility/zero writes/unchanged integers and Card/320px/large text/reload`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
