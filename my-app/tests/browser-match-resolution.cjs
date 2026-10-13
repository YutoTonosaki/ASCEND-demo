require("./register.cjs");
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { initializePlayer } = require("../src/growth/domain.ts");
const { beginCareer } = require("../src/career/domain.ts");
const D = require("../src/matches/domain.ts");
const E = require("../src/matches/evidence.ts");
const sessions = { version: 1, active: null, completed: [] };
const owner = {
  player: initializePlayer(
    "match-browser",
    "2026-10-01T00:00:00.000Z",
    null,
    sessions,
  ),
  career: beginCareer(
    "match-browser",
    "tokyo-zenith",
    "2026-10-01T00:00:00.000Z",
  ).career,
};
const data = D.generateCurrentMatch(
  { version: 1, matches: [] },
  owner,
  null,
  "2026-10-06T12:00:00.000Z",
  "UTC",
  () => 0.5,
);
data.matches[0].weekEnd = E.reconstructWeekEnd(
  owner.player,
  sessions,
  data.matches[0].week,
  3,
  "2026-10-12T00:00:00.000Z",
).snapshot;
const fixture = {
  "ascend.player.v1": JSON.stringify({ version: 1, player: owner.player }),
  "ascend.career.v1": JSON.stringify({ version: 1, career: owner.career }),
  "ascend.sessions.v1": JSON.stringify(sessions),
  "ascend.matches.v1": JSON.stringify(data),
};
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 320, height: 844 },
      timezoneId: "UTC",
      reducedMotion: "reduce",
    });
    page.setDefaultTimeout(60000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.clock.install({ time: new Date("2026-10-12T12:00:00.000Z") });
    await page.addInitScript((values) => {
      if (!localStorage.getItem("qa-match-seeded")) {
        for (const [key, value] of Object.entries(values))
          localStorage.setItem(key, value);
        localStorage.setItem("qa-match-seeded", "1");
      }
    }, fixture);
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
    await page.goto(url);
    await page.getByTestId("home-card-tier").waitFor();
    await page.getByRole("tab", { name: "CAREER", exact: true }).click();
    await page
      .getByRole("button", { name: "PLAY MATCH", exact: true })
      .waitFor();
    const before = await raw();
    assert.equal(
      JSON.parse(before["ascend.matches.v1"]).matches[0].result,
      null,
    );
    // Reward, Player and history keys must stay untouched even if the Match write fails.
    await page.evaluate(() => {
      window.qaOriginalSet = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        if (k === "ascend.matches.v1") throw Error("isolated Match failure");
        return window.qaOriginalSet.call(this, k, v);
      };
    });
    await page.getByRole("button", { name: "PLAY MATCH", exact: true }).click();
    await page
      .getByText(
        "Match unavailable. Saved data is preserved. Retry to check the saved result.",
        { exact: true },
      )
      .waitFor();
    assert.deepEqual(await raw(), before);
    await page.evaluate(() => {
      Storage.prototype.setItem = window.qaOriginalSet;
    });
    await page.getByRole("button", { name: "RETRY", exact: true }).click();
    await page.getByRole("button", { name: "PLAY MATCH", exact: true }).click();
    await page.getByText("LOSS", { exact: true }).waitFor();
    await page.getByText("+10 Coins · Saved", { exact: true }).waitFor();
    const saved = await raw(),
      result = JSON.parse(saved["ascend.matches.v1"]).matches[0].result;
    assert.equal(result.outcome, "LOSS");
    assert.equal(result.playerMatchPower, 45);
    assert.equal(result.rivalMatchPower, 52);
    const rewards = JSON.parse(saved["ascend.rewards.v1"]);
    assert.equal(rewards.receipts.length, 0);
    assert.equal(rewards.transactions.length, 1);
    assert.equal(rewards.transactions[0].type, "match-result");
    assert.equal(rewards.transactions[0].amount, 10);
    assert.equal(rewards.transactions[0].matchId, result.matchId);
    assert.deepEqual(
      Object.fromEntries(
        Object.entries(saved).filter(
          ([key]) => key !== "ascend.matches.v1" && key !== "ascend.rewards.v1",
        ),
      ),
      Object.fromEntries(
        Object.entries(before).filter(
          ([key]) => key !== "ascend.matches.v1" && key !== "ascend.rewards.v1",
        ),
      ),
    );
    await page.evaluate(() => {
      const text = [...document.querySelectorAll("*")].filter((el) =>
        [...el.childNodes].some(
          (n) => n.nodeType === 3 && n.textContent.trim(),
        ),
      );
      const sizes = text.map((el) => ({
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
      path: "/tmp/ascend-match-resolution-320.png",
      fullPage: true,
    });
    // This simple static server has no extensionless /career fallback.
    // Restart through / with the same durable browser storage.
    await page.goto(url);
    await page.getByTestId("home-card-tier").waitFor();
    await page.getByRole("tab", { name: "CAREER", exact: true }).click();
    await page.getByText("LOSS", { exact: true }).waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "PLAY MATCH", exact: true })
        .count(),
      0,
    );
    assert.equal(
      (await raw())["ascend.matches.v1"],
      saved["ascend.matches.v1"],
    );
    await page.getByRole("tab", { name: "PLAYER", exact: true }).click();
    await page.getByRole("tab", { name: "CAREER", exact: true }).click();
    assert.deepEqual(await raw(), saved);
    assert.deepEqual(errors, []);
    console.log(
      "browser-match-resolution passed: manual resolution, failure/retry, persisted outcome/reload, isolation, 320px and no page exceptions",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
