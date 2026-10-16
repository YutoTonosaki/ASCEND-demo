require("./register.cjs");
const { chromium } = require("playwright"),
  assert = require("node:assert/strict");
const G = require("../src/growth/domain.ts"),
  M = require("../src/matches/domain.ts"),
  E = require("../src/matches/evidence.ts"),
  H = require("../src/matches/history.ts"),
  R = require("../src/rewards/domain.ts"),
  L = require("../src/localization/core.ts");
const { beginCareer } = require("../src/career/domain.ts"),
  { defaultProfile } = require("../src/coach/profile.ts");
const { standardExercises } = require("../src/data/exercises.ts"),
  { newWorkout, newEntry } = require("../src/training/plans.ts"),
  { startSession, confirmSet, position } = require("../src/sessions/domain.ts");
function active(at) {
  const e = newEntry(standardExercises.find((e) => e.id === "push-up"));
  return startSession(
    {
      ...newWorkout(),
      name: "Full loop QA",
      exercises: [{ ...e, restSeconds: 0, sets: e.sets.slice(0, 1) }],
    },
    standardExercises,
    at,
  );
}
const init = "2026-09-27T12:00:00.000Z";
let old = active("2026-09-26T12:00:00.000Z");
old = confirmSet(
  old,
  position(old).set.id,
  { type: "reps", reps: 10 },
  old.startedAt,
);
const history = { version: 1, active: null, completed: [old] },
  profile = defaultProfile(init);
