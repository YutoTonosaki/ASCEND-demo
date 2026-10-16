require("./register.cjs");
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const D = require("../src/matches/domain.ts");
const E = require("../src/matches/evidence.ts");
const {
  MatchRepository,
  MATCHES_KEY,
} = require("../src/storage/match-repository.ts");
const {
  initializePlayer,
  reconcilePlayer,
} = require("../src/growth/domain.ts");
const { beginCareer } = require("../src/career/domain.ts");
const { standardExercises } = require("../src/data/exercises.ts");
const { newWorkout, newEntry } = require("../src/training/plans.ts");
const {
  startSession,
  confirmSet,
  position,
} = require("../src/sessions/domain.ts");
const {
  matchup,
  completedPresentation,
  reportModel,
} = require("../src/matches/presentation/model.ts");
const {
  CinematicController,
  STAGE_MS,
} = require("../src/matches/presentation/controller.ts");
const { playSaved } = require("../src/matches/presentation/play.ts");
const { historyAt } = require("../src/matches/history.ts");
const { applyMatchPayments } = require("../src/rewards/matches.ts");
const history = (...completed) => ({ version: 1, active: null, completed });
const start = "2026-10-06T12:00:00.000Z";
const unlock = "2026-10-12T00:00:00.000Z";
const expiry = "2026-10-19T00:00:00.000Z";
function owner() {
  return {
    player: initializePlayer("p", "2026-01-01T00:00:00.000Z", null, history()),
    career: beginCareer("p", "tokyo-zenith", "2026-01-01T00:00:00.000Z").career,
  };
}
function fixture(outcome = "LOSS") {
  const o = owner();
  const data = D.generateCurrentMatch(
    { version: 1, matches: [] },
    o,
    null,
    start,
    "UTC",
    () => 0.5,
  );
  const sessions = [];
  const count = outcome === "WIN" ? 3 : outcome === "DRAW" ? 2 : 0;
  for (let i = 0; i < count; i++) {
    const at = `2026-10-${String(6 + i).padStart(2, "0")}T12:00:00.000Z`;
    const entry = newEntry(standardExercises.find((e) => e.id === "push-up"));
    let session = startSession(
      {
        ...newWorkout(),
        name: "Resolution QA",
        exercises: [{ ...entry, restSeconds: 0, sets: entry.sets.slice(0, 1) }],
      },
      standardExercises,
      at,
    );
    session = confirmSet(
      session,
      position(session).set.id,
      { type: "reps", reps: 10 },
      at,
    );
    sessions.push(session);
  }
  o.player = reconcilePlayer(o.player, history(...sessions), unlock);
  const m = data.matches[0];
  m.rival.condition = outcome === "DRAW" ? 6 : 7;
  m.weekEnd = E.reconstructWeekEnd(
    o.player,
    history(...sessions),
    m.week,
    3,
    unlock,
  ).snapshot;
  return {
    o,
    data: D.parseMatches(JSON.stringify(data)),
    sessions: history(...sessions),
    id: m.id,
  };
}
(async () => {
  const browser = await chromium.launch();
  try {
    for (const scenario of [
      "WIN",
      "DRAW",
      "LOSS",
      "skip-vs",
      "skip-simulation",
      "skip-reveal",
      "reduce",
      "background",
      "lost-ack",
      "failure",
      "ja",
      "interruption",
      "navigation",
      "reward-error",
    ].filter(
      (s) =>
        !process.env.ASCEND_QA_SCENARIO || s === process.env.ASCEND_QA_SCENARIO,
    )) {
      const outcome = ["WIN", "DRAW", "LOSS"].includes(scenario)
        ? scenario
        : "LOSS";
      const f = fixture(outcome);
      const seed = {
        "ascend.player.v1": JSON.stringify({ version: 1, player: f.o.player }),
        "ascend.career.v1": JSON.stringify({ version: 1, career: f.o.career }),
        "ascend.sessions.v1": JSON.stringify(f.sessions),
        "ascend.matches.v1": JSON.stringify(f.data),
        ...(scenario === "ja"
          ? {
              "ascend.settings.v1": JSON.stringify({
                version: 1,
                settings: { locale: "ja" },
              }),
            }
          : {}),
      };
      const ja = scenario === "ja";
      const page = await browser.newPage({
        viewport: { width: 320, height: 844 },
        timezoneId: "UTC",
        reducedMotion: scenario === "reduce" ? "reduce" : "no-preference",
      });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.setDefaultTimeout(30000);
      await page.clock.install({ time: new Date("2026-10-12T12:00:00.000Z") });
      await page.addInitScript((values) => {
        if (!localStorage.getItem("qa-cinematic")) {
          for (const [k, v] of Object.entries(values))
            localStorage.setItem(k, v);
          localStorage.setItem("qa-cinematic", "1");
        }
      }, seed);
      const url = process.env.ASCEND_QA_URL;
      assert.ok(url);
      const raw = () =>
        page.evaluate(() =>
          Object.fromEntries(
            Object.entries(localStorage).filter(([k]) =>
              k.startsWith("ascend."),
            ),
          ),
        );
      await page.goto(url);
      await page.getByTestId("home-card-tier").waitFor();
      await page
        .getByRole("tab", { name: ja ? "キャリア" : "CAREER", exact: true })
        .click();
      await page
        .getByRole("button", {
          name: ja ? "マッチ開始" : "PLAY MATCH",
          exact: true,
        })
        .click();
      const surface = page.getByTestId("match-experience");
      await surface.waitFor();
      const before = await raw();
      assert.equal(
        D.parseMatches(before["ascend.matches.v1"]).matches[0].result,
        null,
      );
      await page.screenshot({ path: "/tmp/ascend-cinematic-pre-320.png" });
      if (["lost-ack", "failure", "reward-error"].includes(scenario))
        await page.evaluate((mode) => {
          window.qaSet = Storage.prototype.setItem;
          Storage.prototype.setItem = function (k, v) {
            if (
              k ===
              (mode === "reward-error"
                ? "ascend.rewards.v1"
                : "ascend.matches.v1")
            ) {
              if (mode === "lost-ack") window.qaSet.call(this, k, v);
              throw Error("isolated Match write");
            }
            return window.qaSet.call(this, k, v);
          };
        }, scenario);
      await surface
        .getByRole("button", {
          name: ja ? "マッチを開始する" : "CONFIRM PLAY MATCH",
          exact: true,
        })
        .click();
      if (scenario === "failure") {
        await surface.getByText(/Match could not start/).waitFor();
        assert.equal(await surface.getByTestId("cinematic-vs").count(), 0);
        assert.equal(
          (await raw())["ascend.matches.v1"],
          before["ascend.matches.v1"],
        );
        await page.evaluate(() => (Storage.prototype.setItem = window.qaSet));
        await surface
          .getByRole("button", { name: "RETRY", exact: true })
          .click();
        await surface
          .getByRole("button", { name: "CONFIRM PLAY MATCH", exact: true })
          .click();
      }
      if (scenario !== "reduce") {
        await surface.getByTestId("cinematic-vs").waitFor();
        const persisted = D.parseMatches((await raw())["ascend.matches.v1"])
          .matches[0];
        assert.equal(persisted.result.outcome, outcome);
        if (["interruption", "navigation"].includes(scenario)) {
          await page.waitForFunction(() =>
            JSON.parse(
              localStorage.getItem("ascend.rewards.v1") || "null",
            )?.transactions.some((t) => t.type === "match-result"),
          );
          const durable = await raw();
          if (scenario === "navigation") {
            await page
              .getByRole("tab", { name: "HOME", exact: true })
              .evaluate((el) => el.click());
            await surface.waitFor({ state: "detached" });
          }
          await page.goto(url);
          await page.getByTestId("home-card-tier").waitFor();
          await page.getByRole("tab", { name: "CAREER", exact: true }).click();
          assert.equal(await page.getByTestId("match-experience").count(), 0);
          assert.deepEqual(await raw(), durable);
          assert.deepEqual(errors, []);
          await page.close();
          console.log(`cinematic ${scenario} passed`);
          continue;
        }
        if (
          scenario === "skip-vs" ||
          scenario === "ja" ||
          scenario === "reward-error"
        )
          await surface
            .getByRole("button", {
              name: ja ? "スキップ" : "SKIP",
              exact: true,
            })
            .click();
        else if (scenario === "background") {
          await page.evaluate(() => {
            Object.defineProperty(document, "visibilityState", {
              configurable: true,
              value: "hidden",
            });
            document.dispatchEvent(new Event("visibilitychange"));
          });
          await page.evaluate(() => {
            Object.defineProperty(document, "visibilityState", {
              configurable: true,
              value: "visible",
            });
            document.dispatchEvent(new Event("visibilitychange"));
          });
        } else {
          await page.clock.runFor(2100);
          await surface.getByTestId("cinematic-simulation").waitFor();
          if (scenario === "WIN")
            await page.screenshot({
              path: "/tmp/ascend-cinematic-simulation-320.png",
            });
          if (scenario === "skip-simulation")
            await surface
              .getByRole("button", { name: "SKIP", exact: true })
              .click();
          else {
            await page.clock.runFor(8000);
            await surface.getByTestId("cinematic-reveal").waitFor();
            if (scenario === "skip-reveal")
              await surface
                .getByRole("button", { name: "SKIP", exact: true })
                .click();
            else await page.clock.runFor(2100);
          }
        }
      }
      await surface.getByTestId("cinematic-report").waitFor();
      if (scenario === "reward-error") {
        await surface
          .getByText("Payment status unavailable", { exact: true })
          .waitFor();
        await page.evaluate(() => {
          Storage.prototype.setItem = window.qaSet;
          Object.defineProperty(document, "visibilityState", {
            configurable: true,
            value: "hidden",
          });
          document.dispatchEvent(new Event("visibilitychange"));
          Object.defineProperty(document, "visibilityState", {
            configurable: true,
            value: "visible",
          });
          document.dispatchEvent(new Event("visibilitychange"));
        });
      }

      await page.waitForFunction((expected) => {
        const r = JSON.parse(
          localStorage.getItem("ascend.rewards.v1") || "null",
        );
        return r?.transactions.some(
          (t) => t.type === "match-result" && t.amount === expected,
        );
      }, { WIN: 25, DRAW: 15, LOSS: 10 }[outcome]);
      const saved = await raw();
      for (const [k, v] of Object.entries(before))
        if (!["ascend.matches.v1", "ascend.rewards.v1"].includes(k))
          assert.equal(saved[k], v);
      const protectedData = (values) =>
        Object.fromEntries(
          Object.entries(values).filter(
            ([key]) =>
              !["ascend.matches.v1", "ascend.rewards.v1"].includes(key),
          ),
        );
      assert.deepEqual(protectedData(saved), protectedData(before));
      assert.equal(
        JSON.parse(saved["ascend.rewards.v1"]).transactions.filter(
          (t) => t.type === "match-result",
        ).length,
        1,
      );
      if (scenario === "ja") {
        await surface.evaluate((root) => {
          for (const el of root.querySelectorAll("*")) {
            if (
              [...el.childNodes].some(
                (n) => n.nodeType === 3 && n.textContent.trim(),
              )
            ) {
              const c = getComputedStyle(el);
              const line = parseFloat(c.lineHeight);
              if (Number.isFinite(line))
                el.style.lineHeight = `${line * 1.5}px`;
              el.style.fontSize = `${parseFloat(c.fontSize) * 1.5}px`;
            }
          }
        });
        await page.screenshot({
          path: "/tmp/ascend-cinematic-ja-large.png",
          fullPage: true,
        });
      }
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await surface
        .getByRole("button", {
          name: ja ? "キャリアに戻る" : "RETURN TO CAREER",
          exact: true,
        })
        .click();
      await page.goto(url);
      await page.getByTestId("home-card-tier").waitFor();
      await page
        .getByRole("tab", { name: ja ? "キャリア" : "CAREER", exact: true })
        .click();
      assert.equal(await page.getByTestId("match-experience").count(), 0);
      assert.deepEqual(await raw(), saved);
      assert.deepEqual(errors, []);
      await page.close();
      console.log(`cinematic ${scenario} passed`);
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
