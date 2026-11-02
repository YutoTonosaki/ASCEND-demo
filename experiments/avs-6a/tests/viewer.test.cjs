const { test } = require("node:test"),
  assert = require("node:assert/strict");
const {
  ownedLoad,
  shouldMountRenderer,
  gestureDelta,
} = require("../src/lifecycle.ts");
const { frameBox } = require("../src/camera.ts");
const { foregroundAtOpen } = require("../src/lifecycle.ts");
const { en, ja, translate } = require("../src/strings.ts");
const flush = () => new Promise((r) => setImmediate(r));
test("initial native AppState may be null, but known background always blocks", () => {
  assert.equal(foregroundAtOpen(null), true);
  assert.equal(foregroundAtOpen(undefined), true);
  assert.equal(foregroundAtOpen("active"), true);
  assert.equal(foregroundAtOpen("background"), false);
  assert.equal(foregroundAtOpen("inactive"), false);
  assert.equal(
    shouldMountRenderer(true, foregroundAtOpen("background"), false),
    false,
  );
});
test("box framing fits narrow portrait without tiny sphere framing", () => {
  const r = frameBox(0.65, 1.8, 0.4, 320 / 600);
  assert.ok(r.initial.distance > 2 && r.initial.distance < 4);
  assert.ok(r.minimumDistance < r.initial.distance);
  assert.throws(() => frameBox(0, 1, 1, 1));
  assert.throws(() => frameBox(1, NaN, 1, 1));
});
test("renderer mounts only while visible, foreground and healthy", () => {
  for (const o of [true, false])
    for (const f of [true, false])
      for (const e of [true, false])
        assert.equal(shouldMountRenderer(o, f, e), o && f && !e);
});
test("normal open close disposes once and never publishes after close", async () => {
  const value = {},
    released = [],
    ready = [];
  const close = ownedLoad(
    async () => value,
    (x) => ready.push(x),
    assert.fail,
    (x) => released.push(x),
  );
  await flush();
  assert.deepEqual(ready, [value]);
  close();
  close();
  assert.deepEqual(released, [value]);
});
test("late load after closing or backgrounding is released without publication", async () => {
  let resolve;
  const wait = new Promise((r) => (resolve = r));
  const released = [];
  let published = 0;
  const close = ownedLoad(
    () => wait,
    () => published++,
    assert.fail,
    (x) => released.push(x),
  );
  close();
  resolve("late");
  await flush();
  assert.equal(published, 0);
  assert.deepEqual(released, ["late"]);
});
test("load failures can be retried through a new independent lease", async () => {
  const errors = [],
    results = [];
  const close = ownedLoad(
    async () => {
      throw Error("bad model");
    },
    assert.fail,
    (e) => errors.push(e.message),
    assert.fail,
  );
  await flush();
  close();
  const next = ownedLoad(
    async () => "valid",
    (x) => results.push(x),
    assert.fail,
    () => {},
  );
  await flush();
  next();
  assert.deepEqual(errors, ["bad model"]);
  assert.deepEqual(results, ["valid"]);
});
test("stale failure does not contaminate a later opening", async () => {
  let reject;
  const old = new Promise((_, r) => (reject = r));
  const close = ownedLoad(() => old, assert.fail, assert.fail, assert.fail);
  close();
  reject(Error("late"));
  await flush();
});
test("touch transitions rebase rather than jumping rotation or zoom", () => {
  assert.deepEqual(
    gestureDelta(
      [{ x: 10, y: 0 }],
      [
        { x: 10, y: 0 },
        { x: 80, y: 0 },
      ],
    ),
    { rotation: 0, zoom: 1 },
  );
  assert.deepEqual(
    gestureDelta(
      [
        { x: 10, y: 0 },
        { x: 80, y: 0 },
      ],
      [{ x: 12, y: 0 }],
    ),
    { rotation: 0, zoom: 1 },
  );
  assert.equal(
    gestureDelta([{ x: 0, y: 0 }], [{ x: 10, y: 0 }]).rotation,
    0.12,
  );
  assert.equal(
    gestureDelta(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
      [
        { x: 0, y: 0 },
        { x: 200, y: 0 },
      ],
    ).zoom,
    0.5,
  );
  assert.equal(
    gestureDelta(
      [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
      ],
      [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
      ],
    ).zoom,
    1,
  );
});
test("all viewer keys have EN JA values and no unresolved interpolation", () => {
  assert.deepEqual(Object.keys(en).sort(), Object.keys(ja).sort());
  for (const k of Object.keys(en)) {
    assert.ok(translate("en", k));
    assert.ok(translate("ja", k));
  }
  assert.equal(translate("ja", "reset"), "視点をリセット");
});
test("actual GLB is locally complete and all included source hashes verify", () => {
  const { manifest } = require("../tools/verify-asset.cjs").verify();
  assert.equal(manifest.license, "CC0-1.0");
  assert.equal(manifest.animations, 0);
});
test("prototype has no gameplay repository or storage dependency", () => {
  const fs = require("node:fs"),
    path = require("node:path"),
    p = require("../package.json");
  assert.equal(
    p.dependencies["@react-native-async-storage/async-storage"],
    undefined,
  );
  for (const file of [
    "../App.jsx",
    "../src/create-scene.jsx",
    "../src/lifecycle.ts",
  ]) {
    const source = fs.readFileSync(path.join(__dirname, file), "utf8");
    assert.doesNotMatch(
      source,
      /my-app|storage\/|useGrowth|useShop|useMatches|reconcilePlayer/,
    );
  }
});

test("shared geometry, materials and textures are disposed only once per model", async () => {
  const fs = require("node:fs"),
    path = require("node:path");
  const source = fs.readFileSync(
    path.join(__dirname, "../src/resources.js"),
    "utf8",
  );
  const { disposeModel } = await import(
    "data:text/javascript;base64," + Buffer.from(source).toString("base64")
  );
  const counts = { g: 0, m: 0, t: 0 };
  const texture = { isTexture: true, dispose: () => counts.t++ };
  const material = { map: texture, dispose: () => counts.m++ };
  const geometry = { dispose: () => counts.g++ };
  disposeModel({
    traverse: (fn) => {
      fn({ geometry, material });
      fn({ geometry, material: [material] });
    },
  });
  assert.deepEqual(counts, { g: 1, m: 1, t: 1 });
});

test("included upstream mesh targets and pose data explicitly declare CC0", () => {
  const fs = require("node:fs"),
    path = require("node:path");
  const p = require("../asset-source/provenance.json");
  for (const item of p.files) {
    assert.ok(
      item.source.startsWith(
        `https://raw.githubusercontent.com/makehumancommunity/makehuman/${p.revision}/`,
      ),
    );
    const source = fs.readFileSync(
      path.join(__dirname, "../asset-source/makehuman", item.file),
      "utf8",
    );
    if (item.file.endsWith(".obj") || item.file.endsWith(".target"))
      assert.match(source.slice(0, 1500), /explicitly released as CC0/);
    if (item.file.endsWith(".mhskel") || item.file.endsWith(".mhw"))
      assert.equal(JSON.parse(source).license, "CC0");
  }
});
