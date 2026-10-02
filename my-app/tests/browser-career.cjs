require("./register.cjs");
const { chromium } = require("playwright"),
  assert = require("node:assert/strict");
const { initializePlayer } = require("../src/growth/domain.ts");
const { standardExercises } = require("../src/data/exercises.ts");
const { newWorkout, newEntry } = require("../src/training/plans.ts");
const {
  startSession,
  confirmSet,
  position,
} = require("../src/sessions/domain.ts");
const {
  applyReward,
  emptyRewards,
  captureReward,
} = require("../src/rewards/domain.ts");
const { clubs } = require("../src/config/clubs.ts");
const at = (n) => new Date(Date.now() - 86400000 + n * 1000).toISOString();
const ex = newEntry(standardExercises.find((x) => x.id === "push-up"));
let session = startSession(
  {
    ...newWorkout(),
    name: "Preserved workout",
    exercises: [{ ...ex, restSeconds: 0, sets: ex.sets.slice(0, 1) }],
  },
  standardExercises,
  at(0),
);
session = confirmSet(
  session,
  position(session).set.id,
  { type: "reps", reps: 12 },
  at(1),
);
const sessions = { version: 1, active: null, completed: [session] };
const player = {
  version: 1,
  player: initializePlayer("career-test-player", at(2), null, sessions),
};
const rewards = applyReward(
  emptyRewards(),
  captureReward(session, player.player.id),
);
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 320, height: 844 },
        reducedMotion: "reduce",
      }),
      errors = [];
    page.setDefaultTimeout(60000);
    page.on("pageerror", (e) => errors.push(e.message));
    const url = process.env.ASCEND_QA_URL,
      button = (n) => page.getByRole("button", { name: n, exact: true }),
      tab = (n) => page.getByRole("tab", { name: n, exact: true }).click();
    const raw = () =>
      page.evaluate(() =>
        Object.fromEntries(
          Object.entries(localStorage).filter(([k]) => k.startsWith("ascend.")),
        ),
      );
    const ready = async () => {
      await page.goto(url);
      await page
        .getByText(/\d+ Coins/)
        .first()
        .waitFor();
    };
    await ready();
    await tab("CAREER");
    await page.getByText("CAREER NOT STARTED", { exact: true }).waitFor();
    assert.equal(await button("START CAREER").count(), 0);
    await button("OPEN PLAYER").waitFor();
    assert.equal((await raw())["ascend.career.v1"], undefined);
    await page.evaluate(
      ({ player, sessions, rewards }) => {
        localStorage.setItem("ascend.player.v1", JSON.stringify(player));
        localStorage.setItem("ascend.sessions.v1", JSON.stringify(sessions));
        localStorage.setItem("ascend.rewards.v1", JSON.stringify(rewards));
      },
      { player, sessions, rewards },
    );
    await ready();
    await page.getByText("10 Coins", { exact: true }).waitFor();
    const before = await raw();
    await tab("CAREER");
    await button("START CAREER").click();
    for (const name of ["TOKYO ZENITH", "OSAKA FORGE", "YOKOHAMA NOVA"])
      await button(`INSPECT ${name}`).waitFor();
    await button("INSPECT OSAKA FORGE").click();
    await page
      .getByText("Recommended OVR 50 · Informational only", { exact: true })
      .waitFor();
    assert.deepEqual(await raw(), before);
    await button("BACK TO CLUBS").click();
    assert.deepEqual(await raw(), before);
    await button("INSPECT TOKYO ZENITH").click();
    await page.evaluate(() => {
      window.originalWrite = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        if (k === "ascend.career.v1") throw Error("QA Career failure");
        return window.originalWrite.call(this, k, v);
      };
    });
    await button("JOIN CLUB").click();
    await page.getByText("CAREER UNAVAILABLE", { exact: true }).waitFor();
    assert.deepEqual(await raw(), before);
    await page.evaluate(
      () => (Storage.prototype.setItem = window.originalWrite),
    );
    await button("RETRY CAREER").click();
    await button("JOIN CLUB").waitFor();
    await button("JOIN CLUB").dblclick();
    await page.getByTestId("current-club").waitFor();
    assert.equal(
      await page.getByTestId("current-club").innerText(),
      "Tokyo Zenith",
    );
    const after = await raw(),
      career = JSON.parse(after["ascend.career.v1"]);
    assert.equal(career.career.clubHistory.length, 1);
    assert.equal(career.career.playerId, player.player.id);
    assert.deepEqual(
      Object.fromEntries(
        Object.entries(after).filter(([k]) => k !== "ascend.career.v1"),
      ),
      before,
    );
    assert.equal(await button("START CAREER").count(), 0);
    await button("CLUB DETAILS").click();
    await page
      .getByText(clubs["tokyo-zenith"].description, { exact: true })
      .waitFor();
    await page.screenshot({ path: "/tmp/ascend-career-active-320.png" });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await tab("HOME");
    await page
      .getByLabel("Tokyo Zenith, Japan", { exact: true })
      .first()
      .waitFor();
    await page.getByText("10 Coins", { exact: true }).first().waitFor();
    const weekly = await page.getByTestId("weekly-training").innerText();
    await tab("PLAYER");
    await page
      .getByTestId("player-card")
      .getByLabel("Tokyo Zenith, Japan", { exact: true })
      .waitFor();
    await page
      .getByTestId("player-card")
      .getByText("45", { exact: true })
      .first()
      .waitFor();
    await page.getByText("Push-up", { exact: true }).first().waitFor();
    assert.deepEqual(await raw(), after);
    await tab("TRAIN");
    await button("WORKOUT HISTORY").click();
    await page
      .getByText("Preserved workout", { exact: true })
      .first()
      .waitFor();
    assert.deepEqual(await raw(), after);
    await ready();
    assert.equal(await page.getByTestId("weekly-training").innerText(), weekly);
    await tab("CAREER");
    await page.getByTestId("current-club").waitFor();
    assert.equal(await button("START CAREER").count(), 0);
    assert.deepEqual(await raw(), after);
    await page.evaluate(() => {
      for (const n of document.querySelectorAll('[dir="auto"]')) {
        const v = parseFloat(getComputedStyle(n).fontSize);
        n.style.fontSize = `${v * 1.5}px`;
      }
    });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({ path: "/tmp/ascend-career-large-320.png" });
    for (const broken of [
      "broken",
      JSON.stringify({ version: 2, career: {} }),
    ]) {
      await page.evaluate(
        (b) => localStorage.setItem("ascend.career.v1", b),
        broken,
      );
      await ready();
      await tab("CAREER");
      await page.getByText("CAREER UNAVAILABLE", { exact: true }).waitFor();
      await button("RETRY CAREER").click();
      assert.equal((await raw())["ascend.career.v1"], broken);
      assert.equal(await button("START CAREER").count(), 0);
    }
    await page.evaluate(
      (s) => localStorage.setItem("ascend.career.v1", s),
      after["ascend.career.v1"],
    );
    await ready();
    await tab("CAREER");
    await page.getByTestId("current-club").waitFor();
    assert.deepEqual(await raw(), after);
    assert.deepEqual(errors, []);
    console.log(
      "PASS: not-started, 3 Japanese clubs, inspection without writes, explicit join/failure/retry/double-tap, no switching, HOME/PLAYER identity, unchanged PR/ratings/rewards/history, reload, corruption preservation, 320px/large text/reduced motion.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
