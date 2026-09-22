// Optional isolated Playwright QA; never reads/writes the user's phone data.
require("./register.cjs");
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { standardExercises } = require("../src/data/exercises.ts");
const { newWorkout, newEntry } = require("../src/training/plans.ts");
const {
  startSession,
  confirmSet,
  position,
} = require("../src/sessions/domain.ts");
const { defaultProfile } = require("../src/coach/profile.ts");
const { overall } = require("../src/growth/domain.ts");
const { isPlayerData } = require("../src/growth/validation.ts");
const byId = (id) => standardExercises.find((e) => e.id === id);
function plan(name, ids, count = 1) {
  return {
    ...newWorkout(),
    name,
    exercises: ids.map((id) => {
      const entry = newEntry(byId(id));
      return { ...entry, restSeconds: 0, sets: entry.sets.slice(0, count) };
    }),
  };
}
async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
        viewport: { width: 320, height: 844 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    const url = process.env.ASCEND_QA_URL || "http://127.0.0.1:8106";
    const tab = (name) => page.getByRole("tab", { name, exact: true }).click();
    const click = (name) =>
      page.getByRole("button", { name, exact: true }).click();
    const input = () =>
      page.getByRole("textbox", { name: "Actual reps", exact: true });
    const stored = () =>
      page.evaluate(() => JSON.parse(localStorage.getItem("ascend.player.v1")));
    const noOverflow = async () =>
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
    await page.goto(url);
    await tab("PLAYER");
    await page
      .getByRole("button", { name: "INITIALIZE PLAYER", exact: true })
      .waitFor();
    assert.equal(await page.getByTestId("player-card").count(), 0);
    const at = new Date(Date.now() - 3600000).toISOString(),
      profile = defaultProfile(at);
    profile.baselineAssessments = ["push-up", "squat", "plank"].map((id) => ({
      exercise: byId(id),
      actual:
        id === "plank"
          ? { type: "time", seconds: 30 }
          : { type: "reps", reps: 10 },
      recordedAt: at,
      source: "known",
    }));
    let old = startSession(
      plan("Earlier workout", ["push-up", "squat"]),
      standardExercises,
      at,
    );
    while (position(old))
      old = confirmSet(
        old,
        position(old).set.id,
        { type: "reps", reps: 10 },
        at,
      );
    const workout = plan("Growth check", ["push-up"], 2);
    await page.evaluate(
      ({ profile, old, workout }) => {
        localStorage.setItem(
          "ascend.coach.v1",
          JSON.stringify({ version: 1, profile }),
        );
        localStorage.setItem(
          "ascend.sessions.v1",
          JSON.stringify({ version: 1, active: null, completed: [old] }),
        );
        localStorage.setItem(
          "ascend.training.v1",
          JSON.stringify({
            version: 1,
            customExercises: [],
            recentExerciseIds: [],
            workouts: [workout],
          }),
        );
      },
      { profile, old, workout },
    );
    await page.goto(url);
    await tab("PLAYER");
    await click("INITIALIZE PLAYER");
    await page.getByTestId("player-card").waitFor();
    let p = await stored();
    assert.ok(isPlayerData(p));
    assert.equal(overall(p.player.ratings), 45);
    assert.equal(p.player.events.length, 0);
    assert.equal(p.player.status.Back, "provisional");
    const baselineSnapshot = JSON.stringify(p.player.baselineEvidence),
      initialId = p.player.id;
    await page.getByTestId("player-card").scrollIntoViewIfNeeded();
    await noOverflow();
    await page.screenshot({ path: "/tmp/ascend-growth-card-320.png" });
    await click("Gold");
    await click("LOW");
    await noOverflow();
    await tab("TRAIN");
    await click("SAVED WORKOUTS · 1");
    await click("VIEW · Growth check");
    await click("START WORKOUT");
    await input().fill("99");
    await tab("PLAYER");
    assert.equal((await stored()).player.events.length, 0);
    await tab("TRAIN");
    await input().fill("12");
    // Simulate failure of the player boundary only; session confirmation must still persist.
    await page.evaluate(() => {
      window.restorePlayerWrite = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        if (k === "ascend.player.v1")
          throw new Error("simulated player write failure");
        return window.restorePlayerWrite.call(this, k, v);
      };
    });
    await click("COMPLETE SET");
    await tab("PLAYER");
    await page
      .getByRole("button", { name: "RETRY PLAYER DATA", exact: true })
      .waitFor();
    assert.equal((await stored()).player.ratings.Chest, 46);
    await page.evaluate(() => {
      Storage.prototype.setItem = window.restorePlayerWrite;
      delete window.restorePlayerWrite;
    });
    await click("RETRY PLAYER DATA");
    await page.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem("ascend.player.v1")).player.ratings
          .Chest > 46,
    );
    p = await stored();
    assert.equal(p.player.events.filter((e) => e.kind === "growth").length, 1);
    assert.ok(isPlayerData(p));
    await page.goto(url);
    await tab("PLAYER");
    await page.getByTestId("player-card").waitFor();
    assert.deepEqual(await stored(), p);
    await tab("TRAIN");
    await click("RESUME WORKOUT");
    await input().fill("12");
    await click("COMPLETE SET");
    await page.getByText("WORKOUT COMPLETE.", { exact: true }).waitFor();
    await click("FINISH");
    await page.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem("ascend.player.v1")).player
          .finalizedSessionIds.length === 2,
    );
    p = await stored();
    assert.equal(p.player.events.filter((e) => e.kind === "growth").length, 1);
    assert.equal(p.player.events.filter((e) => e.kind === "bonus").length, 0);
    const pair = plan("Growth pair", ["push-up", "squat"]);
    await page.evaluate((workout) => {
      const data = JSON.parse(localStorage.getItem("ascend.training.v1"));
      data.workouts = [workout];
      localStorage.setItem("ascend.training.v1", JSON.stringify(data));
    }, pair);
    await page.goto(url);
    await tab("TRAIN");
    await click("SAVED WORKOUTS · 1");
    await click("VIEW · Growth pair");
    await click("START WORKOUT");
    await input().fill("14");
    await click("COMPLETE SET");
    await page.waitForTimeout(650);
    await input().fill("12");
    await click("COMPLETE SET");
    await page.getByText("WORKOUT COMPLETE.", { exact: true }).waitFor();
    await click("FINISH");
    await page.waitForFunction(() =>
      JSON.parse(localStorage.getItem("ascend.player.v1")).player.events.some(
        (e) => e.kind === "bonus",
      ),
    );
    p = await stored();
    assert.equal(p.player.events.filter((e) => e.kind === "bonus").length, 1);
    assert.ok(isPlayerData(p));
    // Native UI template deletion must not affect the independently persisted ratings.
    await click("SAVED WORKOUTS · 1");
    await click("VIEW · Growth pair");
    await click("DELETE WORKOUT");
    await click("CONFIRM");
    await page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem("ascend.coach.v1"));
      data.profile.baselineAssessments[0].actual.reps = 40;
      data.profile.updatedAt = new Date().toISOString();
      localStorage.setItem("ascend.coach.v1", JSON.stringify(data));
    });
    await page.goto(url);
    await tab("PLAYER");
    await page.getByTestId("player-card").waitFor();
    assert.deepEqual(await stored(), p);
    assert.equal(JSON.stringify(p.player.baselineEvidence), baselineSnapshot);
    assert.equal(p.player.id, initialId);
    await page.getByTestId("rating-Chest").scrollIntoViewIfNeeded();
    await noOverflow();
    await page.screenshot({ path: "/tmp/ascend-growth-ratings-320.png" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByTestId("player-card").scrollIntoViewIfNeeded();
    await noOverflow();
    await page.screenshot({ path: "/tmp/ascend-growth-card-390.png" });
    await tab("HOME");
    await page
      .getByRole("button", {
        name: new RegExp("OVR " + overall(p.player.ratings)),
      })
      .waitFor();
    const raw = JSON.stringify(p);
    await page.evaluate(() =>
      localStorage.setItem("ascend.player.v1", "damaged player"),
    );
    await page.goto(url);
    await tab("PLAYER");
    await page
      .getByRole("button", { name: "RETRY PLAYER DATA", exact: true })
      .waitFor();
    assert.equal(
      await page.evaluate(() => localStorage.getItem("ascend.player.v1")),
      "damaged player",
    );
    assert.equal(await page.getByTestId("player-card").count(), 0);
    await tab("TRAIN");
    await page
      .getByRole("button", { name: "WORKOUT HISTORY", exact: true })
      .waitFor();
    await page.evaluate(
      (raw) => localStorage.setItem("ascend.player.v1", raw),
      raw,
    );
    await tab("PLAYER");
    await click("RETRY PLAYER DATA");
    await page.getByTestId("player-card").waitFor();
    assert.deepEqual(await stored(), p);
    assert.deepEqual(errors, []);
    console.log(
      "PASS: 320/390px initialization/snapshots, historical cutoff, active PR growth, failed-write retry, resume/reload/idempotence, completion-only distinct bonus, template deletion/profile isolation, card finishes/real Home OVR, corrupted player boundary/retry, no overflow or console errors.",
    );
  } finally {
    await browser.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
