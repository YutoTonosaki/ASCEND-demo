const { test } = require("node:test"),
  assert = require("node:assert/strict");
const {
  ownedLoad,
  shouldMountRenderer,
  gestureDelta,
} = require("../src/avs/lifecycle.ts");
const { frameBox } = require("../src/avs/camera.ts");
const { foregroundAtOpen } = require("../src/avs/lifecycle.ts");

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
const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  ts = require("typescript");
const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
test("production asset byte identity and original provenance remain verified", () => {
  const manifest = require("../tools/verify-avs.cjs").verify();
  assert.equal(manifest.license, "CC0-1.0");
  assert.equal(manifest.animations, 0);
});
test("AVS has no gameplay storage or provider dependencies", () => {
  for (const file of fs
    .readdirSync(path.join(__dirname, "../src/avs"))
    .filter((x) => /\.tsx?$/.test(x))) {
    assert.doesNotMatch(
      read("src/avs/" + file),
      /AsyncStorage|localStorage|useGrowth|useShop|useRewards|useMatches|useCareer|useSeasons|reconcile|storage\//,
    );
  }
});
test("production renderer import boundary is inert until invoked, errors retain identity", async () => {
  for (const platform of ["native", "web"]) {
    const module = { exports: {} },
      calls = [],
      error = Error("import probe");
    vm.runInNewContext(
      ts.transpileModule(read(`src/avs/load-renderer.${platform}.ts`), {
        compilerOptions: { module: ts.ModuleKind.CommonJS },
      }).outputText,
      {
        module,
        exports: module.exports,
        require: (name) => {
          calls.push(name);
          throw error;
        },
      },
    );
    assert.equal(calls.length, 0);
    await assert.rejects(
      () => module.exports.loadRenderer(),
      (e) => e === error,
    );
    assert.deepEqual(calls, [`./Scene.${platform}`]);
  }
});
test("all root Three requests use ESM; unrelated resolution remains Expo-owned", () => {
  const { resolveRequest, threeEsm } = require("../tools/three-resolution.cjs");
  const ctx = { resolveRequest: (_, name, platform) => ({ name, platform }) };
  for (const p of ["ios", "android", "web"])
    assert.equal(resolveRequest(ctx, "three", p).filePath, threeEsm);
  assert.ok(threeEsm.endsWith("three.module.js"));
  assert.deepEqual(resolveRequest(ctx, "expo-router", "ios"), {
    name: "expo-router",
    platform: "ios",
  });
});
test("installed Node Three wrapper reproduces the avoided initialization failure", () => {
  const source = fs.readFileSync(require.resolve("three"), "utf8");
  let called = false;
  assert.throws(
    () =>
      vm.runInNewContext(source, {
        process: { env: {} },
        module: { exports: {} },
        require: () => {
          called = true;
        },
      }),
    /emitWarning.*not a function/,
  );
  assert.equal(called, false);
});
test("deduplicated owned geometries materials and textures dispose once", () => {
  const { disposeModel } = require("../src/avs/resources.ts"),
    counts = { g: 0, m: 0, t: 0 };
  const texture = { isTexture: true, dispose: () => counts.t++ },
    material = { map: texture, dispose: () => counts.m++ },
    geometry = { dispose: () => counts.g++ };
  disposeModel({
    traverse: (fn) => {
      fn({ geometry, material });
      fn({ geometry, material: [material] });
    },
  });
  assert.deepEqual(counts, { g: 1, m: 1, t: 1 });
});
test("viewer translations use the existing EN/JA dictionaries", () => {
  const { en } = require("../src/localization/locales/en.ts"),
    { ja } = require("../src/localization/locales/ja.ts");
  const keys = Object.keys(en).filter((k) => k.startsWith("avs."));
  assert.ok(keys.length >= 18);
  for (const key of keys) assert.ok(ja[key]);
  assert.equal(ja["avs.open"], "3Dアスリートを見る");
  assert.equal(en["avs.open"], "VIEW 3D ATHLETE");
});

test("imperative responder adapter rebases fingers and resets on a new load", () => {
  const { CameraGestures } = require("../src/avs/gestures.ts"),
    C = require("../src/avs/camera.ts");
  const rig = C.frameBox(0.65, 1.8, 0.4, 0.6);
  let value = C.resetCamera(rig);
  const gestures = new CameraGestures((fn) => {
    value = fn(value);
  });
  gestures.setRig(rig);
  gestures.start([{ x: 0, y: 0 }]);
  gestures.move([{ x: 20, y: 0 }]);
  assert.notEqual(value.yaw, 0);
  const before = value;
  gestures.move([
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ]);
  assert.deepEqual(value, before);
  gestures.move([
    { x: 0, y: 0 },
    { x: 200, y: 0 },
  ]);
  assert.equal(value.distance, before.distance * 0.5);
  gestures.setRig(null);
  const paused = value;
  gestures.move([{ x: 0, y: 0 }]);
  assert.equal(value, paused);
});
