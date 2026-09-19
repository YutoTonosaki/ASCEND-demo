// Optional QA: isolated Playwright via NODE_PATH; serve the production web export.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    const url = process.env.ASCEND_QA_URL || "http://127.0.0.1:8098";
    const button = (name) => page.getByRole("button", { name, exact: true });
    const click = (name) => button(name).click();
    const input = (name) => page.getByRole("textbox", { name, exact: true });
    const data = () =>
      page.evaluate(() =>
        JSON.parse(localStorage.getItem("ascend.training.v1")),
      );
    async function reloadTrain() {
      await page.goto(url);
      await page.getByRole("tab", { name: "TRAIN", exact: true }).click();
    }
    await reloadTrain();
    await click("MY EXERCISES · 0");
    await click("+ CREATE CUSTOM EXERCISE");
    await input("EXERCISE NAME").fill("Audit movement");
    await click("Weight + Reps");
    await click("SAVE EXERCISE");
    await button("EDIT · Audit movement").waitFor();
    const exerciseId = (await data()).customExercises[0].id;
    await click("EDIT · Audit movement");
    await input("EXERCISE NAME").fill("Audit lift");
    await click("Dumbbell");
    await click("Bench");
    await click("Bodyweight");
    await click("SAVE EXERCISE");
    await button("EDIT · Audit lift").waitFor();
    await reloadTrain();
    await click("MY EXERCISES · 1");
    await button("EDIT · Audit lift").waitFor();
    assert.equal((await data()).customExercises[0].id, exerciseId);
    assert.deepEqual((await data()).customExercises[0].equipment, [
      "Dumbbell",
      "Bench",
    ]);
    await click("BACK");
    await click("CREATE WORKOUT");
    await input("WORKOUT NAME").fill("Audit workout");
    await click("+ ADD EXERCISE");
    await input("SEARCH EXERCISES").fill("Audit lift");
    await button("Add Audit lift").last().click();
    await input("Audit lift kg").fill("52.5");
    await click("EDIT DETAILS · Audit lift");
    await click("Decrease Audit lift set 2 reps");
    await click("Increase Audit lift rest seconds");
    await click("SAVE WORKOUT");
    await button("EDIT WORKOUT").waitFor();
    const original = (await data()).workouts[0];
    assert.equal(original.exercises[0].sets[1].reps, 11);
    assert.equal(original.exercises[0].sets[0].weightKg, 52.5);
    assert.equal(original.exercises[0].restSeconds, 105);
    await reloadTrain();
    await click("SAVED WORKOUTS · 1");
    await click("VIEW · Audit workout");
    assert.deepEqual((await data()).workouts[0], original);
    await click("EDIT WORKOUT");
    await input("WORKOUT NAME").fill("Updated workout");
    await click("SAVE WORKOUT");
    await button("EDIT WORKOUT").waitFor();
    await reloadTrain();
    await click("SAVED WORKOUTS · 1");
    await click("VIEW · Updated workout");
    const edited = (await data()).workouts[0];
    assert.equal(edited.id, original.id);
    assert.equal(edited.createdAt, original.createdAt);
    assert.deepEqual(edited.exercises, original.exercises);
    await click("DUPLICATE WORKOUT");
    await page.getByText("Workout duplicated.", { exact: true }).waitFor();
    const duplicated = (await data()).workouts[0];
    assert.notEqual(duplicated.id, original.id);
    assert.notEqual(
      duplicated.exercises[0].sets[0].id,
      original.exercises[0].sets[0].id,
    );
    await click("EDIT WORKOUT");
    await input("WORKOUT NAME").fill("Changed copy");
    await click("Increase Audit lift kg");
    await click("SAVE WORKOUT");
    await button("EDIT WORKOUT").waitFor();
    await reloadTrain();
    await click("SAVED WORKOUTS · 2");
    await click("VIEW · Changed copy");
    assert.deepEqual(
      (await data()).workouts.find((w) => w.id === original.id),
      edited,
    );
    await click("DELETE WORKOUT");
    await click("CONFIRM");
    await button("VIEW · Updated workout").waitFor();
    await reloadTrain();
    await click("MY EXERCISES · 1");
    assert.equal((await data()).workouts.length, 1);
    await click("DELETE · Audit lift");
    await click("CONFIRM");
    await page.getByText(/before deleting it/).waitFor();
    await click("EDIT · Audit lift");
    await click("Time");
    await click("SAVE EXERCISE");
    await page.getByText(/before changing its tracking type/).waitFor();
    await click("CANCEL");
    await click("EDIT · Audit lift");
    await input("EXERCISE NAME").fill("Renamed lift");
    await click("SAVE EXERCISE");
    await button("EDIT · Renamed lift").waitFor();
    await reloadTrain();
    await click("SAVED WORKOUTS · 1");
    await click("VIEW · Updated workout");
    await page.getByText("1. Renamed lift", { exact: true }).waitFor();
    assert.deepEqual((await data()).workouts[0].exercises, original.exercises);
    await click("DELETE WORKOUT");
    await click("CONFIRM");
    await button("+ CREATE WORKOUT").waitFor();
    await reloadTrain();
    await click("MY EXERCISES · 1");
    await click("DELETE · Renamed lift");
    await click("CONFIRM");
    await page.getByText("Exercise deleted.", { exact: true }).waitFor();
    await reloadTrain();
    await button("SAVED WORKOUTS · 0").waitFor();
    await button("MY EXERCISES · 0").waitFor();
    assert.deepEqual(errors, []);
    console.log(
      "PASS: custom create/edit/reload; workout targets/rest/reload; edit identity; independent duplicate; confirmed delete/reload; referenced custom delete/type protection and rename; no browser errors.",
    );
  } finally {
    await browser.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
