require("./register.cjs");
const { chromium } = require("playwright"),
  assert = require("node:assert/strict");
const M = require("../src/matches/domain.ts"),
  E = require("../src/matches/evidence.ts"),
  P = require("../src/rewards/matches.ts"),
  R = require("../src/rewards/domain.ts"),
  S = require("../src/seasons/domain.ts");
const { initializePlayer } = require("../src/growth/domain.ts"),
  { beginCareer } = require("../src/career/domain.ts"),
  { clubs } = require("../src/config/clubs.ts");
const sessions = { version: 1, active: null, completed: [] },
  now = "2026-10-13T12:00:00.000Z";
const owner = {
  player: initializePlayer(
    "history-browser",
    "2026-01-01T00:00:00.000Z",
    null,
    sessions,
  ),
  career: beginCareer(
    "history-browser",
    "tokyo-zenith",
    "2026-01-01T00:00:00.000Z",
  ).career,
};
let matches = { version: 1, matches: [] };
for (const [day, state] of [
  ["2026-09-08", "WIN"],
  ["2026-09-15", "DRAW"],
  ["2026-09-22", "LOSS"],
  ["2026-09-29", "SKIPPED"],
  ["2026-10-06", "READY"],
  ["2026-10-13", "UPCOMING"],
]) {
  matches = M.generateCurrentMatch(
    matches,
    owner,
    null,
    day + "T12:00:00.000Z",
    "UTC",
    () => 0.5,
  );
  const m = matches.matches.at(-1);
  m.rival.name = "History " + state;
  m.rival.club.name = "Snapshot Rival " + state;
  m.club.name = "Snapshot Player Club";
  if (state !== "UPCOMING")
    m.weekEnd = E.reconstructWeekEnd(
      owner.player,
      sessions,
      m.week,
      3,
      m.week.endExclusiveAt,
    ).snapshot;
  if (state === "WIN" || state === "DRAW") {
    m.weekEnd.trainingDays = [0, 1, 2].map((i) =>
      new Date(Date.parse(m.week.weekId + "T12:00:00.000Z") + i * 86400000)
        .toISOString()
        .slice(0, 10),
    );
    m.weekEnd.weeklyBonus = 10;
    m.weekEnd.playerMatchPower = 55;
    m.weekEnd.evidence.qualifyingSessionIds = ["a", "b", "c"];
    m.weekEnd.evidence.finalizedSessionIds = ["a", "b", "c"];
  }
  if (state === "DRAW") m.rival.condition = 10;
  if (["WIN", "DRAW", "LOSS"].includes(state))
    m.result = M.resolveMatch(
      m,
      new Date(Date.parse(m.week.endExclusiveAt) + 3600000).toISOString(),
    );
  if (state === "SKIPPED") m.skippedAt = m.week.expiresAt;
  matches = M.parseMatches(JSON.stringify(matches));
}
const september = {
  at: "2026-09-02T12:00:00.000Z",
  monthId: "2026-09",
  localDay: "2026-09-02",
  offsetMinutes: 0,
};
let seasons = S.startSeason(
  S.emptySeasons(),
  owner.career,
  owner.player,
  clubs["tokyo-zenith"],
  september,
);
seasons = S.completeSeason(
  seasons,
  seasons.seasons[0].id,
  owner.career,
  owner.player,
  {
    at: "2026-10-02T12:00:00.000Z",
    localDay: "2026-10-02",
    monthId: "2026-10",
    offsetMinutes: 0,
  },
);
const rewards = P.applyMatchPayments(
  R.emptyRewards(),
  matches,
  {
    playerId: owner.player.id,
    careerStartedAt: owner.career.clubHistory[0].joinedAt,
  },
  now,
);
const fixture = {
  "ascend.player.v1": JSON.stringify({ version: 1, player: owner.player }),
  "ascend.career.v1": JSON.stringify({ version: 1, career: owner.career }),
  "ascend.sessions.v1": JSON.stringify(sessions),
  "ascend.matches.v1": JSON.stringify(matches),
  "ascend.rewards.v1": JSON.stringify(rewards),
  "ascend.seasons.v1": JSON.stringify(seasons),
};
(async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
        viewport: { width: 320, height: 844 },
        timezoneId: "America/Vancouver",
        reducedMotion: "reduce",
      }),
      page = await context.newPage();
    page.setDefaultTimeout(45000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.clock.install({ time: new Date(now) });
    await page.addInitScript((values) => {
      if (!localStorage.getItem("qa-history-seeded")) {
        for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v);
        localStorage.setItem("qa-history-seeded", "1");
      }
    }, fixture);
    const url = process.env.ASCEND_QA_URL;
    assert.ok(url);
    const raw = () =>
      page.evaluate(() =>
        Object.fromEntries(
          Object.entries(localStorage).filter(([k]) => k.startsWith("ascend.")),
        ),
      );
    const button = (n) => page.getByRole("button", { name: n, exact: true });
    const surface = () => page.getByTestId("match-history-surface");
    const overflow = async () =>
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
    const language = async (from, to) => {
      await button(from === "en" ? "Settings" : "設定")
        .first()
        .click();
      await button(from === "en" ? "Language" : "言語").click();
      await button(to === "ja" ? "日本語" : "English").click();
      await button(to === "ja" ? "設定を閉じる" : "Close settings").click();
    };
    await page.goto(url);
    await page.getByText("50 Coins", { exact: true }).first().waitFor();
    await page.getByRole("tab", { name: "CAREER", exact: true }).click();
    await button("VIEW MATCH HISTORY").waitFor();
    const before = await raw();
    assert.deepEqual(before, fixture);
    await page.evaluate(() => {
      window.historyWrites = [];
      const native = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        window.historyWrites.push(k);
        return native.call(this, k, v);
      };
    });
    for (let repeat = 0; repeat < 2; repeat++) {
      await button("VIEW MATCH HISTORY").click();
      const cards = surface().getByTestId("history-card");
      assert.equal(await cards.count(), 6);
      assert.match(await cards.first().innerText(), /Oct 12, 2026/);
      assert.match(await cards.last().innerText(), /Sep 7, 2026/);
      assert.equal(
        await surface()
          .getByRole("button", { name: "PLAY MATCH", exact: true })
          .count(),
        0,
      );
      assert.equal(
        await surface().getByRole("button", { name: /CLAIM/ }).count(),
        0,
      );
      await surface()
        .getByRole("button", { name: /History WIN/ })
        .click();
      await page.getByText("Reward Paid", { exact: true }).waitFor();
      assert.equal(
        await page.getByTestId("history-paid-coins").innerText(),
        "25 Coins",
      );
      await page.getByText("Snapshot Rival WIN", { exact: true }).waitFor();
      await page.getByText("Snapshot Player Club", { exact: true }).waitFor();
      await page.getByText("55", { exact: true }).waitFor();
      await page.getByText("52", { exact: true }).waitFor();
      assert.ok(!(await surface().innerText()).includes("history-browser"));
      await overflow();
      await button("BACK").click();
      await surface()
        .getByRole("button", { name: /History SKIPPED/ })
        .click();
      await page.getByText("SKIPPED", { exact: true }).last().waitFor();
      assert.equal(await page.getByTestId("history-paid-coins").count(), 0);
      await button("BACK").click();
      await surface()
        .getByRole("button", { name: /History UPCOMING/ })
        .click();
      assert.ok(
        (await page.getByTestId("history-detail").innerText()).includes(
          "Not yet available",
        ),
      );
      await button("CLOSE").click();
    }
    await page.getByRole("button", { name: /SEASON 01 ·/ }).click();
    assert.equal(
      await page.getByTestId("season-match-played").innerText(),
      "3",
    );
    assert.equal(
      await page.getByTestId("season-match-skipped").innerText(),
      "1",
    );
    assert.equal(
      await page.getByTestId("season-match-win-rate").innerText(),
      "33.3%",
    );
    assert.equal(
      await page.getByTestId("season-match-coins").innerText(),
      "50 Coins",
    );
    await button("CLOSE").click();
    assert.deepEqual(await raw(), before);
    assert.deepEqual(await page.evaluate(() => window.historyWrites), []);
    await language("en", "ja");
    assert.deepEqual(await page.evaluate(() => window.historyWrites), [
      "ascend.settings.v1",
    ]);
    await button("マッチ履歴を見る").click();
    await surface()
      .getByRole("button", { name: /History DRAW/ })
      .click();
    await page.getByText("ライバルコンディション", { exact: true }).waitFor();
    await page.getByText("報酬受け取り済み", { exact: true }).waitFor();
    assert.equal(
      await page.getByTestId("history-paid-coins").innerText(),
      "15 コイン",
    );
    // Approximate large text on the detail; no native Dynamic Type claim.
    await page.evaluate(() => {
      const texts = [...document.querySelectorAll("*")].filter((e) =>
        [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()),
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
    await overflow();
    await page.getByTestId("history-paid-coins").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: "/tmp/ascend-history-detail-ja-320.png",
      fullPage: true,
    });
    await button("閉じる").click();
    await page.getByRole("button", { name: /シーズン 01 ·/ }).click();
    assert.equal(
      await page.getByTestId("season-match-coins").innerText(),
      "50 コイン",
    );
    await page.getByTestId("season-match-statistics").evaluate((root) => {
      const texts = [...root.querySelectorAll("*")].filter((e) =>
        [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()),
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
    await overflow();
    await page.getByTestId("season-match-coins").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: "/tmp/ascend-history-season-ja-320.png",
      fullPage: true,
    });
    await button("閉じる").click();
    const after = await raw();
    assert.deepEqual(
      Object.fromEntries(
        Object.entries(after).filter(([k]) => k !== "ascend.settings.v1"),
      ),
      before,
    );
    await page.goto(url);
    await page.getByText("50 コイン", { exact: true }).first().waitFor();
    await page.getByRole("tab", { name: "キャリア", exact: true }).click();
    await button("マッチ履歴を見る").waitFor();
    assert.deepEqual(await raw(), after);
    await language("ja", "en");
    await button("VIEW MATCH HISTORY").click();
    await surface()
      .getByRole("button", { name: /History LOSS/ })
      .click();
    await page.getByText("Reward Paid", { exact: true }).waitFor();
    assert.equal(
      await page.getByTestId("history-paid-coins").innerText(),
      "10 Coins",
    );
    await button("CLOSE").click();
    assert.deepEqual(errors, []);
    await context.close();
    for (const brokenKey of ["ascend.matches.v1", "ascend.rewards.v1"]) {
      const isolated = await browser.newContext({
        viewport: { width: 320, height: 844 },
        timezoneId: "UTC",
        reducedMotion: "reduce",
      });
      const errorPage = await isolated.newPage();
      errorPage.setDefaultTimeout(45000);
      await errorPage.clock.install({ time: new Date(now) });
      const values = { ...fixture, [brokenKey]: "broken isolated evidence" };
      const failures = [];
      errorPage.on("pageerror", (e) => failures.push(e.message));
      await errorPage.addInitScript((values) => {
        for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v);
      }, values);
      await errorPage.goto(url);
      await errorPage
        .getByText("Balance unavailable", { exact: true })
        .first()
        .waitFor();
      await errorPage.getByRole("tab", { name: "CAREER", exact: true }).click();
      if (brokenKey === "ascend.matches.v1") {
        await errorPage
          .getByText(
            "Match history is unavailable. Saved records are preserved.",
            { exact: true },
          )
          .waitFor();
        assert.equal(
          await errorPage
            .getByRole("button", { name: "VIEW MATCH HISTORY", exact: true })
            .count(),
          0,
        );
      } else {
        await errorPage
          .getByRole("button", { name: "VIEW MATCH HISTORY", exact: true })
          .click();
        await errorPage
          .getByTestId("match-history-surface")
          .getByRole("button", { name: /History LOSS/ })
          .click();
        await errorPage
          .getByText("Payment status unavailable", { exact: true })
          .waitFor();
        assert.equal(
          await errorPage.getByTestId("history-paid-coins").count(),
          0,
        );
        await errorPage
          .getByRole("button", { name: "CLOSE", exact: true })
          .click();
        await errorPage.getByRole("button", { name: /SEASON 01 ·/ }).click();
        assert.equal(
          await errorPage.getByTestId("season-match-coins").innerText(),
          "Unavailable",
        );
        assert.equal(
          await errorPage.getByTestId("season-match-played").innerText(),
          "3",
        );
      }
      const persisted = await errorPage.evaluate(() =>
        Object.fromEntries(
          Object.entries(localStorage).filter(([k]) => k.startsWith("ascend.")),
        ),
      );
      assert.deepEqual(persisted, values);
      assert.deepEqual(failures, []);
      await isolated.close();
    }
    console.log(
      "browser-match-history passed: all saved states/detail, read-only opens, Season counts, frozen Monday dates, EN/JA, 320px/large text, reload and no page exceptions",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
