require("./register.cjs");
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { initializePlayer } = require("../src/growth/domain.ts");
const { beginCareer } = require("../src/career/domain.ts");
const M = require("../src/matches/domain.ts");
const E = require("../src/matches/evidence.ts");
const R = require("../src/rewards/domain.ts");
const { matchRewardId } = require("../src/rewards/matches.ts");
const sessions = { version: 1, active: null, completed: [] };
const now = "2026-10-12T12:00:00.000Z";
function fixtures(completed = true) {
  const owner = {
    player: initializePlayer(
      "reward-browser",
      "2026-01-01T00:00:00.000Z",
      null,
      sessions,
    ),
    career: beginCareer(
      "reward-browser",
      "tokyo-zenith",
      "2026-01-01T00:00:00.000Z",
    ).career,
  };
  let matches = M.generateCurrentMatch(
    { version: 1, matches: [] },
    owner,
    null,
    "2026-10-06T12:00:00.000Z",
    "UTC",
    () => 0.5,
  );
  const m = matches.matches[0];
  m.weekEnd = E.reconstructWeekEnd(
    owner.player,
    sessions,
    m.week,
    3,
    m.week.endExclusiveAt,
  ).snapshot;
  if (completed) m.result = M.resolveMatch(m, now); // LOSS pays 10, no PR required.
  matches = M.generateCurrentMatch(matches, owner, null, now, "UTC", () => 0.5);
  const rewards = R.applyReward(R.emptyRewards(), {
    sessionId: "preserved-workout-receipt",
    playerId: null,
    completedAt: "2026-10-05T12:00:00.000Z",
    localDay: "2026-10-05",
    weekId: "2026-10-05",
    offsetMinutes: 0,
  });
  return {
    "ascend.player.v1": JSON.stringify({ version: 1, player: owner.player }),
    "ascend.career.v1": JSON.stringify({ version: 1, career: owner.career }),
    "ascend.sessions.v1": JSON.stringify(sessions),
    "ascend.matches.v1": JSON.stringify(matches),
    "ascend.rewards.v1": JSON.stringify(rewards),
  };
}
(async () => {
  const browser = await chromium.launch();
  try {
    for (const scenario of [
      "startup",
      "failed-write",
      "foreground",
      "lost-ack",
      "corrupt",
      "manual",
    ]) {
      const context = await browser.newContext({
          viewport: { width: 320, height: 844 },
          timezoneId: "UTC",
          reducedMotion: "reduce",
        }),
        page = await context.newPage();
      page.setDefaultTimeout(45000);
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.clock.install({ time: new Date(now) });
      const seeded = fixtures(scenario !== "manual");
      if (scenario === "corrupt")
        seeded["ascend.rewards.v1"] = "broken reward ledger";
      await page.addInitScript(
        ({ values, scenario }) => {
          if (!localStorage.getItem("qa-rewards-seeded")) {
            for (const [key, value] of Object.entries(values))
              localStorage.setItem(key, value);
            localStorage.setItem("qa-rewards-seeded", "1");
          }
          const native = Storage.prototype.setItem;
          window.qaSet = native;
          if (scenario === "failed-write" || scenario === "foreground")
            Storage.prototype.setItem = function (k, v) {
              if (k === "ascend.rewards.v1")
                throw Error("injected reward write");
              return native.call(this, k, v);
            };
          if (scenario === "lost-ack")
            Storage.prototype.setItem = function (k, v) {
              const result = native.call(this, k, v);
              if (k === "ascend.rewards.v1")
                throw Error("injected lost reward acknowledgment");
              return result;
            };
        },
        { values: seeded, scenario },
      );
      const url = process.env.ASCEND_QA_URL;
      assert.ok(url);
      const raw = () =>
        page.evaluate(() =>
          Object.fromEntries(
            Object.entries(localStorage).filter(([key]) =>
              key.startsWith("ascend."),
            ),
          ),
        );
      const go = async () => {
        await page.goto(url);
        await page.getByTestId("home-card-tier").waitFor();
      };
      const balances = async (expected) =>
        page.waitForFunction((expected) => {
          const values = [
            ...document.querySelectorAll('[data-testid="coin-balance"]'),
          ];
          return (
            values.length && values.every((v) => v.textContent === expected)
          );
        }, expected);
      await go();
      if (
        ["failed-write", "foreground", "lost-ack", "corrupt"].includes(scenario)
      ) {
        if (scenario === "lost-ack") {
          await page.waitForFunction(() => {
            try {
              return JSON.parse(
                localStorage.getItem("ascend.rewards.v1"),
              ).transactions.some((t) => t.type === "match-result");
            } catch {
              return false;
            }
          });
        } else await balances("Balance unavailable");
        const failed = await raw();
        assert.equal(failed["ascend.matches.v1"], seeded["ascend.matches.v1"]);
        if (scenario === "lost-ack")
          assert.equal(
            R.balance(R.parseRewards(failed["ascend.rewards.v1"])),
            20,
          );
        else
          assert.equal(
            failed["ascend.rewards.v1"],
            seeded["ascend.rewards.v1"],
          );
        await page.evaluate((old) => {
          Storage.prototype.setItem = window.qaSet;
          if (
            localStorage.getItem("ascend.rewards.v1") === "broken reward ledger"
          )
            localStorage.setItem("ascend.rewards.v1", old);
        }, fixtures()["ascend.rewards.v1"]);
        const retry = page.getByRole("button", {
          name: "RETRY REWARDS",
          exact: true,
        });
        // A second automatic reconciliation may already recover a lost acknowledgment.
        if (scenario === "foreground") {
          await page.evaluate(() => {
            Object.defineProperty(document, "visibilityState", {
              configurable: true,
              value: "hidden",
            });
            document.dispatchEvent(new Event("visibilitychange"));
            Object.defineProperty(document, "visibilityState", {
              configurable: true,
              value: "visible",
            });
            document.dispatchEvent(new Event("visibilitychange"));
          });
        } else if (scenario !== "lost-ack" || (await retry.count()))
          await retry.click();
      }
      if (scenario === "manual") {
        await balances("10 Coins");
        await page.getByRole("tab", { name: "CAREER", exact: true }).click();
        await page
          .getByRole("button", { name: "PLAY MATCH", exact: true })
          .click();
        await page
          .getByRole("button", { name: "CONFIRM PLAY MATCH", exact: true })
          .click();
        await page
          .getByRole("button", { name: "RETURN TO CAREER", exact: true })
          .click();
        await page.getByText("+10 Coins · Saved", { exact: true }).waitFor();
        await page.getByRole("tab", { name: "HOME", exact: true }).click();
      }
      await balances("20 Coins");
      const saved = await raw(),
        ledger = R.parseRewards(saved["ascend.rewards.v1"]);
      assert.equal(ledger.version, 2);
      assert.equal(ledger.receipts.length, 1);
      assert.equal(
        ledger.transactions.filter((t) => t.type === "match-result").length,
        1,
      );
      const completed = M.parseMatches(saved["ascend.matches.v1"]).matches[0];
      assert.equal(
        ledger.transactions.find((t) => t.type === "match-result").id,
        matchRewardId(completed.id),
      );
      assert.equal(completed.rewardDelivery, null);
      for (const [key, value] of Object.entries(seeded))
        if (
          key !== "ascend.rewards.v1" &&
          !(scenario === "manual" && key === "ascend.matches.v1")
        )
          assert.equal(saved[key], value);
      await page.getByRole("tab", { name: "SHOP", exact: true }).click();
      await balances("20 Coins");
      await page.getByRole("tab", { name: "PLAYER", exact: true }).click();
      await page.getByRole("tab", { name: "CAREER", exact: true }).click();
      await page.getByText("+10 Coins · Saved", { exact: true }).waitFor();
      assert.equal(
        await page.getByRole("button", { name: /CLAIM/ }).count(),
        0,
      );
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      if (scenario === "startup") {
        await page.evaluate(() => {
          const texts = [...document.querySelectorAll("*")].filter((e) =>
            [...e.childNodes].some(
              (n) => n.nodeType === 3 && n.textContent.trim(),
            ),
          );
          const sizes = texts.map((e) => [
            e,
            parseFloat(getComputedStyle(e).fontSize),
            parseFloat(getComputedStyle(e).lineHeight),
          ]);
          for (const [e, size, line] of sizes) {
            e.style.fontSize = `${size * 1.5}px`;
            if (Number.isFinite(line)) e.style.lineHeight = `${line * 1.5}px`;
          }
        });
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
        await page
          .getByTestId("match-reward-status")
          .last()
          .scrollIntoViewIfNeeded();
        await page.screenshot({
          path: "/tmp/ascend-match-rewards-320.png",
          fullPage: true,
        });
      }
      // Reload through / because the isolated static server has no extensionless fallback.
      await go();
      await balances("20 Coins");
      assert.deepEqual(await raw(), saved);
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log(
      "browser-match-rewards passed: startup without CAREER, automatic PLAY payment, write/lost-ack/corrupt recovery, combined balances, reload, isolation and 320px",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
