// Isolated browser storage; actual WebGL/model, never proof of native rendering.
require("./register.cjs");
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const { initializePlayer } = require("../src/growth/domain.ts");
const sessions = { version: 1, active: null, completed: [] };
const player = {
  version: 1,
  player: initializePlayer(
    "avs-qa",
    new Date(Date.now() - 3600000).toISOString(),
    null,
    sessions,
  ),
};
(async () => {
  const browser = await chromium.launch({
    args: [
      "--enable-unsafe-swiftshader",
      "--use-gl=angle",
      "--use-angle=swiftshader",
    ],
  });
  try {
    for (const width of process.env.AVS_QA_WIDTH
      ? [Number(process.env.AVS_QA_WIDTH)]
      : [390, 320]) {
      const context = await browser.newContext({
        viewport: { width, height: 844 },
        hasTouch: true,
        isMobile: true,
        reducedMotion: "reduce",
      });
      const page = await context.newPage(),
        errors = [];
      const modelRequests = [];
      page.on("request", (request) => {
        if (request.url().endsWith(".glb")) modelRequests.push(request.url());
      });
      page.setDefaultTimeout(60000);
      page.on("pageerror", (e) => {
        errors.push(e.message);
        console.error("AVS browser page error", e.stack);
      });
      await page.addInitScript(
        ({ player, sessions }) => {
          if (!localStorage.getItem("ascend.player.v1")) {
            localStorage.setItem("ascend.player.v1", JSON.stringify(player));
            localStorage.setItem(
              "ascend.sessions.v1",
              JSON.stringify(sessions),
            );
          }
          window.avsWrites = [];
          for (const method of ["setItem", "removeItem", "clear"]) {
            const original = Storage.prototype[method];
            Storage.prototype[method] = function (...args) {
              window.avsWrites.push(`${method}:${args[0] || ""}`);
              return original.apply(this, args);
            };
          }
          // Observe actual evaluation, not whether Metro includes a deferred module in the bundle.
          let hits = 0;
          Object.defineProperty(window, "__THREE__", {
            configurable: true,
            get: () => undefined,
            set: () => {
              hits++;
              window.threeImports = hits;
            },
          });
        },
        { player, sessions },
      );
      const tab = (name) =>
        page.getByRole("tab", { name, exact: true }).click();
      const button = (name) => page.getByRole("button", { name, exact: true });
      const ready = () =>
        page
          .getByTestId("viewer-status")
          .filter({ hasText: /Athlete ready|アスリートを表示中/ })
          .waitFor();
      await page.goto(process.env.ASCEND_QA_URL || "http://127.0.0.1:8140");
      await tab("PLAYER");
      await button("VIEW 3D ATHLETE").waitFor();
      assert.equal(await page.locator("canvas").count(), 0);
      assert.equal(await page.evaluate(() => window.threeImports || 0), 0);
      assert.equal(
        modelRequests.length,
        0,
        "Model must not load before opening",
      );
      const before = await page.evaluate(() => ({ ...localStorage })),
        cardBefore = await page.getByTestId("player-card").textContent();
      await page.evaluate(() => {
        window.avsWrites = [];
      });
      await button("VIEW 3D ATHLETE").tap();
      await ready();
      const canvas = page.locator("canvas");
      assert.equal(await canvas.count(), 1);
      await page.waitForTimeout(500);
      const front = await canvas.screenshot();
      assert.ok(front.length > 8000);
      await button("SIDE").tap();
      await page.waitForTimeout(250);
      assert.ok(!(await canvas.screenshot()).equals(front));
      await button("BACK").tap();
      await button("RESET VIEW").tap();
      await page.waitForTimeout(250);
      assert.ok((await canvas.screenshot()).equals(front));
      for (const name of ["ROTATE LEFT", "ROTATE RIGHT", "ZOOM IN", "ZOOM OUT"])
        await button(name).tap();
      const box = await canvas.boundingBox();
      assert.ok(
        box.width > 0 && box.height > 0,
        "Modal Canvas must have nonzero dimensions",
      );
      const cdp = await context.newCDPSession(page),
        x = box.x + box.width / 2,
        y = box.y + box.height / 2;
      const send = (type, touchPoints) =>
        cdp.send("Input.dispatchTouchEvent", { type, touchPoints });
      await send("touchStart", [{ x, y }]);
      await send("touchMove", [{ x: x + 60, y }]);
      await send("touchEnd", []);
      await send("touchStart", [
        { x: x - 30, y },
        { x: x + 30, y },
      ]);
      await send("touchMove", [
        { x: x - 60, y },
        { x: x + 60, y },
      ]);
      await send("touchEnd", []);
      assert.equal(await page.evaluate(() => visualViewport.scale), 1);
      await page.evaluate(() => {
        Object.defineProperty(document, "visibilityState", {
          configurable: true,
          value: "hidden",
        });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await canvas.waitFor({ state: "detached" });
      await page.evaluate(() => {
        Object.defineProperty(document, "visibilityState", {
          configurable: true,
          value: "visible",
        });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await ready();
      for (let i = 0; i < 3; i++) {
        await button("CLOSE").tap();
        assert.equal(await page.locator("canvas").count(), 0);
        await button("VIEW 3D ATHLETE").tap();
        await ready();
      }
      await button("CLOSE").tap();
      // A real GLB fetch error must leave CLOSE and RETRY usable.
      await page.route("**/*.glb", (route) => route.abort());
      await button("VIEW 3D ATHLETE").tap();
      await button("RETRY").waitFor();
      assert.equal(await page.locator("canvas").count(), 0);
      await page.unroute("**/*.glb");
      await button("RETRY").tap();
      await ready();
      await button("CLOSE").tap();
      assert.equal(
        await page.getByTestId("player-card").textContent(),
        cardBefore,
      );
      assert.deepEqual(
        await page.evaluate(() => ({ ...localStorage })),
        before,
      );
      assert.deepEqual(await page.evaluate(() => window.avsWrites), []);
      // Select Japanese before opening, reusing production locale settings (only allowed write).
      await page.evaluate(() =>
        localStorage.setItem(
          "ascend.settings.v1",
          JSON.stringify({ version: 1, settings: { locale: "ja" } }),
        ),
      );
      await page.goto(process.env.ASCEND_QA_URL || "http://127.0.0.1:8140");
      await tab("プレイヤー");
      try {
        await button("3Dアスリートを見る").tap();
      } catch (error) {
        console.error(
          "Japanese entry diagnostics",
          await page.locator("body").innerText(),
          errors,
        );
        await page.screenshot({ path: "/tmp/avs-timeout-browser-failure.png" });
        throw error;
      }
      await ready();
      if (width === 320) {
        await page.evaluate(() => {
          for (const node of document.querySelectorAll('[dir="auto"]')) {
            const c = getComputedStyle(node),
              font = parseFloat(c.fontSize),
              line = parseFloat(c.lineHeight);
            node.style.setProperty("font-size", `${font * 1.5}px`, "important");
            node.style.setProperty(
              "line-height",
              `${(Number.isFinite(line) ? line : font * 1.2) * 1.5}px`,
              "important",
            );
          }
        });
      }
      await button("視点をリセット").scrollIntoViewIfNeeded();
      await button("視点をリセット").tap();
      fs.mkdirSync("/tmp/avs-integration-screenshots", { recursive: true });
      await page.screenshot({
        path: `/tmp/avs-integration-screenshots/viewer-ja-${width}.png`,
      });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await button("閉じる").tap();
      for (const name of [
        "ホーム",
        "トレーニング",
        "キャリア",
        "ショップ",
        "プレイヤー",
      ])
        await tab(name);
      assert.deepEqual(errors, []);
      await context.close();
    }
    // Reject the actual deferred renderer chunk: shell must still close safely.
    const failedContext = await browser.newContext({
      viewport: { width: 320, height: 844 },
    });
    const failedPage = await failedContext.newPage();
    failedPage.setDefaultTimeout(60000);
    await failedPage.addInitScript(
      ({ player, sessions }) => {
        localStorage.setItem("ascend.player.v1", JSON.stringify(player));
        localStorage.setItem("ascend.sessions.v1", JSON.stringify(sessions));
      },
      { player, sessions },
    );
    await failedPage.route("**/_expo/static/js/web/Scene-*.js", (route) =>
      route.abort(),
    );
    await failedPage.goto(process.env.ASCEND_QA_URL || "http://127.0.0.1:8140");
    await failedPage.getByRole("tab", { name: "PLAYER", exact: true }).click();
    await failedPage
      .getByRole("button", { name: "VIEW 3D ATHLETE", exact: true })
      .waitFor();
    const failedBefore = await failedPage.evaluate(() => ({ ...localStorage }));
    await failedPage
      .getByRole("button", { name: "VIEW 3D ATHLETE", exact: true })
      .click();
    await failedPage
      .getByRole("button", { name: "RETRY", exact: true })
      .waitFor();
    assert.equal(await failedPage.locator("canvas").count(), 0);
    await failedPage
      .getByRole("button", { name: "CLOSE", exact: true })
      .click();
    await failedPage.getByTestId("player-card").waitFor();
    assert.deepEqual(
      await failedPage.evaluate(() => ({ ...localStorage })),
      failedBefore,
    );
    await failedContext.close();
    console.log(
      "AVS integration browser: passed 390/320px, real GLB, controls/gestures/reset, cleanup/reopen/background, asset failure/retry and import failure containment, EN/JA, enlarged text, unchanged storage/card.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
