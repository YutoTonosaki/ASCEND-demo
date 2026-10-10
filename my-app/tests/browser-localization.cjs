require("./register.cjs");
const { chromium } = require("playwright"),
  assert = require("node:assert/strict");
const { initializePlayer } = require("../src/growth/domain.ts");
const { beginCareer } = require("../src/career/domain.ts");
const { startSeason, emptySeasons } = require("../src/seasons/domain.ts");
const { calendarContext } = require("../src/seasons/calendar.ts");
const { clubs } = require("../src/config/clubs.ts");
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
    const url = process.env.ASCEND_QA_URL,
      button = (n) => page.getByRole("button", { name: n, exact: true }),
      tab = (n) => page.getByRole("tab", { name: n, exact: true }).click();
    const raw = () =>
      page.evaluate(() =>
        Object.fromEntries(
          Object.entries(localStorage).filter(([k]) => k.startsWith("ascend.")),
        ),
      );
    const overflow = async () =>
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
    await page.goto(url);
    await page.getByText("0 Coins", { exact: true }).first().waitFor();
    assert.deepEqual(await raw(), {});
    const at = (n) => new Date(Date.now() - 86400000 + n * 1000).toISOString();
    const e = newEntry(standardExercises.find((e) => e.id === "push-up"));
    const plan = {
      ...newWorkout(),
      name: "My unchanged workout",
      exercises: [{ ...e, restSeconds: 0, sets: e.sets.slice(0, 1) }],
    };
    let session = startSession(plan, standardExercises, at(0));
    session = confirmSet(
      session,
      position(session).set.id,
      { type: "reps", reps: 12 },
      at(1),
    );
    const sessions = { version: 1, active: null, completed: [session] },
      player = {
        version: 1,
        player: initializePlayer("language-player", at(2), null, sessions),
      },
      career = beginCareer(player.player.id, "tokyo-zenith", at(3));
    const seasons = startSeason(
      emptySeasons(),
      career.career,
      player.player,
      clubs["tokyo-zenith"],
      calendarContext(new Date(at(4))),
    );
    const rewards = applyReward(
      emptyRewards(),
      captureReward(session, player.player.id),
    );
    const fixture = {
      "ascend.player.v1": player,
      "ascend.career.v1": career,
      "ascend.sessions.v1": sessions,
      "ascend.seasons.v1": seasons,
      "ascend.rewards.v1": rewards,
      "ascend.presentation.v1": { version: 1, consumed: [] },
      "ascend.training.v1": {
        version: 1,
        workouts: [plan],
        customExercises: [],
        recentExerciseIds: [],
      },
    };
    await page.evaluate((f) => {
      for (const [k, v] of Object.entries(f))
        localStorage.setItem(k, JSON.stringify(v));
    }, fixture);
    await page.goto(url);
    await page.getByText("10 Coins", { exact: true }).first().waitFor();
    const baseline = await raw();
    await page.evaluate(() => {
      window.writes = [];
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        window.writes.push(k);
        return set.call(this, k, v);
      };
    });
    async function language(from, to) {
      await button(from === "en" ? "Settings" : "設定")
        .first()
        .click();
      await button(from === "en" ? "Language" : "言語").click();
      await button(to === "ja" ? "日本語" : "English").click();
      await button(to === "ja" ? "設定を閉じる" : "Close settings").click();
    }
    await language("en", "ja");
    await page.getByText("10 コイン", { exact: true }).first().waitFor();
    assert.deepEqual(await page.evaluate(() => window.writes), [
      "ascend.settings.v1",
    ]);
    await tab("トレーニング");
    await button("ワークアウト作成").waitFor();
    await button("保存済みワークアウト · 1").click();
    await button("表示 · My unchanged workout").click();
    await page.getByText("1. 腕立て伏せ", { exact: true }).first().waitFor();
    await overflow();
    await button("戻る").click();
    await button("ワークアウト作成").click();
    await button("+ 種目追加").click();
    await page
      .getByRole("textbox", { name: "種目を検索", exact: true })
      .fill("腕立て");
    await button("腕立て伏せを追加").waitFor();
    await overflow();
    await page.screenshot({ path: "/tmp/ascend-ja-picker-320.png" });
    await button("閉じる").click();
    await tab("プレイヤー");
    await page.getByText("部位別Rating", { exact: true }).waitFor();
    await page.getByText("パーソナルレコード", { exact: true }).waitFor();
    await overflow();
    await tab("キャリア");
    await page
      .getByRole("heading", { name: "現在のクラブ", exact: true })
      .waitFor();
    await page.getByText("シーズン 01", { exact: true }).first().waitFor();
    await page.getByText("ワークアウト · 0", { exact: true }).waitFor();
    await overflow();
    await page.screenshot({ path: "/tmp/ascend-ja-career-320.png" });
    await tab("ショップ");
    await page.getByText("カスタマイズ", { exact: true }).waitFor();
    await page.getByText("カード背景", { exact: true }).waitFor();
    await overflow();
    assert.deepEqual(
      Object.fromEntries(
        Object.entries(await raw()).filter(([k]) => k !== "ascend.settings.v1"),
      ),
      baseline,
    );
    await page.goto(url);
    await page.getByRole("tab", { name: "ホーム", exact: true }).waitFor();
    await page.getByText("10 コイン", { exact: true }).first().waitFor();
    await page.evaluate(() => {
      for (const n of document.querySelectorAll('[dir="auto"]'))
        n.style.fontSize = `${parseFloat(getComputedStyle(n).fontSize) * 1.5}px`;
    });
    await overflow();
    assert.equal(
      await page.getByRole("tab").evaluateAll((tabs) =>
        tabs.every((tab) =>
          Array.from(tab.querySelectorAll('[dir="auto"]')).every((label) => {
            const rect = label.getBoundingClientRect();
            return (
              rect.bottom <= window.innerHeight &&
              rect.top >= tab.getBoundingClientRect().top
            );
          }),
        ),
      ),
      true,
      "Enlarged navigation labels remain inside the visible bar",
    );
    await page.screenshot({ path: "/tmp/ascend-ja-large-320.png" });
    await page.setViewportSize({ width: 390, height: 844 });
    await language("ja", "en");
    await page.getByRole("tab", { name: "HOME", exact: true }).waitFor();
    await page.goto(url);
    await page.getByText("10 Coins", { exact: true }).first().waitFor();
    assert.equal(
      JSON.parse((await raw())["ascend.settings.v1"]).settings.locale,
      "en",
    );
    assert.deepEqual(
      Object.fromEntries(
        Object.entries(await raw()).filter(([k]) => k !== "ascend.settings.v1"),
      ),
      baseline,
    );
    await button("Settings").first().click();
    await button("Language").click();
    await page.evaluate(() => {
      window.savedSet = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        if (k === "ascend.settings.v1") throw Error("QA settings write");
        return window.savedSet.call(this, k, v);
      };
    });
    await button("日本語").click();
    await page
      .getByText(
        "Settings could not be loaded or saved. Your training data is unchanged.",
        { exact: true },
      )
      .waitFor();
    assert.equal(
      JSON.parse((await raw())["ascend.settings.v1"]).settings.locale,
      "en",
    );
    await page.evaluate(() => (Storage.prototype.setItem = window.savedSet));
    await button("RETRY SETTINGS").click();
    await button("日本語").click();
    await button("設定を閉じる").click();
    for (const value of [
      "broken",
      JSON.stringify({ version: 2, settings: { locale: "ja" } }),
    ]) {
      await page.evaluate(
        (v) => localStorage.setItem("ascend.settings.v1", v),
        value,
      );
      await page.goto(url);
      await page.getByText("10 Coins", { exact: true }).first().waitFor();
      await button("Settings").first().click();
      await page
        .getByText(
          "Settings could not be loaded or saved. Your training data is unchanged.",
          { exact: true },
        )
        .waitFor();
      await button("Language").click();
      assert.equal(await button("日本語").isDisabled(), true);
      await button("RETRY SETTINGS").click();
      assert.equal((await raw())["ascend.settings.v1"], value);
      await button("Close settings").click();
    }
    assert.deepEqual(
      Object.fromEntries(
        Object.entries(await raw()).filter(([k]) => k !== "ascend.settings.v1"),
      ),
      baseline,
    );
    // Separate synthetic workout execution after the read-only language/isolation checks.
    const active = startSession(
      plan,
      standardExercises,
      new Date().toISOString(),
    );
    await page.evaluate(
      ({ active }) => {
        const d = JSON.parse(localStorage.getItem("ascend.sessions.v1"));
        d.active = active;
        localStorage.setItem("ascend.sessions.v1", JSON.stringify(d));
        localStorage.setItem(
          "ascend.settings.v1",
          JSON.stringify({ version: 1, settings: { locale: "ja" } }),
        );
      },
      { active },
    );
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto(url);
    await page
      .getByRole("tab", { name: "トレーニング", exact: true })
      .waitFor();
    await tab("トレーニング");
    await button("ワークアウト再開").click();
    await page
      .getByRole("textbox", { name: "実績の回数", exact: true })
      .fill("12");
    await overflow();
    await page.screenshot({ path: "/tmp/ascend-ja-workout-320.png" });
    await button("セット完了").click();
    await page.getByTestId("workout-coins").waitFor();
    await page
      .getByText("デイリーワークアウト · +10 コイン", { exact: true })
      .waitFor();
    await button("続ける").click(); // First direct assessment crosses an integer in this fixture.
    await button("終了").click();
    const completed = JSON.parse((await raw())["ascend.sessions.v1"]);
    assert.equal(completed.active, null);
    assert.equal(completed.completed.length, 2);
    await button("AIコーチを開く").click();
    await button("標準設定で試す").click();
    await page
      .getByRole("heading", { name: "提案メニューを確認", exact: true })
      .waitFor();
    await overflow();
    await page.screenshot({ path: "/tmp/ascend-ja-coach-320.png" });
    assert.deepEqual(errors, []);
    console.log(
      "PASS: EN/JA immediate switch, five tabs, Japanese exercise search, reload both directions, exact gameplay bytes preserved, settings-only writes, failure/corrupt/newer preservation, 320/390px/large text/reduced motion, Japanese actual-set completion/rewards/Coach preview, no page exceptions.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
