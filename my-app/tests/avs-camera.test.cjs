// Headless control experiment only: these tests do not render or validate a GPU.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const C = require("../experiments/avs/camera.ts");
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} vs ${b}`);

test("AVS default camera faces forward with immutable detached state", () => {
  const rig = C.frameCamera(1, 390 / 844);
  assert.equal(rig.initial.yaw, 0);
  assert.ok(rig.initial.distance > 1);
  assert.ok(Object.isFrozen(rig) && Object.isFrozen(rig.initial));
  assert.notEqual(C.frameCamera(1, 390 / 844).initial, rig.initial);
});

test("AVS framing contains the entire bounding sphere in narrow and wide viewports", () => {
  for (const aspect of [320 / 844, 390 / 844, 1, 844 / 320]) {
    for (const radius of [0.01, 0.9, 50]) {
      for (const fov of [Math.PI / 8, Math.PI / 4, Math.PI * 0.95]) {
        const rig = C.frameCamera(radius, aspect, fov);
        const angularRadius = Math.asin(radius / rig.initial.distance);
        assert.ok(angularRadius < fov / 2);
        assert.ok(angularRadius < Math.atan(Math.tan(fov / 2) * aspect));
        assert.ok(rig.initial.distance >= rig.minimumDistance);
        assert.ok(rig.initial.distance <= rig.maximumDistance);
      }
    }
  }
});

test("AVS invalid bounds, aspect and field of view fail explicitly", () => {
  for (const value of [0, -1, NaN, Infinity, -Infinity]) {
    assert.throws(() => C.frameCamera(value, 1));
    assert.throws(() => C.frameCamera(1, value));
    assert.throws(() => C.frameCamera(1, 1, value));
  }
  assert.throws(() => C.frameCamera(1, 1, Math.PI));
  assert.throws(() => C.frameCamera(Number.MAX_VALUE, 0.3));
});

test("AVS repeated bidirectional rotation stays normalized without modifying original", () => {
  const original = C.frameCamera(1, 1).initial;
  let state = original;
  for (let i = 0; i < 1000; i++) state = C.rotateCamera(state, -Math.PI / 2);
  near(state.yaw, 0);
  state = C.rotateCamera(state, Math.PI * 9);
  near(state.yaw, Math.PI);
  assert.equal(original.yaw, 0);
  assert.equal(state.distance, original.distance);
  assert.ok(state.yaw >= 0 && state.yaw < Math.PI * 2);
});

test("AVS invalid gesture input retains last valid state", () => {
  const rig = C.frameCamera(1, 1),
    state = rig.initial;
  for (const value of [NaN, Infinity, -Infinity])
    assert.equal(C.rotateCamera(state, value), state);
  for (const value of [NaN, Infinity, -Infinity, 0, -1])
    assert.equal(C.zoomCamera(rig, state, value), state);
  assert.equal(C.presetCamera(state, "unknown"), state);
  assert.equal(C.presetCamera(state, "toString"), state);
});

test("AVS extreme valid pinch ratios clamp outside the model sphere", () => {
  const rig = C.frameCamera(0.9, 320 / 844);
  const close = C.zoomCamera(rig, rig.initial, Number.MIN_VALUE);
  const far = C.zoomCamera(rig, rig.initial, Number.MAX_VALUE);
  assert.equal(close.distance, rig.minimumDistance);
  assert.ok(close.distance > 0.9);
  assert.equal(far.distance, rig.maximumDistance);
  assert.ok(Number.isFinite(far.distance));
});

test("AVS reciprocal zoom restores distance within limits", () => {
  const rig = C.frameCamera(1, 1);
  const state = C.zoomCamera(rig, rig.initial, 0.8);
  near(C.zoomCamera(rig, state, 1.25).distance, rig.initial.distance);
});

test("AVS front side and back presets preserve selected zoom", () => {
  const rig = C.frameCamera(1, 1);
  const zoomed = C.zoomCamera(rig, rig.initial, 0.8);
  for (const [preset, yaw] of [
    ["front", 0],
    ["side", Math.PI / 2],
    ["back", Math.PI],
  ]) {
    const state = C.presetCamera(zoomed, preset);
    assert.equal(state.yaw, yaw);
    assert.equal(state.distance, zoomed.distance);
  }
});

test("AVS reset returns initial framing after arbitrary controls", () => {
  const rig = C.frameCamera(1, 320 / 844);
  const state = C.zoomCamera(rig, C.rotateCamera(rig.initial, 1.2), 0.7);
  assert.notDeepEqual(state, rig.initial);
  assert.deepEqual(C.resetCamera(rig), {
    yaw: 0,
    distance: rig.initial.distance,
  });
});
