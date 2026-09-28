require("./register.cjs");
const { chromium } = require("playwright"),
  assert = require("node:assert/strict");
const {
  initializePlayer,
  setIdentity,
  assessmentValue,
} = require("../src/growth/domain.ts");
const { isPlayerData } = require("../src/growth/validation.ts");
const { standardExercises } = require("../src/data/exercises.ts");
const { newWorkout, newEntry } = require("../src/training/plans.ts");
const {
  startSession,
  confirmSet,
  position,
} = require("../src/sessions/domain.ts");
// Isolated synthetic ledger fixtures, validated by the unchanged repositories.
// These exercise rendering, not the already-tested growth balancing formula.
function fixture(target) {
  const base = Date.now() - 2000 * 86400000,
    at = (d) => new Date(base + d * 86400000).toISOString();
  let sessions = { version: 1, active: null, completed: [] },
    p = initializePlayer("card-qa", at(0), null, sessions),
    day = 1;
  const defs =
    target === 50
      ? [
          ["push-up", 20],
          ["pull-up", 5],
          ["overhead-press", 20],
          ["diamond-push-up", 15],
          ["plank", 40],
          ["squat", 25],
        ]
      : [
          ["push-up", 40],
          ["pull-up", 15],
          ["overhead-press", 100],
          ["diamond-push-up", 30],
          ["plank", 120],
          ["squat", 60],
        ];
  for (const [id, value] of defs) {
    const ex = standardExercises.find((e) => e.id === id);
    const entry = newEntry(ex);
    const plan = {
      ...newWorkout(),
      name: "Historical card QA",
      exercises: [{ ...entry, restSeconds: 0, sets: entry.sets.slice(0, 1) }],
    };
    let s = startSession(plan, standardExercises, at(day));
    const set = position(s).set;
    const actual =
      ex.trackingType === "time"
        ? { type: "time", seconds: value }
        : ex.trackingType === "weight_reps"
          ? { type: "weight_reps", weightKg: value, reps: 5 }
          : { type: "reps", reps: value };
    s = confirmSet(s, set.id, actual, at(day));
    const changes = ex.primaryBodyParts
      .filter((a) => p.status[a] === "provisional")
      .map((area) => ({
        area,
        before: p.ratings[area],
        after: assessmentValue(ex, actual),
      }));
    for (const c of changes) {
      p.ratings[c.area] = c.after;
      p.status[c.area] = "assessed";
    }
    const key = setIdentity(s.id, set.id);
    p.processedSetIds.push(key);
    p.finalizedSessionIds.push(s.id);
    p.events.push({
      id: key + ":assessment",
      kind: "assessment",
      sessionId: s.id,
      setId: set.id,
      exerciseId: id,
      at: at(day++),
      changes,
      allocation: {},
      metric: null,
      actual,
    });
    sessions.completed.push(s);
  }
  while (p.ratings.Chest < target) {
    const ex = standardExercises.find((e) => e.id === "push-up"),
      entry = newEntry(ex),
      plan = {
        ...newWorkout(),
        name: "Historical card QA",
        exercises: [{ ...entry, restSeconds: 0, sets: entry.sets.slice(0, 1) }],
      };
    let s = startSession(plan, standardExercises, at(day));
    const set = position(s).set,
      actual = { type: "reps", reps: day + 50 };
    s = confirmSet(s, set.id, actual, at(day));
    const next = Math.min(target, p.ratings.Chest + 0.04),
      changes = Object.keys(p.ratings).map((area) => ({
        area,
        before: p.ratings[area],
        after: next,
      })),
      key = setIdentity(s.id, set.id);
    for (const c of changes) p.ratings[c.area] = next;
    p.events.push({
      id: key + ":growth",
      kind: "growth",
      sessionId: s.id,
      setId: set.id,
      exerciseId: "push-up",
      at: at(day++),
      changes,
      allocation: Object.fromEntries(
        Object.keys(p.ratings).map((a) => [a, 1 / 6]),
      ),
      metric: {
        metric: "reps",
        previous: actual.reps - 1,
        value: actual.reps,
        outcome: "improved",
        relation: "higher",
      },
      actual,
    });
    p.processedSetIds.push(key);
    p.finalizedSessionIds.push(s.id);
    sessions.completed.push(s);
  }
  const player = { version: 1, player: p };
  assert.ok(isPlayerData(player));
  return { player, sessions };
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
    const url = process.env.ASCEND_QA_URL;
    await page.goto(url);
    for (const [ovr, tier] of [
      [50, "BRONZE"],
      [60, "SILVER"],
      [75, "GOLD"],
      [90, "PURPLE"],
      [99, "ASCEND"],
    ]) {
      const f = fixture(ovr);
      await page.evaluate((f) => {
        localStorage.setItem("ascend.player.v1", JSON.stringify(f.player));
        localStorage.setItem("ascend.sessions.v1", JSON.stringify(f.sessions));
      }, f);
      await page.goto(url);
      await page.getByTestId("home-card-tier").waitFor();
      assert.equal(await page.getByTestId("home-card-tier").innerText(), tier);
      await page.getByRole("tab", { name: "PLAYER", exact: true }).click();
      const card = page.getByTestId("player-card");
      await card.waitFor();
      assert.ok((await card.innerText()).includes(tier));
      if (ovr === 50)
        assert.ok((await card.innerText()).includes("HIGH FINISH"));
      assert.equal(
        await page.getByText("CARD FINISH PREVIEW", { exact: true }).count(),
        0,
      );
      assert.equal(await page.getByTestId("card-evolution").count(), 0);
      await card.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `/tmp/ascend-card-${ovr}.png` });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      assert.equal(
        await page.evaluate(() => localStorage.getItem("ascend.player.v1")),
        JSON.stringify(f.player),
      );
    }
    await page.evaluate(() => {
      const nodes = [
        ...document.querySelectorAll('[data-testid="player-card"] *'),
      ].filter((n) =>
        [...n.childNodes].some(
          (c) => c.nodeType === Node.TEXT_NODE && c.textContent.trim(),
        ),
      );
      const sizes = nodes.map((n) => ({
        n,
        size: parseFloat(getComputedStyle(n).fontSize),
        line: parseFloat(getComputedStyle(n).lineHeight),
      }));
      for (const { n, size, line } of sizes) {
        n.style.fontSize = `${size * 1.5}px`;
        n.style.lineHeight = Number.isFinite(line) ? `${line * 1.5}px` : "1.3";
      }
    });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({ path: "/tmp/ascend-card-large.png" });
    assert.equal(await page.evaluate(() => localStorage.getItem("ascend.rewards.v1")), null);
    assert.deepEqual(errors, []);
    const f = fixture(74.999),
      ex = standardExercises.find((e) => e.id === "push-up"),
      entry = newEntry(ex),
      plan = {
        ...newWorkout(),
        name: "Evolution QA",
        exercises: [
          {
            ...entry,
            restSeconds: 0,
            sets: [{ ...entry.sets[0], type: "reps", reps: 999 }],
          },
        ],
      };
    f.sessions.active = startSession(
      plan,
      standardExercises,
      new Date().toISOString(),
    );
    await page.evaluate((f) => {
      localStorage.clear();
      localStorage.setItem("ascend.player.v1", JSON.stringify(f.player));
      localStorage.setItem("ascend.sessions.v1", JSON.stringify(f.sessions));
    }, f);
    await page.goto(url);
    await page.getByRole("tab", { name: "TRAIN", exact: true }).click();
    await page
      .getByRole("button", { name: "RESUME WORKOUT", exact: true })
      .click();
    await page
      .getByRole("button", { name: "COMPLETE SET", exact: true })
      .click();
    await page.getByTestId("card-evolution").waitFor();
    const body = await page.locator("body").innerText();
    assert.ok(body.indexOf("OVR UP") < body.indexOf("CARD EVOLUTION"));
    assert.ok(body.includes("SILVER → GOLD"));
    await page.getByTestId("card-evolution").scrollIntoViewIfNeeded();
    await page.screenshot({ path: "/tmp/ascend-card-evolution.png" });
    const consumed = await page.evaluate(() =>
      localStorage.getItem("ascend.presentation.v1"),
    );
    assert.ok(consumed);
    const rewards = await page.evaluate(() =>
      localStorage.getItem("ascend.rewards.v1"),
    );
    assert.equal(
      JSON.parse(rewards).transactions.reduce((n, t) => n + t.amount, 0),
      10,
    );
    await page.goto(url);
    assert.equal(await page.getByTestId("card-evolution").count(), 0);
    assert.equal(
      await page.evaluate(() => localStorage.getItem("ascend.presentation.v1")),
      consumed,
    );
    assert.equal(
      await page.evaluate(() => localStorage.getItem("ascend.rewards.v1")),
      rewards,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: existing Silver/Gold/Purple/Ascend render immediately on Home/Player, no historical popup or preview, storage unchanged, 320px and large-text approximation.",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
