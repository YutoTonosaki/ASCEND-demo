// Use the isolated Playwright installation; no app test dependency.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
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
    const url = process.env.ASCEND_QA_URL || "http://127.0.0.1:8102";
    const button = (name) => page.getByRole("button", { name, exact: true });
    const click = (name) => button(name).click();
    const input = (name) => page.getByRole("textbox", { name, exact: true });
    const train = () =>
      page.getByRole("tab", { name: "TRAIN", exact: true }).click();
    const stored = (key) =>
      page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
    const noOverflow = async () =>
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
    await page.goto(url);
    await train();
    await click("OPEN AI COACH");
    await click("SKIP FOR NOW");
    await input("WORKOUT NAME").waitFor();
    await click("BACK");
    assert.equal(await stored("ascend.coach.v1"), null);
    await click("OPEN AI COACH");
    await click("SET UP YOUR PROFILE");
    await input("HEIGHT CM · OPTIONAL").fill("bad");
    await click("NEXT · ENVIRONMENT");
    await page.getByRole("alert").waitFor();
    await input("HEIGHT CM · OPTIONAL").fill("");
    await click("NEXT · ENVIRONMENT");
    await input("Available minutes").fill("1");
    await input("Preferred exercise count").fill("1");
    await click("NEXT · OPTIONAL BASELINE");
    await click("ADD BASELINE · Push-up");
    await input("Push-up baseline").fill("8");
    await click("CONFIRM BASELINE · Push-up");
    await noOverflow();
    await click("SAVE TRAINING PROFILE");
    await click("GENERATE WORKOUT");
    await page.getByText("FROM YOUR BASELINE", { exact: true }).waitFor();
    await noOverflow();
    let profile = (await stored("ascend.coach.v1")).profile;
    assert.equal(profile.heightCm, null);
    assert.equal(profile.weightKg, null);
    assert.equal(profile.preferredDurationMinutes, 1);
    assert.equal(profile.baselineAssessments[0].actual.reps, 8);
    assert.equal(await stored("ascend.sessions.v1"), null);
    assert.equal(await stored("ascend.training.v1"), null);
    await page.screenshot({ path: "/tmp/ascend-coach-review-320.png" });
    await click("CUSTOMIZE WORKOUT");
    await input("WORKOUT NAME").fill("Coach completed");
    await input("Push-up reps").fill("7");
    await click("SAVE WORKOUT");
    assert.equal(await stored("ascend.sessions.v1"), null);
    await click("START WORKOUT");
    await input("Actual reps").fill("6");
    await click("COMPLETE SET");
    await page.getByText("WORKOUT COMPLETE.", { exact: true }).waitFor();
    const evidence = JSON.stringify(
      (await stored("ascend.sessions.v1")).completed,
    );
    await click("FINISH");
    await click("Settings");
    await click("Training profile");
    await input("HEIGHT CM · OPTIONAL").waitFor();
    await click("General fitness");
    await click("NEXT · ENVIRONMENT");
    await click("NEXT · OPTIONAL BASELINE");
    await click("SAVE TRAINING PROFILE");
    await page.goto(url);
    await train();
    await click("OPEN AI COACH");
    profile = (await stored("ascend.coach.v1")).profile;
    assert.equal(profile.primaryGoal, "fitness");
    assert.equal(profile.baselineAssessments[0].actual.reps, 8);
    assert.equal(
      JSON.stringify((await stored("ascend.sessions.v1")).completed),
      evidence,
    );
    await click("CUSTOMIZE TODAY");
    await click("Chest");
    await click("GENERATE WITH THESE CHOICES");
    await page.getByText("FROM COMPLETED TRAINING", { exact: true }).waitFor();
    await click("CUSTOMIZE TODAY");
    await click("Chest");
    await click("Back"); // Body area, unlike uppercase navigation BACK.
    await click("GENERATE WITH THESE CHOICES");
    await page.getByText("ADJUST YOUR PLAN", { exact: true }).waitFor();
    assert.equal((await stored("ascend.training.v1")).workouts.length, 1);
    await click("CUSTOMIZE TODAY");
    await click("Barbell");
    await click("Gym");
    await click("GENERATE WITH THESE CHOICES");
    await page.getByText("CHOOSE STARTING LOAD", { exact: true }).waitFor();
    assert.ok(await button("SAVE RECOMMENDATION").isDisabled());
    assert.ok(await button("CUSTOMIZE WORKOUT").isDisabled());
    await click("CONFIRM LOAD · Barbell Row");
    await page.getByRole("alert").waitFor();
    assert.ok(await button("SAVE RECOMMENDATION").isDisabled());
    await input("STARTING KG · Barbell Row").fill("12.5");
    await click("CONFIRM LOAD · Barbell Row");
    await noOverflow();
    await page.screenshot({ path: "/tmp/ascend-coach-load-320.png" });
    await click("SAVE RECOMMENDATION");
    assert.equal((await stored("ascend.training.v1")).workouts.length, 2);
    assert.deepEqual(
      (await stored("ascend.coach.v1")).profile.availableEquipment,
      ["Bodyweight"],
    );
    await click("START WORKOUT");
    assert.equal(await input("Actual weight kg").inputValue(), "12.5");
    assert.equal(
      JSON.stringify((await stored("ascend.sessions.v1")).completed),
      evidence,
    );
    // New profile failure must not damage plans/sessions; coach reset backs up raw data.
    const plans = await page.evaluate(() =>
      localStorage.getItem("ascend.training.v1"),
    );
    const sessions = await page.evaluate(() =>
      localStorage.getItem("ascend.sessions.v1"),
    );
    await page.evaluate(() =>
      localStorage.setItem("ascend.coach.v1", "damaged coach"),
    );
    await page.goto(url);
    await train();
    await click("OPEN AI COACH");
    await click("RESET COACH PROFILE");
    await click("CONFIRM");
    await button("SET UP YOUR PROFILE").waitFor();
    assert.equal(
      await page.evaluate(() => localStorage.getItem("ascend.training.v1")),
      plans,
    );
    assert.equal(
      await page.evaluate(() => localStorage.getItem("ascend.sessions.v1")),
      sessions,
    );
    assert.ok(
      await page.evaluate(() =>
        Object.keys(localStorage).some(
          (k) =>
            k.startsWith("ascend.coach.v1.backup.") &&
            localStorage.getItem(k) === "damaged coach",
        ),
      ),
    );
    await click("SET UP YOUR PROFILE");
    await click("NEXT · ENVIRONMENT");
    await click("NEXT · OPTIONAL BASELINE");
    await click("SKIP ALL BASELINES & SAVE");
    assert.deepEqual(
      (await stored("ascend.coach.v1")).profile.baselineAssessments,
      [],
    );
    await noOverflow();
    assert.deepEqual(errors, []);
    console.log(
      "PASS: 320px setup/skip, optional baseline, profile Settings/edit/reload, automatic/history and directed recommendations, constraints, unknown-load confirmation, Builder handoff/save/live completion, profile isolation and backed-up recovery; no overflow or browser errors.",
    );
  } finally {
    await browser.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
