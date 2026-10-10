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
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 320, height: 844 },
        reducedMotion: "reduce",
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.setDefaultTimeout(45000);
    const url = process.env.ASCEND_QA_URL;
    await page.goto(url);
    await page.getByRole("tab", { name: "HOME", exact: true }).waitFor();
    const base = standardExercises.find((e) => e.id === "decline-push-up");
    const library = [
      { ...base, name: "Decline Push-Up" },
      ...["Demo", "Demo2", "Demo4", "Demo6", "Bicycle Crunch"].map(
        (name, i) => ({
          ...base,
          id: `custom-polish-${i}`,
          name,
          isCustom: true,
          difficulty: null,
          progressionFamily: null,
        }),
      ),
    ];
    const plan = {
      ...newWorkout(),
      name: "Localization evidence",
      exercises: library.map((e) => {
        const entry = newEntry(e);
        return { ...entry, restSeconds: 0, sets: entry.sets.slice(0, 1) };
      }),
    };
    let session = startSession(plan, library, "2026-09-26T12:00:00.000Z");
    for (let i = 0; i < library.length; i++)
      session = confirmSet(
        session,
        position(session).set.id,
        { type: "reps", reps: 12 },
        new Date(Date.parse(session.startedAt) + (i + 1) * 1000).toISOString(),
      );
    await page.evaluate((s) => {
      localStorage.setItem(
        "ascend.sessions.v1",
        JSON.stringify({ version: 1, active: null, completed: [s] }),
      );
      localStorage.setItem(
        "ascend.settings.v1",
        JSON.stringify({ version: 1, settings: { locale: "ja" } }),
      );
    }, session);
    await page.goto(url);
    await page.getByRole("tab", { name: "ホーム", exact: true }).waitFor();
    const raw = () =>
      page.evaluate(() =>
        Object.fromEntries(
          Object.entries(localStorage).filter(([k]) => k.startsWith("ascend.")),
        ),
      );
    const before = await raw();
    for (const name of ["回復中", "一部回復中", "トレーニング可能"])
      await page.getByText(name, { exact: true }).first().waitFor();
    await page.getByText("回復状況", { exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: "/tmp/ascend-polish-recovery.png" });
    await page.getByRole("tab", { name: "プレイヤー", exact: true }).click();
    await page.getByText("デクラインプッシュアップ", { exact: true }).waitFor();
    for (const name of ["Demo", "Demo2", "Demo4", "Demo6", "Bicycle Crunch"])
      await page.getByText(name, { exact: true }).waitFor();
    await page
      .getByText("デクラインプッシュアップ", { exact: true })
      .scrollIntoViewIfNeeded();
    await page.screenshot({ path: "/tmp/ascend-polish-pr.png" });
    await page.getByRole("tab", { name: "トレーニング", exact: true }).click();
    await page
      .getByRole("button", { name: "ワークアウト履歴", exact: true })
      .click();
    await page.getByText("6種目・6セット・完了", { exact: true }).waitFor();
    await page
      .getByRole("button", {
        name: "記録を見る · Localization evidence",
        exact: true,
      })
      .click();
    await page
      .getByRole("heading", { name: "デクラインプッシュアップ", exact: true })
      .waitFor();
    await page.getByRole("heading", { name: "Demo6", exact: true }).waitFor();
    assert.deepEqual(await raw(), before);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: recovery statuses, legacy built-in alias in PR/history, custom names preserved, Japanese history counts, unchanged storage, 320px and no page exceptions.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
