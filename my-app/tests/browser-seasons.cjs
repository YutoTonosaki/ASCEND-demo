require("./register.cjs");
const { chromium } = require("playwright"),
  assert = require("node:assert/strict");
const { initializePlayer, overall } = require("../src/growth/domain.ts");
const { beginCareer } = require("../src/career/domain.ts");
const { standardExercises } = require("../src/data/exercises.ts");
const { newWorkout, newEntry } = require("../src/training/plans.ts");
const {
  startSession,
  confirmSet,
  position,
} = require("../src/sessions/domain.ts");
function active(at) {
  const e = newEntry(standardExercises.find((x) => x.id === "push-up"));
  return startSession(
    {
      ...newWorkout(),
      name: "Season QA",
      exercises: [{ ...e, restSeconds: 0, sets: e.sets.slice(0, 1) }],
    },
    standardExercises,
    at,
  );
}
const oldAt = "2026-10-01T19:00:00.000Z";
let old = active(oldAt);
old = confirmSet(old, position(old).set.id, { type: "reps", reps: 10 }, oldAt);
const sessions = { version: 1, active: null, completed: [old] };
const player = {
  version: 1,
  player: initializePlayer(
    "season-qa",
    "2026-10-02T19:00:00.000Z",
    null,
    sessions,
  ),
};
const career = beginCareer(
  "season-qa",
  "tokyo-zenith",
  "2026-10-02T19:00:01.000Z",
);
(async () => {
  const b = await chromium.launch();
  try {
    const page = await b.newPage({
        viewport: { width: 320, height: 844 },
        timezoneId: "America/Los_Angeles",
        reducedMotion: "reduce",
      }),
      errors = [];
    page.setDefaultTimeout(60000);
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() => {
      const Native = Date;
      window.Date = class extends Native {
        constructor(...args) {
          super(
            ...(args.length
              ? args
              : [
                  Number(localStorage.getItem("qa-season-clock")) ||
                    Native.now(),
                ]),
          );
        }
        static now() {
          return (
            Number(localStorage.getItem("qa-season-clock")) || Native.now()
          );
        }
      };
    });
    const url = process.env.ASCEND_QA_URL,
      button = (n) => page.getByRole("button", { name: n, exact: true }),
      tab = (n) => page.getByRole("tab", { name: n, exact: true }).click(),
      raw = () =>
        page.evaluate(() =>
          Object.fromEntries(
            Object.entries(localStorage).filter(([k]) =>
              k.startsWith("ascend."),
            ),
          ),
        );
    async function ready() {
      await page.goto(url);
      await page
        .getByText(/\d+ Coins/)
        .first()
        .waitFor();
    }
    async function time(at) {
      await page.evaluate(
        (at) => localStorage.setItem("qa-season-clock", String(Date.parse(at))),
        at,
      );
    }
    await ready();
    assert.equal((await raw())["ascend.seasons.v1"], undefined);
    await tab("CAREER");
    assert.equal(await button("START SEASON").count(), 0);
    await page.evaluate(
      ({ player, career, sessions }) => {
        localStorage.setItem("ascend.player.v1", JSON.stringify(player));
        localStorage.setItem("ascend.career.v1", JSON.stringify(career));
        localStorage.setItem("ascend.sessions.v1", JSON.stringify(sessions));
      },
      { player, career, sessions },
    );
    await time("2026-10-03T19:00:00Z");
    await ready();
    await tab("CAREER");
    await button("START SEASON").waitFor();
    await page.getByText("OCTOBER 2026", { exact: true }).waitFor();
    const before = await raw();
    assert.equal(before["ascend.seasons.v1"], undefined);
    await page.evaluate(() => {
      window.qaWrite = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        if (k === "ascend.seasons.v1") throw Error("QA Season failure");
        return window.qaWrite.call(this, k, v);
      };
    });
    await button("START SEASON").click();
    await page.getByText("QA Season failure", { exact: true }).waitFor();
    assert.deepEqual(await raw(), before);
    await page.evaluate(() => (Storage.prototype.setItem = window.qaWrite));
    await button("RETRY SEASONS").click();
    await button("START SEASON").dblclick();
    await page.getByTestId("season-workouts").waitFor();
    assert.equal(
      await page.getByTestId("season-workouts").innerText(),
      "WORKOUTS · 0",
    );
    const after = await raw();
    assert.deepEqual(
      Object.fromEntries(
        Object.entries(after).filter(([k]) => k !== "ascend.seasons.v1"),
      ),
      before,
    );
    assert.equal(
      JSON.parse(after["ascend.seasons.v1"]).seasons[0].startingPlayer.ovr,
      45,
    );
    assert.equal(await button("COMPLETE SEASON").count(), 0);
    async function complete(day, reps) {
      const at = `2026-10-${day}T20:00:00.000Z`,
        s = active(at);
      await page.evaluate(
        ({ s }) => {
          const d = JSON.parse(localStorage.getItem("ascend.sessions.v1"));
          d.active = s;
          localStorage.setItem("ascend.sessions.v1", JSON.stringify(d));
        },
        { s },
      );
      await time(at);
      await ready();
      await tab("TRAIN");
      await button("RESUME WORKOUT").click();
      const input = page.getByRole("spinbutton").first(); // Current controls use text inputs, choose explicit label below.
      const actual = page.getByRole("textbox", { name: /reps/i }).first();
      await actual.fill(String(reps));
      await button("COMPLETE SET").click();
      await page.getByTestId("workout-coins").waitFor();
      await page.waitForTimeout(900);
      if (await button("CONTINUE").isVisible())
        await button("CONTINUE").click();
      await button("FINISH").click();
      await tab("CAREER");
      return s;
    }
    await complete("04", 12);
    await page.getByText("WORKOUTS · 1", { exact: true }).waitFor();
    await page.getByText("PR IMPROVEMENTS · 1", { exact: true }).waitFor();
    await complete("04", 12);
    await page.getByText("WORKOUTS · 2", { exact: true }).waitFor();
    await page.getByText("TRAINING DAYS · 1", { exact: true }).waitFor();
    await complete("05", 13);
    await page.getByText("WORKOUTS · 3", { exact: true }).waitFor();
    await page.getByText("TRAINING DAYS · 2", { exact: true }).waitFor();
    await page.getByText("PR IMPROVEMENTS · 2", { exact: true }).waitFor();
    await page.getByTestId("season-prs").scrollIntoViewIfNeeded();
    await page.screenshot({ path: "/tmp/ascend-season-active-320.png" });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await tab("HOME");
    await page
      .getByTestId("home-season")
      .getByText("SEASON 01 · OCTOBER 2026", { exact: true })
      .waitFor();
    await ready();
    await tab("CAREER");
    await page.getByText("WORKOUTS · 3", { exact: true }).waitFor();
    assert.equal(await button("START SEASON").count(), 0);
    await time("2027-01-05T19:00:00Z");
    await ready();
    await tab("CAREER");
    await button("COMPLETE SEASON").waitFor();
    const preClose = await raw();
    await button("COMPLETE SEASON").dblclick();
    await button("START SEASON").waitFor();
    const closed = await raw(),
      season = JSON.parse(closed["ascend.seasons.v1"]).seasons[0];
    assert.deepEqual(season.end.stats, {
      workouts: 3,
      trainingDays: 2,
      prImprovements: 2,
    });
    assert.equal(
      season.end.player.ovr,
      overall(JSON.parse(closed["ascend.player.v1"]).player.ratings),
    );
    assert.deepEqual(
      Object.fromEntries(
        Object.entries(closed).filter(([k]) => k !== "ascend.seasons.v1"),
      ),
      Object.fromEntries(
        Object.entries(preClose).filter(([k]) => k !== "ascend.seasons.v1"),
      ),
    );
    await page
      .getByRole("button", { name: /SEASON 01 · OCTOBER 2026 · Tokyo Zenith/ })
      .click();
    await page.getByText("COMPLETED SEASON", { exact: true }).waitFor();
    await button("CLOSE").click();
    await button("START SEASON").click();
    await page.getByText("SEASON 02", { exact: true }).waitFor();
    const current = await raw(),
      d = JSON.parse(current["ascend.seasons.v1"]);
    assert.deepEqual(
      d.seasons.map((s) => s.monthId),
      ["2026-10", "2027-01"],
    );
    assert.deepEqual(d.seasons[0], season);
    await page.evaluate(() => {
      for (const n of document.querySelectorAll('[dir="auto"]'))
        n.style.fontSize = `${parseFloat(getComputedStyle(n).fontSize) * 1.5}px`;
    });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({ path: "/tmp/ascend-season-large-320.png" });
    await page.evaluate(() =>
      localStorage.setItem("ascend.seasons.v1", "broken"),
    );
    await ready();
    await tab("CAREER");
    await button("RETRY SEASONS").click();
    assert.equal((await raw())["ascend.seasons.v1"], "broken");
    assert.equal(await button("START SEASON").count(), 0);
    await page.evaluate(
      (raw) => localStorage.setItem("ascend.seasons.v1", raw),
      current["ascend.seasons.v1"],
    );
    await ready();
    await tab("CAREER");
    await page.getByText("SEASON 02", { exact: true }).waitFor();
    assert.deepEqual(await raw(), current);
    assert.deepEqual(errors, []);
    console.log(
      "PASS: explicit start/failure/retry, live workout/day/PR evidence, reload, immutable snapshots, late completion/skipped months, history, HOME, independent storage, 320px/large text/reduced motion.",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
