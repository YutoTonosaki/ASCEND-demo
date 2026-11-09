// External Playwright tooling and isolated localStorage only.
require("./register.cjs");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { fixture, data, at, workout } = require("./fixtures/session-progression.cjs");
const { initializePlayer, reconcilePlayer } = require("../src/growth/domain.ts");
const { isPlayerData } = require("../src/growth/validation.ts");
const { sessionProgression, formatGrowthDelta } = require("../src/growth/session-progression.ts");
const url = process.env.ASCEND_QA_URL || "http://127.0.0.1:8150";
const chrome = process.env.ASCEND_QA_CHROME;
const allBytes = page => page.evaluate(() => Object.fromEntries(
  Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])));

(async () => {
  const browser = await chromium.launch({ headless: true, ...(chrome ? { executablePath: chrome } : {}) });
  const errors = [];
  try {
    async function open(sessions, player, locale = "en", failGrowth = false) {
      assert.ok(isPlayerData({ version: 1, player }));
      const context = await browser.newContext({ viewport: { width: 320, height: 844 }, reducedMotion: "reduce" });
      const page = await context.newPage();
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(url);
      await page.evaluate(({ sessions, player, locale }) => {
        localStorage.clear();
        localStorage.setItem("ascend.sessions.v1", JSON.stringify(sessions));
        localStorage.setItem("ascend.player.v1", JSON.stringify({ version: 1, player }));
        localStorage.setItem("ascend.settings.v1", JSON.stringify({ version: 1, settings: { locale } }));
      }, { sessions, player, locale });
      await page.addInitScript(({ failGrowth }) => {
        window.__progressionWrites = [];
        const write = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
          window.__progressionWrites.push(key);
          if (failGrowth && key === "ascend.player.v1") throw Error("Isolated Player write failure");
          return write.call(this, key, value);
        };
      }, { failGrowth });
      await page.goto(url);
      const click = name => page.getByRole("button", { name, exact: true }).click();
      await page.getByRole("tab", { name: locale === "ja" ? "トレーニング" : "TRAIN", exact: true }).click();
      return { context, page, click, locale };
    }
    async function history(t, name) {
      await t.click(t.locale === "ja" ? "ワークアウト履歴" : "WORKOUT HISTORY");
      await t.page.getByRole("button", {
        name: (t.locale === "ja" ? "記録を見る · " : "VIEW SESSION · ") + name, exact: true,
      }).last().click();
      return t.page.locator('[data-testid="session-progression"]:visible');
    }
    const f = fixture();
    // Real final confirmations exercise the production save/reconciliation flow.
    const live = await open({ ...data(f.first), active: f.target.active }, f.before);
    await live.click("RESUME WORKOUT");
    for (const reps of [12, 13, 12]) {
      await live.page.getByRole("textbox", { name: "Actual reps", exact: true }).fill(String(reps));
      await live.click("COMPLETE SET");
      await live.page.waitForTimeout(700);
    }
    const panel = live.page.locator('[data-testid="session-progression"]:visible');
    await panel.getByText("Sets with PR improvements · 3", { exact: true }).waitFor();
    await panel.getByText(/Growth is saved/).waitFor();
    const persisted = await allBytes(live.page);
    const storedPlayer = JSON.parse(persisted["ascend.player.v1"]);
    const storedSessions = JSON.parse(persisted["ascend.sessions.v1"]);
    const expected = sessionProgression(f.target.active.id, storedSessions, storedPlayer);
    for (const change of expected.growth) {
      await panel.getByText(`${change.area} Growth +${formatGrowthDelta(change.delta)}`, { exact: true }).waitFor();
    }
    await live.click("VIEW PR DETAILS");
    await panel.getByText("Reps 10 → 12", { exact: true }).first().waitFor();
    await live.page.evaluate(() => {
      const sizes = [...document.querySelectorAll("div, span, button, input")].map(node => {
        const style = getComputedStyle(node);
        return { node, font: parseFloat(style.fontSize), line: parseFloat(style.lineHeight) };
      });
      for (const { node, font, line } of sizes) {
        node.style.fontSize = font * 1.5 + "px";
        if (Number.isFinite(line)) node.style.lineHeight = line * 1.5 + "px";
      }
    });
    assert.ok(await live.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await panel.screenshot({ path: "/tmp/ascend-session-progression-en-320.png" });
    assert.deepEqual(await allBytes(live.page), persisted);
    await live.context.close();

    const assessedSession = workout([["push-up", [{ type: "reps", reps: 1 }]]], 20).completed;
    const assessedData = data(assessedSession);
    const assessedPlayer = reconcilePlayer(initializePlayer("assessment-player", at(10), null, data()), assessedData, at(30));
    for (const scenario of ["ready", "empty", "uninitialized", "before", "error", "assessment"]) {
      const locale = scenario === "ready" ? "ja" : "en";
      const sessions = scenario === "assessment" ? assessedData : scenario === "empty" ? data(f.first) : f.sessions;
      const player = scenario === "assessment" ? assessedPlayer : scenario === "uninitialized" ? null : scenario === "before"
        ? initializePlayer("later-player", at(100), null, sessions)
        : scenario === "error" || scenario === "empty" ? f.before : f.player;
      const t = await open(sessions, player, locale, scenario === "error");
      await t.page.waitForTimeout(500);
      const before = await allBytes(t.page);
      await t.page.evaluate(() => { window.__progressionWrites = []; });
      const summary = await history(t, "Progression QA");
      const expectedText = {
        ready: "PR更新 · 3セット",
        empty: "No earned Growth increase was recorded for this workout.",
        uninitialized: "Initialize your Player on PLAYER to start tracking growth.",
        before: "This workout predates Player initialization. Growth was not tracked.",
        error: "Progression could not be confirmed. Check the saved Player status on PLAYER.",
        assessment: "Initial assessment · Chest 45.00 → 40.40",
      }[scenario];
      await summary.getByText(expectedText, { exact: true }).waitFor();
      if (scenario === "ready") {
        await summary.getByText(/成長は反映済み/).waitFor();
        await t.click("PR更新の詳細を見る");
        await summary.screenshot({ path: "/tmp/ascend-session-progression-ja-320.png" });
      }
      if (scenario !== "ready") assert.equal(await summary.getByText(/Growth is saved/).count(), 0);
      if (scenario !== "empty" && scenario !== "assessment") assert.equal(await summary.getByText("No earned Growth increase was recorded for this workout.", { exact: true }).count(), 0);
      assert.deepEqual(await allBytes(t.page), before);
      assert.deepEqual(await t.page.evaluate(() => window.__progressionWrites), []);
      assert.ok(await t.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await t.page.goto(url);
      await t.page.getByRole("tab", { name: locale === "ja" ? "トレーニング" : "TRAIN", exact: true }).click();
      await history(t, "Progression QA");
      assert.deepEqual(await allBytes(t.page), before);
      assert.equal(await t.page.getByRole("button", { name: "CONTINUE", exact: true }).count(), 0);
      await t.context.close();
    }
    assert.deepEqual(errors, []);
    console.log("PASS: live fractional progression/PRs; EN/JA; ready/empty/uninitialized/pre-initialization/error/assessment; read-only history/restart; 320px/enlarged text/reduced motion; no page exceptions.");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
