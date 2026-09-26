require("./register.cjs");
const { chromium } = require("playwright"),
  assert = require("node:assert/strict");
const { standardExercises } = require("../src/data/exercises.ts");
const { newWorkout, newEntry } = require("../src/training/plans.ts");
const {
  startSession,
  confirmSet,
  position,
} = require("../src/sessions/domain.ts");
const {
  initializePlayer,
  reconcilePlayer,
} = require("../src/growth/domain.ts");
const { defaultProfile } = require("../src/coach/profile.ts");
const { ratingUp } = require("../src/presentation/domain.ts");
function fixture() {
  const base = Date.now() - 40 * 86400000,
    at = (d, n = 0) => new Date(base + d * 86400000 + n * 1000).toISOString();
  const profile = defaultProfile(at(0));
  profile.baselineAssessments = ["push-up", "squat"].map((id) => ({
    exercise: standardExercises.find((e) => e.id === id),
    actual: { type: "reps", reps: 8 },
    source: "known",
    recordedAt: at(0),
  }));
  let data = { version: 1, active: null, completed: [] },
    p = initializePlayer("presentation-player", at(0), profile, data);
  for (let d = 1; d < 35; d++) {
    const reps = 10 + d * 3,
      plan = {
        ...newWorkout(),
        name: "Presentation QA",
        exercises: ["push-up", "squat"].map((id) => {
          const e = newEntry(standardExercises.find((x) => x.id === id));
          return {
            ...e,
            restSeconds: 0,
            sets: [{ ...e.sets[0], type: "reps", reps }],
          };
        }),
      };
    const active = startSession(plan, standardExercises, at(d));
    let done = active;
    for (let i = 0; i < 2; i++)
      done = confirmSet(
        done,
        position(done).set.id,
        { type: "reps", reps },
        at(d, i + 1),
      );
    const nextData = {
        version: 1,
        active: null,
        completed: [...data.completed, done],
      },
      next = reconcilePlayer(p, nextData, at(d, 10));
    let liveDone = active;
    for (let i = 0; i < 2; i++)
      liveDone = confirmSet(
        liveDone,
        position(liveDone).set.id,
        { type: "reps", reps },
        new Date(Date.now() - 2000 + i * 1000).toISOString(),
      );
    const liveNext = reconcilePlayer(
        p,
        { ...data, completed: [...data.completed, liveDone] },
        new Date().toISOString(),
      ),
      expected = ratingUp(liveNext, liveDone.id);
    if (expected)
      return {
        sessions: { ...data, active },
        player: { version: 1, player: p },
        expected,
      };
    data = nextData;
    p = next;
  }
  throw Error("No fixture crossing");
}
(async () => {
  const b = await chromium.launch();
  try {
    const page = await b.newPage({
        viewport: { width: 320, height: 844 },
        reducedMotion: "reduce",
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.setDefaultTimeout(30000);
    const url = process.env.ASCEND_QA_URL || "http://127.0.0.1:8120",
      click = (n) => page.getByRole("button", { name: n, exact: true }).click(),
      tab = (n) => page.getByRole("tab", { name: n, exact: true }).click();
    await page.goto(url);
    const f = fixture();
    await page.evaluate((f) => {
      localStorage.setItem("ascend.sessions.v1", JSON.stringify(f.sessions));
      localStorage.setItem("ascend.player.v1", JSON.stringify(f.player));
    }, f);
    await page.reload();
    await tab("TRAIN");
    await click("RESUME WORKOUT");
    await click("COMPLETE SET");
    await page.waitForTimeout(700);
    await click("COMPLETE SET");
    await page.getByRole("button", { name: "CONTINUE", exact: true }).waitFor();
    for (const a of f.expected.areas)
      await page
        .getByText(`${a.before} → ${a.after}`, { exact: true })
        .first()
        .waitFor();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({ path: "/tmp/ascend-rating-up-320.png" });
    const saved = await page.evaluate(() => ({
      player: localStorage.getItem("ascend.player.v1"),
      sessions: localStorage.getItem("ascend.sessions.v1"),
      seen: localStorage.getItem("ascend.presentation.v1"),
    }));
    assert.ok(JSON.parse(saved.seen).consumed.includes(f.expected.identity));
    await click("CONTINUE");
    await click("FINISH");
    await tab("PLAYER");
    await tab("TRAIN");
    await click("WORKOUT HISTORY");
    assert.equal(
      await page.getByRole("button", { name: "CONTINUE", exact: true }).count(),
      0,
    );
    await page.goto(url);
    await tab("PLAYER");
    assert.equal(
      await page.getByRole("button", { name: "CONTINUE", exact: true }).count(),
      0,
    );
    assert.equal(
      await page.evaluate(() => localStorage.getItem("ascend.player.v1")),
      saved.player,
    );
    assert.equal(
      await page.evaluate(() => localStorage.getItem("ascend.sessions.v1")),
      saved.sessions,
    );
    assert.deepEqual(errors, []);
    const interrupted = await b.newPage({
      viewport: { width: 390, height: 844 },
    });
    await interrupted.goto(url);
    await interrupted.evaluate((f) => {
      localStorage.setItem("ascend.sessions.v1", JSON.stringify(f.sessions));
      localStorage.setItem("ascend.player.v1", JSON.stringify(f.player));
    }, f);
    await interrupted.reload();
    await interrupted.getByRole("tab", { name: "TRAIN", exact: true }).click();
    for (const name of ["RESUME WORKOUT", "COMPLETE SET", "COMPLETE SET"]) {
      await interrupted.getByRole("button", { name, exact: true }).click();
      await interrupted.waitForTimeout(700);
    }
    await interrupted
      .getByRole("button", { name: "CONTINUE", exact: true })
      .waitFor();
    await interrupted.screenshot({ path: "/tmp/ascend-rating-up-390.png" });
    const durable = await interrupted.evaluate(() =>
      localStorage.getItem("ascend.presentation.v1"),
    );
    await interrupted.goto(url);
    await interrupted.getByRole("tab", { name: "PLAYER", exact: true }).click();
    assert.equal(
      await interrupted
        .getByRole("button", { name: "CONTINUE", exact: true })
        .count(),
      0,
    );
    assert.equal(
      await interrupted.evaluate(() =>
        localStorage.getItem("ascend.presentation.v1"),
      ),
      durable,
    );
    await interrupted.close();
    console.log(
      "PASS: live completion/finalized presentation/mark-before-show/dismiss; 320/390px; reduced motion; history/restart unchanged evidence; interruption while visible never replays.",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
