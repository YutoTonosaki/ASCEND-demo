require("./register.cjs");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { squatPRFixture, data, at } = require("./fixtures/session-progression.cjs");
const { sessionProgression } = require("../src/growth/session-progression.ts");
const { isPlayerData } = require("../src/growth/validation.ts");
const { isSessionData } = require("../src/sessions/domain.ts");
const url = process.env.ASCEND_QA_URL || "http://127.0.0.1:8150";
const snapshot = page => page.evaluate(() => Object.fromEntries(
  Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])));

(async () => {
  const browser = await chromium.launch({ headless: true,
    ...(process.env.ASCEND_QA_CHROME ? { executablePath: process.env.ASCEND_QA_CHROME } : {}) });
  const errors = [];
  try {
    for (const locale of ["en", "ja"]) {
      // A new, nonpersistent browser context cannot access the developer's browser profile.
      const context = await browser.newContext({
        viewport: { width: locale === "ja" ? 320 : 390, height: 844 }, reducedMotion: "reduce",
      });
      const page = await context.newPage();
      page.on("pageerror", error => errors.push(error.message));
      // Freeze only this isolated browser's Date. Real timers keep running.
      await page.clock.setFixedTime(new Date(at(40)));
      const f = squatPRFixture();
      const sessions = { ...data(f.previous), active: f.active };
      const player = { version: 1, player: f.before };
      assert.ok(isSessionData(sessions));
      assert.ok(isPlayerData(player));
      await page.goto(url);
      await page.evaluate(({ sessions, player, locale }) => {
        localStorage.setItem("ascend.sessions.v1", JSON.stringify(sessions));
        localStorage.setItem("ascend.player.v1", JSON.stringify(player));
        localStorage.setItem("ascend.settings.v1", JSON.stringify({ version: 1, settings: { locale } }));
      }, { sessions, player, locale });
      await page.addInitScript(() => {
        window.__squatWrites = [];
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
          window.__squatWrites.push(key);
          return original.call(this, key, value);
        };
      });
      await page.goto(url);
      const click = name => page.getByRole("button", { name, exact: true }).click();
      const train = () => page.getByRole("tab", {
        name: locale === "ja" ? "トレーニング" : "TRAIN", exact: true,
      }).click();
      await train();
      await click(locale === "ja" ? "ワークアウト再開" : "RESUME WORKOUT");
      await page.getByRole("textbox", {
        name: locale === "ja" ? "実績の回数" : "Actual reps", exact: true,
      }).fill("35");
      await click(locale === "ja" ? "セット完了" : "COMPLETE SET");
      const panel = page.locator('[data-testid="session-progression"]:visible');
      const expected = locale === "ja"
        ? ["PR更新 · 1セット", "体幹の成長 +0.03", "脚の成長 +0.10"]
        : ["Sets with PR improvements · 1", "Core Growth +0.03", "Legs Growth +0.10"];
      for (const text of expected) await panel.getByText(text, { exact: true }).waitFor();
      await panel.getByText("OVR 46 → 46", { exact: true }).waitFor();
      await panel.getByText(locale === "ja" ? /成長は反映済み/ : /Growth is saved/).waitFor();
      await click(locale === "ja" ? "PR更新の詳細を見る" : "VIEW PR DETAILS");
      const prLabel = locale === "ja" ? "回数 30 → 35" : "Reps 30 → 35";
      await panel.getByText(prLabel, { exact: true }).waitFor();
      await panel.getByText(locale === "ja" ? "自重スクワット · セット1" : "Bodyweight Squat · Set 1", { exact: true }).waitFor();
      await page.waitForFunction(id => {
        const saved = JSON.parse(localStorage.getItem("ascend.rewards.v1") || "null");
        return saved?.receipts.some(receipt => receipt.sessionId === id);
      }, f.active.id);
      const saved = await snapshot(page);
      const result = sessionProgression(f.active.id, JSON.parse(saved["ascend.sessions.v1"]),
        JSON.parse(saved["ascend.player.v1"]));
      assert.equal(result.records.sets.length, 1);
      assert.equal(result.records.sets[0].metrics[0].previous, 30);
      assert.equal(result.records.sets[0].metrics[0].value, 35);
      assert.deepEqual(result.growth.map(c => c.area), ["Core", "Legs"]);
      assert.ok(Math.abs(result.growth[0].delta - 0.0273728813559322) < 1e-12);
      assert.ok(Math.abs(result.growth[1].delta - 0.1019774011299435) < 1e-12);
      assert.equal(result.assessments.length, 0);
      assert.equal(result.explainUnchangedOVR, true);
      const originalText = await panel.innerText();
      await panel.screenshot({ path: `/tmp/ascend-squat-pr-${locale}.png` });
      await click(locale === "ja" ? "終了" : "FINISH");
      await page.evaluate(() => { window.__squatWrites = []; });
      await click(locale === "ja" ? "ワークアウト履歴" : "WORKOUT HISTORY");
      await click((locale === "ja" ? "記録を見る · " : "VIEW SESSION · ") + f.plan.name);
      await click(locale === "ja" ? "PR更新の詳細を見る" : "VIEW PR DETAILS");
      assert.equal(await panel.innerText(), originalText);
      assert.deepEqual(await snapshot(page), saved);
      assert.deepEqual(await page.evaluate(() => window.__squatWrites), []);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.goto(url);
      await train();
      await click(locale === "ja" ? "ワークアウト履歴" : "WORKOUT HISTORY");
      await click((locale === "ja" ? "記録を見る · " : "VIEW SESSION · ") + f.plan.name);
      for (const text of expected) await panel.getByText(text, { exact: true }).waitFor();
      assert.deepEqual(await snapshot(page), saved);
      assert.deepEqual(await page.evaluate(() => window.__squatWrites), []);
      console.log("SQUAT_UI_PASS", JSON.stringify({ locale, growth: result.growth,
        ovr: result.ovr, improvedSets: 1, historyIdentical: true, historyWrites: 0 }));
      await context.close();
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