profile.preferredTrainingDaysPerWeek = 3;
profile.baselineAssessments = [
  {
    exercise: standardExercises.find((e) => e.id === "push-up"),
    actual: { type: "reps", reps: 10 },
    source: "known",
    recordedAt: init,
  },
];
const owner = {
  player: G.initializePlayer("loop-browser", init, profile, history),
  career: beginCareer("loop-browser", "tokyo-zenith", init).career,
};
const seed = {
  "ascend.player.v1": JSON.stringify({ version: 1, player: owner.player }),
  "ascend.career.v1": JSON.stringify({ version: 1, career: owner.career }),
  "ascend.coach.v1": JSON.stringify({ version: 1, profile }),
  "ascend.sessions.v1": JSON.stringify(history),
};
(async () => {
  const browser = await chromium.launch();
  try {
    async function open(values, at, tz = "UTC") {
      const page = await browser.newPage({
        viewport: { width: 320, height: 844 },
        timezoneId: tz,
        reducedMotion: "reduce",
      });
      page.setDefaultTimeout(45000);
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.addInitScript(
        ({ values, at }) => {
          if (!localStorage.getItem("qa-loop-seeded")) {
            for (const [k, v] of Object.entries(values))
              localStorage.setItem(k, v);
            localStorage.setItem("qa-loop-seeded", "1");
            localStorage.setItem("qa-loop-clock", String(Date.parse(at)));
          }
          const Native = Date;
          window.Date = class extends Native {
            constructor(...args) {
              super(
                ...(args.length
                  ? args
                  : [Number(localStorage.getItem("qa-loop-clock"))]),
              );
            }
            static now() {
              return Number(localStorage.getItem("qa-loop-clock"));
            }
          };
          window.qaIO = { reads: 0, writes: [] };
          const get = Storage.prototype.getItem,
            set = Storage.prototype.setItem;
          Storage.prototype.getItem = function (k) {
            if (k.startsWith("ascend.")) window.qaIO.reads++;
            return get.call(this, k);
          };
          Storage.prototype.setItem = function (k, v) {
            if (k.startsWith("ascend.")) window.qaIO.writes.push(k);
            return set.call(this, k, v);
          };
          window.qaForeignSeen = false;
          new MutationObserver(() => {
            if (
              document.body?.textContent.includes(
                "FOREIGN RIVAL MUST STAY HIDDEN",
              )
            )
              window.qaForeignSeen = true;
          }).observe(document, {
            subtree: true,
            childList: true,
            characterData: true,
          });
        },
        { values, at },
      );
      const url = process.env.ASCEND_QA_URL;
      assert.ok(url);
      const raw = () =>
        page.evaluate(() =>
          Object.fromEntries(
            Object.entries(localStorage).filter(([k]) =>
              k.startsWith("ascend."),
            ),
          ),
        );
      const ready = async () => {
        await page.goto(url);
        await page.getByTestId("home-card-tier").waitFor();
      };
      const tab = (name) =>
          page.getByRole("tab", { name, exact: true }).click(),
        button = (name) => page.getByRole("button", { name, exact: true });
      const time = (at) =>
        page.evaluate(
          (at) => localStorage.setItem("qa-loop-clock", String(Date.parse(at))),
          at,
        );
      const foreground = () =>
        page.evaluate(() => {
          for (const value of ["hidden", "visible"]) {
            Object.defineProperty(document, "visibilityState", {
              configurable: true,
              value,
            });
            document.dispatchEvent(new Event("visibilitychange"));
          }
        });
      await ready();
      return { page, errors, raw, ready, tab, button, time, foreground };
    }
    const q = await open(seed, "2026-09-28T12:00:00.000Z"),
      { page, raw, ready, tab, button, time, foreground } = q;
    await tab("CAREER");
    await button("START SEASON").click();
    await page.getByTestId("season-workouts").waitFor();
    let saved = await raw(),
      first = M.parseMatches(saved["ascend.matches.v1"]).matches[0],
      rival = JSON.stringify(first.rival);
    assert.equal(first.baselineOVR, G.overall(owner.player.ratings));
    assert.equal(saved["ascend.rewards.v1"], undefined);
    for (const [day, reps] of [
      ["2026-09-29", 11],
      ["2026-09-30", 12],
      ["2026-10-01", 13],
    ]) {
      const at = day + "T12:00:00.000Z",
        s = active(at);
      await page.evaluate(
        ({ s, at }) => {
          const d = JSON.parse(localStorage.getItem("ascend.sessions.v1"));
          d.active = s;
          localStorage.setItem("ascend.sessions.v1", JSON.stringify(d));
          localStorage.setItem("qa-loop-clock", String(Date.parse(at)));
        },
        { s, at },
      );
      await ready();
      await tab("TRAIN");
      await button("RESUME WORKOUT").click();
      await page
        .getByRole("textbox", { name: /reps/i })
        .first()
        .fill(String(reps));
      await button("COMPLETE SET").click();
      await page.getByTestId("workout-coins").waitFor();
      await page.waitForFunction((id) => {
        const p = JSON.parse(localStorage.getItem("ascend.player.v1")).player;
        return p.finalizedSessionIds.includes(id);
      }, s.id);
      await button("FINISH").click();
      saved = await raw();
      assert.equal(
        JSON.stringify(
          M.parseMatches(saved["ascend.matches.v1"]).matches[0].rival,
        ),
        rival,
      );
    }
    saved = await raw();
    const trained = JSON.parse(saved["ascend.player.v1"]).player;
    assert.ok(trained.ratings.Chest > trained.initialRatings.Chest);
    assert.equal(R.balance(R.parseRewards(saved["ascend.rewards.v1"])), 60);
    assert.equal(
      JSON.parse(saved["ascend.seasons.v1"]).seasons[0].evidence.length,
      2,
    );
    await time("2026-10-02T12:00:00.000Z");
    await ready();
    await tab("CAREER");
    await button("COMPLETE SEASON").click();
    await button("START SEASON").waitFor();
    const frozen = (await raw())["ascend.seasons.v1"];
    await time("2026-10-05T12:00:00.000Z");
    await ready();
    await tab("CAREER");
    await button("PLAY MATCH").waitFor();
    const pre = await raw(),
      m = M.parseMatches(pre["ascend.matches.v1"]).matches.find(
        (m) => m.id === first.id,
      );
    assert.equal(m.weekEnd.ovr, G.overall(trained.ratings));
    assert.equal(m.weekEnd.trainingDays.length, 3);
    assert.equal(m.weekEnd.weeklyBonus, 10);
    await button("PLAY MATCH").click();
    await button("CONFIRM PLAY MATCH").click();
    await page.getByTestId("cinematic-report").waitFor();
    await page.waitForFunction(() =>
      JSON.parse(localStorage.getItem("ascend.rewards.v1")).transactions.some(
        (t) => t.type === "match-result",
      ),
    );
    saved = await raw();
    const completed = M.parseMatches(saved["ascend.matches.v1"]),
      match = completed.matches.find((m) => m.id === first.id),
      coins = R.parseRewards(saved["ascend.rewards.v1"]);
    const expected = { WIN: 25, DRAW: 15, LOSS: 10 }[match.result.outcome];
    assert.equal(R.balance(coins), 60 + expected);
    assert.equal(coins.receipts.length, 3);
    for (const [k, v] of Object.entries(pre))
      if (!["ascend.matches.v1", "ascend.rewards.v1"].includes(k))
        assert.equal(saved[k], v);
    assert.equal(saved["ascend.seasons.v1"], frozen);
    await button("RETURN TO CAREER").click();
    await button("VIEW MATCH HISTORY").click();
    await page
      .getByTestId("history-card")
      .filter({ hasText: match.rival.name })
      .last()
      .click();
    await page.getByTestId("history-paid-coins").waitFor();
    assert.equal(await button("PLAY MATCH").count(), 0);
    await button("CLOSE").click();
    await page.getByRole("button", { name: /SEASON 01 · SEPTEMBER/ }).click();
    await page.getByTestId("season-match-coins").waitFor();
    assert.equal(
      await page.getByTestId("season-match-played").innerText(),
      "1",
    );
    assert.equal(
      await page.getByTestId("season-match-coins").innerText(),
      `${expected} Coins`,
    );
    await button("CLOSE").click();
    const count = await page.evaluate(() => window.qaIO.writes.length);
    await foreground();
    await foreground();
    await page.waitForTimeout(1500);
    assert.deepEqual(await raw(), saved);
    assert.equal(await page.evaluate(() => window.qaIO.writes.length), count);
    console.log(
      "settled repeated foreground IO",
      await page.evaluate(() => window.qaIO),
    );
    await ready();
    await tab("HOME");
    assert.equal(await page.getByTestId("match-experience").count(), 0);
    await tab("SHOP");
    for (const text of await page.getByTestId("coin-balance").allTextContents())
      assert.equal(text, `${60 + expected} Coins`);
    assert.deepEqual(await raw(), saved);
    assert.deepEqual(q.errors, []);
    await page.close();
    console.log(
      "full-loop workout → Growth → frozen OVR/bonus → PLAY → reward → report/history → closed Season passed",
    );
    // Frozen timezone display and expiry while the pre-match remains open.
    const data = M.generateCurrentMatch(
      { version: 1, matches: [] },
      owner,
      profile,
      "2026-09-29T12:00:00.000Z",
      "UTC",
      () => 0.5,
    );
    data.matches[0].rival.name = "Long Rival Identity for Layout Verification";
    data.matches[0].club.name =
      "A Very Long Original Player Club Snapshot Name";
    data.matches[0].weekEnd = E.reconstructWeekEnd(
      owner.player,
      history,
      data.matches[0].week,
      3,
      "2026-10-05T00:00:00.000Z",
    ).snapshot;
    const upcoming = M.generateCurrentMatch(
      data,
      owner,
      profile,
      "2026-10-11T23:59:00.000Z",
      "UTC",
      () => 0.5,
    );
    const t = await open(
      { ...seed, "ascend.matches.v1": JSON.stringify(upcoming) },
      "2026-10-11T23:59:00.000Z",
      "America/Vancouver",
    );
    await t.tab("CAREER");
    const target = upcoming.matches.at(-1);
    await t.page
      .getByText(
        L.translate("en", "match.unlock", {
          date: L.formatZonedDate("en", target.week.endExclusiveAt, "UTC"),
        }),
        { exact: true },
      )
      .waitFor();
    await t.button("PLAY MATCH").click();
    await t.button("CONFIRM PLAY MATCH").waitFor();
    await t.page.getByTestId("match-experience").evaluate((root) => {
      const sizes = [...root.querySelectorAll("*")]
        .filter((el) =>
          [...el.childNodes].some(
            (n) => n.nodeType === 3 && n.textContent.trim(),
          ),
        )
        .map((el) => ({
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
      await t.page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await t.page.screenshot({ path: "/tmp/ascend-4c5-long-pre-320.png" });

    await t.time("2026-10-12T00:00:00.000Z");
    await t.foreground();
    await t.page
      .getByTestId("pre-match-status")
      .getByText("SKIPPED", { exact: true })
      .waitFor();
    assert.ok(await t.button("CONFIRM PLAY MATCH").isDisabled());
    assert.equal(
      M.parseMatches((await t.raw())["ascend.matches.v1"]).matches[0].result,
      null,
    );
    assert.ok(
      await t.page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    assert.deepEqual(t.errors, []);
    await t.page.screenshot({ path: "/tmp/ascend-4c5-expired-320.png" });
    await t.page.close();
    console.log(
      "frozen timezone display, long names and expired pre-match passed",
    );
    const foreign = M.generateCurrentMatch(
      { version: 1, matches: [] },
      owner,
      null,
      "2026-09-29T12:00:00.000Z",
      "UTC",
      () => 0.5,
    );
    foreign.matches[0].rival.name = "FOREIGN RIVAL MUST STAY HIDDEN";
    const newOwner = {
      ...owner,
      player: { ...owner.player, id: "new-owner" },
      career: { ...owner.career, playerId: "new-owner" },
    };
    const x = await open(
      {
        ...seed,
        "ascend.player.v1": JSON.stringify({
          version: 1,
          player: newOwner.player,
        }),
        "ascend.career.v1": JSON.stringify({
          version: 1,
          career: newOwner.career,
        }),
        "ascend.matches.v1": JSON.stringify(foreign),
      },
      "2026-09-29T12:00:00.000Z",
    );
    await x.tab("CAREER");
    await x.page
      .getByText(
        "Match unavailable. Saved data is preserved. Retry to check the saved result.",
        { exact: true },
      )
      .waitFor();
    assert.equal(await x.page.evaluate(() => window.qaForeignSeen), false);
    assert.equal((await x.raw())["ascend.matches.v1"], JSON.stringify(foreign));
    assert.deepEqual(x.errors, []);
    await x.page.close();
    console.log("ownership hydration fail-closed passed");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
