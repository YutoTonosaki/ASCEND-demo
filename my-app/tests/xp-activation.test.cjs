const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { captureCompletionContext, isCompletionContext, deviceTimeZone } = require("../src/sessions/calendar.ts");
const { isSession, copySession, position } = require("../src/sessions/domain.ts");
const { SessionRepository, SESSION_KEY } = require("../src/storage/session-repository.ts");
const { XPRepository, XP_KEY } = require("../src/storage/xp-repository.ts");
const { parseXPData } = require("../src/xp/activation.ts");
const { calculateDailyXP } = require("../src/xp/domain.ts");
const { workout } = require("./fixtures/session-progression.cjs");
const before = "2026-09-21T11:00:00.000Z";
const instant = "2026-09-21T12:00:00.000Z";
const later = "2026-09-22T12:00:00.000Z";
function memory() {
  const values = new Map();
  const writes = [];
  return { values, writes, read: async k => values.get(k) ?? null,
    write: async (k,v) => { writes.push(k); values.set(k,v); },
    remove: async k => { values.delete(k); } };
}
function fixture(adapter) {
  const { active, completed } = workout([["squat", [{ type: "reps", reps: 5 }]]], 20);
  adapter.values.set(SESSION_KEY, JSON.stringify({ version: 1, active, completed: [] }));
  return { active, completed, command: { type: "confirm", sessionId: active.id,
    setId: position(active).set.id, actual: { type: "reps", reps: 5 } } };
}
function asInput(session) {
  return { session, completionDay: session.completionContext ?? null };
}

test("completion captures every calendar value from the supplied single Date", () => {
  const date = new Date(instant);
  const seen = [];
  for (const method of ["toISOString", "getFullYear", "getMonth", "getDate", "getTimezoneOffset"]) {
    const original = date[method];
    date[method] = function () { seen.push(this); return original.call(this); };
  }
  const context = captureCompletionContext(date, null);
  assert.ok(seen.length >= 5 && seen.every(d => d === date));
  assert.equal(context.completedAt, instant);
  assert.ok(isCompletionContext(context, instant));
  assert.equal(context.timeZone, null);
  assert.ok(deviceTimeZone() === null || typeof deviceTimeZone() === "string");
});
for (const [zone, at, day, offset] of [
  ["America/Vancouver", "2026-09-22T06:59:59.999Z", "2026-09-21", 420],
  ["America/Vancouver", "2026-09-22T07:00:00.000Z", "2026-09-22", 420],
  ["America/Vancouver", "2026-03-08T09:59:59.999Z", "2026-03-08", 480],
  ["America/Vancouver", "2026-03-08T10:00:00.000Z", "2026-03-08", 420],
  ["America/Vancouver", "2026-11-01T08:30:00.000Z", "2026-11-01", 420],
  ["America/Vancouver", "2026-11-01T09:30:00.000Z", "2026-11-01", 480],
  ["Asia/Kathmandu", "2026-09-21T18:15:00.000Z", "2026-09-22", -345],
]) test(`captured calendar ${zone} ${at}`, () => {
  const script = `const {captureCompletionContext}=require('./src/sessions/calendar.ts'); console.log(JSON.stringify(captureCompletionContext(new Date(${JSON.stringify(at)}),${JSON.stringify(zone)})));`;
  const child = spawnSync(process.execPath, ["--require", "./tests/register.cjs", "-e", script],
    { cwd: require("node:path").resolve(__dirname, ".."), env: { ...process.env, TZ: zone }, encoding: "utf8" });
  assert.equal(child.status, 0, child.stderr);
  const result = JSON.parse(child.stdout);
  assert.equal(result.localDay, day); assert.equal(result.offsetMinutes, offset);
  assert.ok(isCompletionContext(result, at));
});

test("legacy sessions remain valid, context validation is fail closed and copies detach", () => {
  const { completed, active } = workout([["squat", [{ type: "reps", reps: 5 }]]], 20);
  assert.ok(isSession(completed));
  const legacy = JSON.stringify(completed);
  completed.completionContext = captureCompletionContext(new Date(completed.completedAt), null);
  assert.ok(isSession(completed));
  const copied = copySession(completed);
  copied.completionContext.localDay = "2000-01-01";
  assert.ok(isSession(completed)); assert.equal(isSession(copied), false);
  for (const patch of [{ version: 2 }, { completedAt: instant }, { localDay: "2026-02-30" },
    { offsetMinutes: 9999 }, { offsetMinutes: 0.5 }, { timeZone: undefined }, { timeZone: "" }]) {
    const bad = copySession(completed); Object.assign(bad.completionContext, patch);
    assert.equal(isSession(bad), false, JSON.stringify(patch));
  }
  active.completionContext = completed.completionContext;
  assert.equal(isSession(active), false);
  assert.equal(isSession(JSON.parse(legacy)), true);
});

