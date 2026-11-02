// External Playwright, real bundled GLB. This verifies WebGL, never native GPU.
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const folder = process.env.AVS_QA_SCREENSHOTS || "/tmp/avs-lab-screenshots";
fs.mkdirSync(folder, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    args: [
      "--enable-unsafe-swiftshader",
      "--use-gl=angle",
      "--use-angle=swiftshader",
    ],
  });
  try {
    for (const width of [390, 320]) {
      const context = await browser.newContext({
        viewport: { width, height: 844 },
        hasTouch: true,
        isMobile: true,
        reducedMotion: "reduce",
      });
      const page = await context.newPage(),
        errors = [];
      page.setDefaultTimeout(60000);
      page.on("pageerror", (e) => errors.push(e.message));
      await page.addInitScript(() => {
        localStorage.setItem("ascend.untouched", "sentinel");
        window.storageWrites = [];
        for (const method of ["setItem", "removeItem", "clear"]) {
          const original = Storage.prototype[method];
          Storage.prototype[method] = function (...args) {
            window.storageWrites.push(`${method}:${args[0] || ""}`);
            return original.apply(this, args);
          };
        }
      });
      await page.goto(process.env.AVS_QA_URL || "http://127.0.0.1:8130");
      const button = (name) => page.getByRole("button", { name, exact: true });
      assert.equal(await page.locator("canvas").count(), 0);
      await button("OPEN ATHLETE VIEWER").tap();
      await page
        .getByTestId("viewer-status")
        .filter({ hasText: "Athlete ready" })
        .waitFor();
      await page.waitForTimeout(500);
      assert.equal(await page.locator("canvas").count(), 1);
      const canvas = page.locator("canvas");
      const front = await canvas.screenshot({
        path: `${folder}/front-${width}.png`,
      });
      assert.ok(
        front.length > 8000,
        "Actual model must produce nonempty rendered pixels",
      );
      await button("SIDE").tap();
      await page.waitForTimeout(200);
      const side = await canvas.screenshot({
        path: `${folder}/side-${width}.png`,
      });
      assert.ok(!side.equals(front), "Side pixels differ from front");
      await button("BACK").tap();
      await page.waitForTimeout(200);
      await canvas.screenshot({ path: `${folder}/back-${width}.png` });
      await button("RESET VIEW").tap();
      await page.waitForTimeout(250);
      // Exercise two-finger Touch events independently of button zoom.
      const touchBox = await canvas.boundingBox();
      const cdp = await context.newCDPSession(page);
      const cx = touchBox.x + touchBox.width / 2,
        cy = touchBox.y + touchBox.height / 2;
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: cx - 30, y: cy, id: 1 }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [
          { x: cx - 30, y: cy, id: 1 },
          { x: cx + 30, y: cy, id: 2 },
        ],
      });
      for (let step = 1; step <= 6; step++) {
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [
            { x: cx - 30 - step * 6, y: cy, id: 1 },
            { x: cx + 30 + step * 6, y: cy, id: 2 },
          ],
        });
        await page.waitForTimeout(25);
      }
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await page.waitForTimeout(200);
      assert.ok(
        !(await canvas.screenshot()).equals(front),
        "Pinch changes camera distance",
      );
      assert.equal(
        await page.evaluate(() => visualViewport.scale),
        1,
        "Pinch must not zoom the webpage",
      );
      await button("RESET VIEW").tap();
      await page.waitForTimeout(200);
      const reset = await canvas.screenshot();
      assert.ok(reset.equals(front), "Reset restores exact front pixels");
      await button("ZOOM IN").tap();
      await page.waitForTimeout(200);
      assert.ok(
        !(await canvas.screenshot()).equals(front),
        "Zoom button changes pixels",
      );
      await button("RESET VIEW").tap();
      const bounds = await canvas.boundingBox();
      assert.ok(bounds);
      await page.mouse.move(
        bounds.x + bounds.width * 0.4,
        bounds.y + bounds.height * 0.5,
      );
      await page.mouse.down();
      await page.mouse.move(
        bounds.x + bounds.width * 0.7,
        bounds.y + bounds.height * 0.5,
        { steps: 8 },
      );
      await page.mouse.up();
      await page.waitForTimeout(200);
      assert.ok(
        !(await canvas.screenshot()).equals(front),
        "Horizontal pointer gesture rotates the model",
      );
      await button("日本語").tap();
      await button("視点をリセット").waitFor();
      await page.screenshot({ path: `${folder}/viewer-ja-${width}.png` });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await button("読込エラーをテスト").scrollIntoViewIfNeeded();
      await button("読込エラーをテスト").tap();
      await page.getByRole("alert").waitFor();
      assert.equal(await page.locator("canvas").count(), 0);
      await button("再試行").tap();
      await page
        .getByTestId("viewer-status")
        .filter({ hasText: "アスリートを表示中" })
        .waitFor();
      assert.equal(await page.locator("canvas").count(), 1);
      // AppState's web adapter consumes visibilitychange. This is not native AppState proof.
      await page.evaluate(() => {
        Object.defineProperty(document, "visibilityState", {
          configurable: true,
          value: "hidden",
        });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await page.locator("canvas").waitFor({ state: "detached" });
      await page.evaluate(() => {
        Object.defineProperty(document, "visibilityState", {
          configurable: true,
          value: "visible",
        });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await page
        .getByTestId("viewer-status")
        .filter({ hasText: "アスリートを表示中" })
        .waitFor();
      for (let n = 0; n < 3; n++) {
        await button("閉じる").tap();
        assert.equal(await page.locator("canvas").count(), 0);
        await button("アスリートビューアを開く").tap();
        await page
          .getByTestId("viewer-status")
          .filter({ hasText: "アスリートを表示中" })
          .waitFor();
        assert.equal(await page.locator("canvas").count(), 1);
      }
      if (width === 320) {
        await page.evaluate(() => {
          const items = Array.from(
            document.querySelectorAll('[dir="auto"]'),
          ).map((node) => {
            const c = getComputedStyle(node);
            return {
              node,
              font: parseFloat(c.fontSize),
              line: parseFloat(c.lineHeight),
            };
          });
          for (const { node, font, line } of items) {
            node.style.setProperty("font-size", `${font * 1.5}px`, "important");
            node.style.setProperty(
              "line-height",
              `${(Number.isFinite(line) ? line : font * 1.2) * 1.5}px`,
              "important",
            );
          }
        });
        await button("視点をリセット").scrollIntoViewIfNeeded();
        await button("視点をリセット").tap();
        await page.screenshot({ path: `${folder}/viewer-ja-large.png` });
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
      }
      await button("閉じる").tap();
      await button("English").tap();
      await button("OPEN ATHLETE VIEWER").waitFor();
      assert.equal(
        await page.evaluate(() => localStorage.getItem("ascend.untouched")),
        "sentinel",
      );
      assert.deepEqual(await page.evaluate(() => window.storageWrites), []);
      assert.deepEqual(errors, []);
      console.log(
        `PASS ${width}: actual GLB, view/pointer/zoom/reset, EN/JA, recoverable failure, background/foreground, repeated close/reopen, zero storage writes`,
      );
      await context.close();
    }
    // Real loader rejection, not just the lab fault button; retry after recovery.
    const context = await browser.newContext({
      viewport: { width: 320, height: 844 },
    });
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route(/\.glb(?:\?|$)/, (route) => route.abort());
    await page.goto(process.env.AVS_QA_URL || "http://127.0.0.1:8130");
    await page
      .getByRole("button", { name: "OPEN ATHLETE VIEWER", exact: true })
      .click();
    await page.getByRole("alert").waitFor();
    assert.equal(await page.locator("canvas").count(), 0);
    await page.unroute(/\.glb(?:\?|$)/);
    await page.getByRole("button", { name: "RETRY", exact: true }).click();
    await page
      .getByTestId("viewer-status")
      .filter({ hasText: "Athlete ready" })
      .waitFor();
    assert.deepEqual(errors, []);
    await context.close();
    console.log(
      "PASS: actual GLB request failure, retry recovery, no page exceptions",
    );
    const unsupported = await browser.newContext({
        viewport: { width: 320, height: 844 },
      }),
      unavailable = await unsupported.newPage(),
      failures = [];
    unavailable.on("pageerror", (e) => failures.push(e.message));
    await unavailable.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
        if (String(kind).includes("webgl")) return null;
        return original.call(this, kind, ...args);
      };
    });
    await unavailable.goto(process.env.AVS_QA_URL || "http://127.0.0.1:8130");
    await unavailable
      .getByRole("button", { name: "OPEN ATHLETE VIEWER", exact: true })
      .click();
    await unavailable.getByRole("alert").waitFor();
    await unavailable
      .getByRole("button", { name: "CLOSE", exact: true })
      .click();
    await unavailable
      .getByRole("button", { name: "OPEN ATHLETE VIEWER", exact: true })
      .waitFor();
    assert.deepEqual(failures, []);
    await unsupported.close();
    console.log(
      "PASS: unsupported WebGL2 fails into recoverable UI and CLOSE remains usable",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
