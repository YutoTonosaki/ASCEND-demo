// Optional isolated Playwright; run against an Expo production web export.
require("./register.cjs");
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { standardExercises } = require("../src/data/exercises.ts");
const {
  newWorkout,
  newEntry,
  copyExercise,
} = require("../src/training/plans.ts");
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
    const url = process.env.ASCEND_QA_URL || "http://127.0.0.1:8099";
    const click = (name) =>
      page.getByRole("button", { name, exact: true }).click();
    const input = (name) => page.getByRole("textbox", { name, exact: true });
    const train = () =>
      page.getByRole("tab", { name: "TRAIN", exact: true }).click();
    const state = () =>
      page.evaluate(() =>
        JSON.parse(localStorage.getItem("ascend.sessions.v1")),
      );
    const noOverflow = async () =>
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
    const custom = {
      ...copyExercise(standardExercises[0]),
      id: "custom-session-qa",
      name: "Demo4",
      isCustom: true,
      difficulty: null,
      progressionFamily: null,
    };
    const exercises = [
      custom,
      standardExercises.find((e) => e.id === "bench-press"),
      standardExercises.find((e) => e.id === "plank"),
    ];
    const plan = {
      ...newWorkout(),
      name: "Live mixed",
      exercises: exercises.map((exercise, index) => {
        const entry = newEntry(exercise);
        entry.sets = entry.sets.slice(0, index === 0 ? 2 : 1);
        entry.restSeconds = index === 0 ? 3 : 0;
        if (index === 1)
          entry.sets[0] = { ...entry.sets[0], weightKg: 50, reps: 8 };
        return entry;
      }),
    };
    await page.goto(url);
    await page.evaluate(
      (data) =>
        localStorage.setItem("ascend.training.v1", JSON.stringify(data)),
      {
        version: 1,
        customExercises: [custom],
        recentExerciseIds: [],
        workouts: [plan],
      },
    );
    await page.goto(url);
    await train();
    await click("SAVED WORKOUTS · 1");
    await click("VIEW · Live mixed");
    await click("START WORKOUT");
    await input("Actual reps").waitFor();
    let saved = await state();
    const sid = saved.active.id;
    assert.equal(saved.active.exercises[0].sets[0].result, null);
    await input("Actual reps").fill("10");
    await noOverflow();
    await click("COMPLETE SET");
    await page.getByText("REST", { exact: true }).waitFor();
    await noOverflow();
    await page.screenshot({ path: "/tmp/ascend-rest-320.png" });
    saved = await state();
    assert.equal(saved.active.exercises[0].sets[0].target.reps, 12);
    assert.equal(saved.active.exercises[0].sets[0].result.actual.reps, 10);
    await click("SKIP REST");
    await input("Actual reps").waitFor();
    await input("Actual reps").fill("0");
    await page.waitForTimeout(650);
    await click("COMPLETE SET");
    await page.getByText("REST", { exact: true }).waitFor();
    // Resume persisted rest after a full reload; allow timestamp expiry to advance.
    await page.goto(url);
    await train();
    await click("RESUME WORKOUT");
    await input("Actual weight kg").waitFor({ timeout: 15000 });
    assert.equal(await input("Actual reps").inputValue(), "8");
    assert.equal(await input("Actual weight kg").inputValue(), "50");
    await input("Actual weight kg").fill("52.5");
    await page.screenshot({ path: "/tmp/ascend-weight-320.png" });
    await input("Actual reps").fill("7");
    await noOverflow();
    await click("COMPLETE SET");
    await input("Actual seconds").waitFor();
    await page.getByRole("tab", { name: "PLAYER", exact: true }).click();
    await train();
    assert.equal(await input("Actual seconds").inputValue(), "45");
    await input("Actual seconds").fill("42");
    await page.waitForTimeout(650);
    await click("COMPLETE SET");
    await page.getByText("WORKOUT COMPLETE.", { exact: true }).waitFor();
    await page.screenshot({ path: "/tmp/ascend-complete-320.png" });
    await noOverflow();
    saved = await state();
    assert.equal(saved.active, null);
    assert.equal(saved.completed.length, 1);
    assert.equal(saved.completed[0].id, sid);
    assert.equal(saved.completed[0].exercises[0].sets[1].result.actual.reps, 0);
    assert.deepEqual(saved.completed[0].exercises[1].sets[0].result.actual, {
      type: "weight_reps",
      reps: 7,
      weightKg: 52.5,
    });
    assert.equal(
      saved.completed[0].exercises[2].sets[0].result.actual.seconds,
      42,
    );
    const evidence = JSON.stringify(saved.completed[0]);
    await click("FINISH");
    await click("SAVED WORKOUTS · 1");
    await click("VIEW · Live mixed");
    await click("EDIT WORKOUT");
    await input("Demo4 reps").fill("15");
    await click("SAVE WORKOUT");
    await click("BACK");
    await click("MY EXERCISES · 1");
    await click("EDIT · Demo4");
    await input("EXERCISE NAME").fill("Push Test");
    await click("SAVE EXERCISE");
    await click("BACK");
    await click("SAVED WORKOUTS · 1");
    await click("VIEW · Live mixed");
    await click("DELETE WORKOUT");
    await click("CONFIRM");
    await page.goto(url);
    await train();
    await click("WORKOUT HISTORY");
    await click("VIEW SESSION · Live mixed");
    await page.getByText("Demo4", { exact: true }).waitFor();
    await noOverflow();
    assert.equal(JSON.stringify((await state()).completed[0]), evidence);
    await click("FINISH");
    assert.equal((await state()).completed.length, 1);
    // A second session checks zero-rest double taps and unconfirmed reload inputs.
    const simple = {
      ...newWorkout(),
      name: "Double tap",
      exercises: [{ ...newEntry(standardExercises[0]), restSeconds: 0 }],
    };
    await page.evaluate((workout) => {
      const data = JSON.parse(localStorage.getItem("ascend.training.v1"));
      data.workouts.push(workout);
      localStorage.setItem("ascend.training.v1", JSON.stringify(data));
    }, simple);
    await page.goto(url);
    await train();
    await click("SAVED WORKOUTS · 1");
    await click("VIEW · Double tap");
    await click("START WORKOUT");
    await input("Actual reps").fill("9");
    await page.goto(url);
    await train();
    await click("RESUME WORKOUT");
    assert.equal(await input("Actual reps").inputValue(), "12");
    assert.equal((await state()).active.exercises[0].sets[0].result, null);
    await page
      .getByRole("button", { name: "COMPLETE SET", exact: true })
      .dblclick({ delay: 50 });
    await page.waitForTimeout(300);
    assert.equal(
      (await state()).active.exercises[0].sets.filter((s) => s.result !== null)
        .length,
      1,
    );
    await page.screenshot({ path: "/tmp/ascend-session-320.png" });
    // Template failures must not prevent independent session resume/history.
    const templateRaw = await page.evaluate(() =>
      localStorage.getItem("ascend.training.v1"),
    );
    await page.evaluate(() =>
      localStorage.setItem("ascend.training.v1", "damaged templates"),
    );
    await page.goto(url);
    await train();
    await click("RESUME WORKOUT");
    await input("Actual reps").waitFor();
    await click("BACK");
    await click("WORKOUT HISTORY");
    await click("VIEW SESSION · Live mixed");
    assert.equal(JSON.stringify((await state()).completed[0]), evidence);
    // Session recovery is explicit, backed up and isolated from templates.
    await page.evaluate((raw) => {
      localStorage.setItem("ascend.training.v1", raw);
      localStorage.setItem("ascend.sessions.v1", "damaged sessions");
    }, templateRaw);
    await page.goto(url);
    await train();
    await click("SAVED WORKOUTS · 1");
    await click("VIEW · Double tap");
    assert.ok(
      await page
        .getByRole("button", { name: "START WORKOUT", exact: true })
        .isDisabled(),
    );
    await click("RESET SESSION DATA");
    await click("CONFIRM");
    await page.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem("ascend.sessions.v1")).active === null,
    );
    assert.equal(
      await page.evaluate(() => localStorage.getItem("ascend.training.v1")),
      templateRaw,
    );
    assert.ok(
      await page.evaluate(() =>
        Object.keys(localStorage).some(
          (key) =>
            key.startsWith("ascend.sessions.v1.backup.") &&
            localStorage.getItem(key) === "damaged sessions",
        ),
      ),
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: 320px mixed reps/weight/time, explicit zero, skip/expired rest, tab/reload resume, unconfirmed input, double tap, completion/history, template edit/delete and custom rename isolation; independent storage failure/recovery; no overflow or browser errors.",
    );
  } finally {
    await browser.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
