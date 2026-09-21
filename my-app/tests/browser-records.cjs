// Optional external Playwright, against the production export; isolated browser data only.
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
const at = "2026-09-20T12:00:00.000Z";
const exercise = (id) => standardExercises.find((e) => e.id === id);
function plan(id, count = 1) {
  const entry = newEntry(exercise(id));
  return {
    ...newWorkout(),
    name: "PR check",
    exercises: [{ ...entry, restSeconds: 0, sets: entry.sets.slice(0, count) }],
  };
}
function history(id, actuals) {
  let s = startSession(plan(id, actuals.length), standardExercises, at);
  for (const actual of actuals)
    s = confirmSet(s, position(s).set.id, actual, at);
  return s;
}
async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 320, height: 844 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    const url = process.env.ASCEND_QA_URL || "http://127.0.0.1:8104";
    const click = (name) =>
      page.getByRole("button", { name, exact: true }).click();
    const tab = (name) => page.getByRole("tab", { name, exact: true }).click();
    const row = (id) => page.getByTestId(id);
    const value = async (id, text) => {
      await row(id).getByText(text, { exact: true }).waitFor();
    };
    const noOverflow = async () =>
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
    await page.goto(url);
    const profile = defaultProfile(at);
    profile.baselineAssessments = [
      {
        exercise: exercise("push-up"),
        actual: { type: "reps", reps: 99 },
        source: "known",
        recordedAt: at,
      },
    ];
    await page.evaluate(
      (p) =>
        localStorage.setItem(
          "ascend.coach.v1",
          JSON.stringify({ version: 1, profile: p }),
        ),
      profile,
    );
    await page.goto(url);
    await tab("PLAYER");
    await page.getByText(/Your records start here/).waitFor();
    assert.equal(await page.getByTestId("pr-push-up-reps").count(), 0);
    const p = plan("push-up", 2);
    const completed = [
      history("push-up", [{ type: "reps", reps: 8 }]),
      history("plank", [{ type: "time", seconds: 31 }]),
      history("bench-press", [
        { type: "weight_reps", weightKg: 5, reps: 15 },
        { type: "weight_reps", weightKg: 7, reps: 12 },
        { type: "weight_reps", weightKg: 10, reps: 8 },
      ]),
    ];
    await page.evaluate(
      ({ p, completed }) => {
        localStorage.setItem(
          "ascend.training.v1",
          JSON.stringify({
            version: 1,
            customExercises: [],
            recentExerciseIds: [],
            workouts: [p],
          }),
        );
        localStorage.setItem(
          "ascend.sessions.v1",
          JSON.stringify({ version: 1, active: null, completed }),
        );
      },
      { p, completed },
    );
    await page.goto(url);
    await tab("PLAYER");
    await value("pr-push-up-reps", "8 reps");
    await value("pr-plank-time", "31 sec");
    await value("pr-bench-press-weight_reps", "10 kg");
    await click("VIEW RECORDS BY WEIGHT · Bench Press");
    const weighted = row("pr-bench-press-weight_reps");
    for (const text of ["5 kg", "15 reps", "7 kg", "12 reps", "8 reps"])
      await weighted.getByText(text, { exact: true }).waitFor();
    await weighted.scrollIntoViewIfNeeded();
    await noOverflow();
    await page.screenshot({ path: "/tmp/ascend-pr-weight-320.png" });
    await tab("TRAIN");
    await click("SAVED WORKOUTS · 1");
    await click("VIEW · PR check");
    await click("START WORKOUT");
    const input = page.getByRole("textbox", {
      name: "Actual reps",
      exact: true,
    });
    await input.fill("13"); // Still unconfirmed: does not become a PR.
    await tab("PLAYER");
    await value("pr-push-up-reps", "8 reps");
    await tab("TRAIN");
    await click("COMPLETE SET");
    await tab("PLAYER");
    await value("pr-push-up-reps", "13 reps");
    await row("pr-push-up-reps").scrollIntoViewIfNeeded();
    await page.screenshot({ path: "/tmp/ascend-pr-320.png" });
    await page.goto(url);
    await tab("PLAYER");
    await value("pr-push-up-reps", "13 reps");
    await tab("TRAIN");
    await click("RESUME WORKOUT");
    await input.fill("7");
    await click("COMPLETE SET");
    await page.getByText("WORKOUT COMPLETE.", { exact: true }).waitFor();
    await click("FINISH");
    await tab("PLAYER");
    await value("pr-push-up-reps", "13 reps");
    await tab("TRAIN");
    await click("SAVED WORKOUTS · 1");
    await click("VIEW · PR check");
    await click("DELETE WORKOUT");
    await click("CONFIRM");
    const raw = await page.evaluate(() =>
      localStorage.getItem("ascend.sessions.v1"),
    );
    await page.goto(url);
    await tab("PLAYER");
    await value("pr-push-up-reps", "13 reps");
    await noOverflow();
    assert.equal(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("ascend.coach.v1")).profile
            .baselineAssessments[0].actual.reps,
      ),
      99,
    );
    assert.equal(
      await page.evaluate(() => localStorage.getItem("ascend.sessions.v1")),
      raw,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await row("pr-push-up-reps").scrollIntoViewIfNeeded();
    await noOverflow();
    await page.screenshot({ path: "/tmp/ascend-pr-390.png" });
    // A malformed store must show a retryable error, not fabricate an empty history.
    await page.evaluate(() =>
      localStorage.setItem("ascend.sessions.v1", "broken records"),
    );
    await page.goto(url);
    await tab("PLAYER");
    await page
      .getByRole("button", { name: "RETRY RECORDS", exact: true })
      .waitFor();
    assert.equal(await page.getByText(/Your records start here/).count(), 0);
    assert.equal(
      await page.evaluate(() => localStorage.getItem("ascend.sessions.v1")),
      "broken records",
    );
    await page.evaluate(
      (raw) => localStorage.setItem("ascend.sessions.v1", raw),
      raw,
    );
    await click("RETRY RECORDS");
    await value("pr-push-up-reps", "13 reps");
    await noOverflow();
    assert.deepEqual(errors, []);
    console.log(
      "PASS: PR empty/baseline isolation, reps/time/weight details, unconfirmed exclusion, active confirmation/tab updates, reload, final completion, template deletion, profile/history preservation, storage error/retry, 320/390px and no browser errors.",
    );
  } finally {
    await browser.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