test("final confirmation persists one captured context; copy/reload/duplicate do not recapture", async () => {
  const adapter = memory(); const { command } = fixture(adapter);
  let clocks = 0, zones = 0;
  const repo = new SessionRepository(adapter, () => { clocks++; return instant; }, () => { zones++; return null; });
  await repo.load();
  const state = await repo.commit(command);
  const saved = JSON.parse(adapter.values.get(SESSION_KEY));
  assert.equal(clocks, 1); assert.equal(zones, 1);
  assert.equal(saved.completed[0].completedAt, saved.completed[0].completionContext.completedAt);
  state.completed[0].completionContext.localDay = "invalid";
  const reload = await new SessionRepository(adapter, () => later).load();
  assert.deepEqual(reload, saved);
  assert.deepEqual(await repo.commit(command), saved);
  assert.equal(clocks, 1); assert.equal(adapter.writes.length, 1);
});

for (const lostAck of [false, true]) test(`Session failure ${lostAck ? "after" : "before"} commit retains completion context on retry`, async () => {
  const adapter = memory(); const { command } = fixture(adapter);
  let clock = instant;
  const repo = new SessionRepository(adapter, () => clock, () => null);
  await repo.load(); const write = adapter.write;
  adapter.write = async (k,v) => { if (lostAck) await write(k,v); throw Error("write failed"); };
  await assert.rejects(repo.commit(command), /write failed/);
  const durable = JSON.parse(adapter.values.get(SESSION_KEY));
  assert.equal(durable.active === null, lostAck);
  clock = later; adapter.write = write;
  const state = await repo.commit(command);
  assert.equal(state.completed[0].completionContext.completedAt, instant);
  assert.equal(state.completed[0].completedAt, instant);
  assert.deepEqual(await new SessionRepository(adapter).load(), state);
});

test("activation load is read only; historical IDs excluded; active completion is eligible", async () => {
  const adapter = memory(); const { completed, command } = fixture(adapter);
  const state = JSON.parse(adapter.values.get(SESSION_KEY));
  const historical = { ...completed, id: "historical" };
  state.completed = [historical]; adapter.values.set(SESSION_KEY, JSON.stringify(state));
  const bytes = adapter.values.get(SESSION_KEY);
  const xp = new XPRepository(adapter, () => before);
  assert.deepEqual(await xp.load(), { version: 1, activation: null });
  assert.deepEqual(adapter.writes, []);
  const { activation } = await xp.activate();
  assert.deepEqual(activation.excludedSessionIds, ["historical"]);
  assert.equal(adapter.values.get(SESSION_KEY), bytes);
  const sessions = new SessionRepository(adapter, () => instant, () => null); await sessions.load();
  const saved = await sessions.commit(command);
  const result = calculateDailyXP(saved.completed.map(asInput), activation);
  assert.equal(result.length, 1); assert.equal(result[0].entitlement, 15);
  assert.deepEqual(saved.completed[1], historical);
  const storedXP = JSON.parse(adapter.values.get(XP_KEY));
  assert.deepEqual(Object.keys(storedXP).sort(), ["activation", "version"]);
});

for (const activationFirst of [true, false]) test(`concurrent ${activationFirst ? "activation first" : "completion first"} has a single serialized boundary`, async () => {
  const adapter = memory(); const { active, command } = fixture(adapter);
  const sessions = new SessionRepository(adapter, () => instant, () => null);
  await sessions.load();
  const xp = new XPRepository(adapter, () => instant);
  const operations = activationFirst
    ? [xp.activate(), sessions.commit(command)]
    : [sessions.commit(command), xp.activate()];
  await Promise.all(operations);
  const { activation } = await xp.load();
  assert.equal(activation.excludedSessionIds.includes(active.id), !activationFirst);
  const { completed } = await sessions.load();
  const result = calculateDailyXP(completed.map(asInput), activation);
  assert.equal(result.length, activationFirst ? 1 : 0);
});

test("duplicate activation across instances and retries preserves boundary and detached IDs", async () => {
  const adapter = memory(); const { completed } = fixture(adapter);
  adapter.values.set(SESSION_KEY, JSON.stringify({ version: 1, active: null, completed: [completed] }));
  const a = new XPRepository(adapter, () => instant), b = new XPRepository(adapter, () => later);
  const results = await Promise.all([a.activate(), b.activate(), a.activate()]);
  assert.deepEqual(results[0], results[1]); assert.deepEqual(results[1], results[2]);
  assert.equal(adapter.writes.length, 1);
  results[0].activation.excludedSessionIds.push("mutated");
  assert.deepEqual(await b.load(), results[1]);
  assert.deepEqual(await b.activate(), results[1]);
});

