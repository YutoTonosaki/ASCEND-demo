const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  ts = require("typescript");
const { ViewerLoad, observeModelFrame } = require("../src/avs/readiness.ts");
function fixture() {
  let id = 0;
  const jobs = new Map(),
    events = [],
    errors = [];
  const trace = {
    mark: (...args) => events.push(args),
    error: (...args) => events.push(args),
  };
  const load = new ViewerLoad(trace, (error) => errors.push(error), {
    set: (fn, ms) => {
      assert.equal(ms, 30000);
      jobs.set(++id, fn);
      return id;
    },
    clear: (handle) => jobs.delete(handle),
  });
  return { load, jobs, events, errors, trace };
}
test("native-style successful model render/endFrame returns before ready; deadline cancelled", () => {
  const f = fixture(),
    order = [];
  f.load.start();
  const renderer = {
    render() {
      order.push("draw");
      order.push("endFrameEXP");
    },
  };
  const cleanup = observeModelFrame(
    renderer,
    () => true,
    () => {
      order.push("ready");
      assert.ok(f.load.rendered());
    },
    f.trace,
  );
  renderer.render();
  assert.deepEqual(order, ["draw", "endFrameEXP", "ready"]);
  assert.equal(f.jobs.size, 0);
  renderer.render();
  assert.equal(order.filter((x) => x === "ready").length, 1);
  cleanup();
});
test("ground-only frames do not declare success and a genuine stalled attempt times out", () => {
  const f = fixture();
  f.load.start();
  let ready = 0;
  const renderer = { render() {} };
  const stop = observeModelFrame(
    renderer,
    () => false,
    () => ready++,
    f.trace,
  );
  renderer.render();
  assert.equal(ready, 0);
  [...f.jobs.values()][0]();
  assert.equal(f.errors.length, 1);
  assert.match(f.errors[0].message, /timeout/);
  assert.equal(f.load.accepts(), false);
  stop();
});
test("timer callback already queued after readiness cannot turn success into failure", () => {
  const f = fixture();
  f.load.start();
  const queued = [...f.jobs.values()][0];
  assert.ok(f.load.rendered());
  queued();
  assert.equal(f.errors.length, 0);
  assert.equal(f.load.rendered(), false);
});
test("close during import/model loading cancels deadline and rejects late publication", () => {
  const f = fixture(),
    token = f.load.start(),
    queued = [...f.jobs.values()][0];
  f.load.close();
  assert.equal(f.jobs.size, 0);
  assert.equal(f.load.accepts(token), false);
  assert.equal(f.load.rendered(), false);
  f.load.failure(Error("late"), token);
  queued();
  assert.equal(f.errors.length, 0);
});
test("import or asset errors retain original object and terminate only their attempt", () => {
  for (const message of ["import failed", "model failed"]) {
    const f = fixture(),
      error = Error(message);
    f.load.start();
    f.load.failure(error);
    assert.equal(f.errors[0], error);
    assert.equal(f.jobs.size, 0);
    assert.equal(f.load.accepts(), false);
  }
});
test("retry after timeout uses a new lease; old imports/timers cannot contaminate it", () => {
  const f = fixture(),
    old = f.load.start(),
    queued = [...f.jobs.values()][0];
  queued();
  const next = f.load.start();
  assert.notEqual(old, next);
  assert.equal(f.load.accepts(old), false);
  f.load.failure(Error("old"), old);
  queued();
  assert.equal(f.errors.length, 1);
  assert.ok(f.load.accepts(next));
  assert.ok(f.load.rendered());
});
test("background/foreground or strict effect replay closes old lease then permits a fresh load", () => {
  const f = fixture(),
    old = f.load.start();
  f.load.close(old);
  const next = f.load.start();
  f.load.close(old);
  assert.ok(f.load.accepts(next));
  assert.equal(f.load.accepts(old), false);
  f.load.rendered();
  assert.equal(f.jobs.size, 0);
});
test("render exceptions stay exceptions and cannot publish ready", () => {
  const error = Error("GPU render failed"),
    renderer = {
      render() {
        throw error;
      },
    },
    f = fixture();
  let ready = 0;
  const stop = observeModelFrame(
    renderer,
    () => true,
    () => ready++,
    f.trace,
  );
  assert.throws(
    () => renderer.render(),
    (e) => e === error,
  );
  assert.equal(ready, 0);
  stop();
});
test("observer cleanup suppresses a queued old draw and restores renderer safely", () => {
  const f = fixture(),
    original = () => {},
    renderer = { render: original };
  let ready = 0;
  const stop = observeModelFrame(
      renderer,
      () => true,
      () => ready++,
      f.trace,
    ),
    old = renderer.render;
  stop();
  assert.equal(renderer.render, original);
  old();
  assert.equal(ready, 0);
});
test("handled timeouts retain stacks without calling console.error; unexpected boundary errors still do", () => {
  const logs = [],
    errors = [],
    module = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync(
        path.join(__dirname, "../src/avs/diagnostics.ts"),
        "utf8",
      ),
      { compilerOptions: { module: ts.ModuleKind.CommonJS } },
    ).outputText,
    {
      module,
      exports: module.exports,
      __DEV__: true,
      Error,
      console: {
        log: (...args) => logs.push(args),
        error: (...args) => errors.push(args),
      },
    },
  );
  const error = Error("AVS load timeout");
  module.exports.recordError("timeout", error);
  assert.equal(errors.length, 0);
  assert.match(logs[0][0], /RECOVERABLE/);
  assert.ok(logs[0][0].includes(error.stack));
  module.exports.recordError("unexpected", error, true);
  assert.equal(errors[0][1], error);
});
test("production diagnostic calls are silent", () => {
  const module = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync(
        path.join(__dirname, "../src/avs/diagnostics.ts"),
        "utf8",
      ),
      { compilerOptions: { module: ts.ModuleKind.CommonJS } },
    ).outputText,
    {
      module,
      exports: module.exports,
      __DEV__: false,
      console: { log: assert.fail, error: assert.fail },
    },
  );
  const t = module.exports.createTrace();
  t.mark("test");
  t.error("test", Error("test"));
});

test("frame witness requires the model mesh in this same successful frame", () => {
  const f = fixture();
  let drawn = false,
    withBody = false,
    ready = 0;
  const renderer = {
    render() {
      if (withBody) drawn = true;
    },
  };
  const stop = observeModelFrame(
    renderer,
    () => drawn,
    () => ready++,
    f.trace,
    () => {
      drawn = false;
    },
  );
  drawn = true;
  renderer.render();
  assert.equal(
    ready,
    0,
    "old mesh callback or ground-only draw is insufficient",
  );
  withBody = true;
  renderer.render();
  assert.equal(ready, 1);
  stop();
});