for (const mode of ["before", "lost-ack", "readback", "mismatch"]) test(`activation failure ${mode} never publishes partial success`, async () => {
  const adapter = memory(); fixture(adapter);
  const sessionsBefore = adapter.values.get(SESSION_KEY);
  const write = adapter.write, read = adapter.read;
  adapter.write = async (k,v) => {
    if (mode === "before") throw Error("disk");
    await write(k,v);
    if (mode === "lost-ack") throw Error("ack");
  };
  adapter.read = async k => {
    if (k === XP_KEY && adapter.values.has(XP_KEY)) {
      if (mode === "readback") throw Error("readback");
      if (mode === "mismatch") return null;
    }
    return read(k);
  };
  await assert.rejects(new XPRepository(adapter, () => instant).activate());
  assert.equal(adapter.values.get(SESSION_KEY), sessionsBefore);
  adapter.write = write; adapter.read = read;
  const recovered = await new XPRepository(adapter, () => later).activate();
  assert.equal(recovered.activation.activatedAt, mode === "before" ? later : instant);
  assert.equal(adapter.writes.filter(k => k === XP_KEY).length, 1);
});

test("corrupt/unsupported activation and Session storage preserved; reads never initialize", async () => {
  for (const key of [XP_KEY, SESSION_KEY]) for (const raw of ["{broken", '{"version":2}', '{"version":1,"activation":null}']) {
    const adapter = memory(); fixture(adapter); adapter.values.set(key, raw);
    await assert.rejects(new XPRepository(adapter).activate());
    assert.equal(adapter.values.get(key), raw); assert.deepEqual(adapter.writes, []);
  }
  for (const activation of [ { activatedAt: "bad", excludedSessionIds: [] },
    { activatedAt: instant, excludedSessionIds: ["x", "x"] },
    { activatedAt: instant, excludedSessionIds: [" x"] } ])
    assert.throws(() => parseXPData(JSON.stringify({ version: 1, activation })));
});

test("shared instances reread Session state, preserve legacy records and unrelated gameplay keys", async () => {
  const adapter = memory(); const { command, completed } = fixture(adapter);
  for (const key of ["ascend.player.v1", "ascend.rewards.v1", "ascend.career.v1", "ascend.matches.v1", "ascend.seasons.v1", "ascend.presentation.v1"])
    adapter.values.set(key, `untouched ${key}`);
  const original = new Map(adapter.values);
  const a = new SessionRepository(adapter, () => instant, () => null);
  const b = new SessionRepository(adapter, () => later, () => null);
  await Promise.all([a.load(), b.load()]);
  const results = await Promise.all([a.commit(command), b.commit(command)]);
  assert.deepEqual(results[0], results[1]);
  await new XPRepository(adapter, () => later).activate();
  for (const [k,v] of original) if (k !== SESSION_KEY) assert.equal(adapter.values.get(k), v);
  assert.deepEqual([...new Set(adapter.writes)].sort(), [XP_KEY, SESSION_KEY].sort());
  adapter.values.set(SESSION_KEY, JSON.stringify({ version: 1, active: null, completed: [completed] }));
  const legacy = adapter.values.get(SESSION_KEY);
  await new SessionRepository(adapter).load();
  assert.equal(adapter.values.get(SESSION_KEY), legacy);
});

test("lost Session acknowledgment survives repository remount without calendar regeneration", async () => {
  const adapter = memory(); const { command } = fixture(adapter);
  const first = new SessionRepository(adapter, () => instant, () => null);
  await first.load();
  const write = adapter.write;
  adapter.write = async (key, value) => { await write(key, value); throw Error("ack lost"); };
  await assert.rejects(first.commit(command), /ack lost/);
  const bytes = adapter.values.get(SESSION_KEY);
  adapter.write = write;
  const next = new SessionRepository(adapter, () => { throw Error("must not recapture"); });
  await next.load();
  const state = await next.commit(command);
  assert.equal(state.completed[0].completionContext.completedAt, instant);
  assert.equal(adapter.values.get(SESSION_KEY), bytes);
  assert.equal(adapter.writes.length, 1);
});

test("unavailable IANA lookup falls back to null without losing completion calendar", () => {
  const original = Intl.DateTimeFormat;
  try {
    Intl.DateTimeFormat = () => { throw Error("IANA unavailable"); };
    assert.equal(deviceTimeZone(), null);
    const context = captureCompletionContext(new Date(instant), deviceTimeZone());
    assert.ok(isCompletionContext(context, instant));
    assert.equal(context.timeZone, null);
  } finally { Intl.DateTimeFormat = original; }
});
