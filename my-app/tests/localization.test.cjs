const test = require("node:test"),
  assert = require("node:assert/strict");
const {
  SettingsRepository,
  SETTINGS_KEY,
  parseSettings,
} = require("../src/storage/settings-repository.ts");
const {
  translate,
  safeLocale,
  formatDate,
  formatMonth,
} = require("../src/localization/core.ts");
const {
  displayValue,
  displayError,
  exerciseName,
  targetText,
} = require("../src/localization/presentation.ts");
const { en } = require("../src/localization/locales/en.ts"),
  { ja } = require("../src/localization/locales/ja.ts");
function memory(raw) {
  const map = new Map(
    [
      "player",
      "sessions",
      "training",
      "coach",
      "career",
      "seasons",
      "rewards",
      "presentation",
    ].map((x) => [`ascend.${x}.v1`, JSON.stringify({ untouched: x })]),
  );
  if (raw !== undefined) map.set(SETTINGS_KEY, raw);
  let writes = 0,
    fail = false;
  return {
    map,
    get writes() {
      return writes;
    },
    set fail(v) {
      fail = v;
    },
    adapter: {
      read: async (k) => map.get(k) ?? null,
      write: async (k, v) => {
        if (fail) throw Error("write");
        writes++;
        map.set(k, v);
      },
      remove: async () => {
        throw Error("must not remove");
      },
    },
  };
}
test("missing settings defaults to English with zero writes", async () => {
  const m = memory();
  assert.equal(
    (await new SettingsRepository(m.adapter).load()).settings.locale,
    "en",
  );
  assert.equal(m.writes, 0);
  assert.equal(m.map.has(SETTINGS_KEY), false);
});
test("select Japanese, reload, English, reload; gameplay bytes unchanged", async () => {
  const m = memory(),
    before = [...m.map];
  let r = new SettingsRepository(m.adapter);
  await r.select("ja");
  r = new SettingsRepository(m.adapter);
  assert.equal((await r.load()).settings.locale, "ja");
  await r.select("en");
  assert.equal(
    (await new SettingsRepository(m.adapter).load()).settings.locale,
    "en",
  );
  assert.deepEqual(
    [...m.map].filter(([k]) => k !== SETTINGS_KEY),
    before,
  );
});
test("repeated current selection and concurrent taps are idempotent", async () => {
  const m = memory(),
    r = new SettingsRepository(m.adapter);
  await Promise.all([r.select("ja"), r.select("ja"), r.select("ja")]);
  assert.equal(m.writes, 1);
  assert.equal((await r.load()).settings.locale, "ja");
});
test("language change creates only the settings record", async () => {
  const m = memory(),
    r = new SettingsRepository(m.adapter);
  const keys = [...m.map.keys()];
  await r.select("ja");
  assert.deepEqual([...m.map.keys()], [...keys, SETTINGS_KEY]);
});
for (const raw of [
  "broken",
  JSON.stringify({ version: 2, settings: { locale: "ja" } }),
  JSON.stringify({ version: 1, settings: { locale: "fr" } }),
  JSON.stringify({ version: 1 }),
  "null",
])
  test("corrupt/unsupported settings preserved: " + raw, async () => {
    const m = memory(raw),
      r = new SettingsRepository(m.adapter),
      before = [...m.map];
    await assert.rejects(r.load());
    await assert.rejects(r.select("ja"));
    assert.deepEqual([...m.map], before);
    assert.equal(m.writes, 0);
  });
test("invalid locale rejected without any writes", async () => {
  const m = memory();
  await assert.rejects(new SettingsRepository(m.adapter).select("fr"));
  assert.equal(m.writes, 0);
});
test("failed write preserves durable language and all game keys; retry succeeds", async () => {
  const m = memory(JSON.stringify({ version: 1, settings: { locale: "en" } })),
    r = new SettingsRepository(m.adapter),
    before = [...m.map];
  m.fail = true;
  await assert.rejects(r.select("ja"));
  assert.deepEqual([...m.map], before);
  assert.equal((await r.load()).settings.locale, "en");
  m.fail = false;
  await r.select("ja");
  assert.equal((await r.load()).settings.locale, "ja");
});
test("read failure never overwrites unknown storage", async () => {
  const m = memory();
  m.adapter.read = async () => {
    throw Error("read");
  };
  await assert.rejects(new SettingsRepository(m.adapter).select("ja"));
  assert.equal(m.writes, 0);
});
test("keys and interpolation placeholders match in all supported languages", () => {
  assert.deepEqual(Object.keys(en).sort(), Object.keys(ja).sort());
  for (const key of Object.keys(en)) {
    assert.ok(ja[key].trim(), key);
    assert.deepEqual(
      [...en[key].matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort(),
      [...ja[key].matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort(),
      key,
    );
  }
});
test("semantic translations and interpolation in both languages", () => {
  assert.equal(translate("en", "nav.home"), "HOME");
  assert.equal(translate("ja", "nav.home"), "ホーム");
  assert.equal(translate("ja", "season.start"), "シーズン開始");
  assert.equal(translate("ja", "rewards.balance", { amount: 10 }), "10 コイン");
  assert.equal(
    translate("ja", "career.joinedDate", { date: "2026年10月5日" }),
    "2026年10月5日に加入",
  );
});
test("missing key/parameter and unsupported locale fallback deterministic", () => {
  assert.equal(translate("ja", "missing.key"), "missing.key");
  assert.equal(translate("en", "season.label"), "SEASON {number}");
  assert.equal(safeLocale("fr"), "en");
  assert.equal(translate("fr", "nav.home"), "HOME");
});
test("date/month render differently without changing canonical source", () => {
  const d = { at: "2026-10-05T12:00:00.000Z", month: "2026-10" },
    before = JSON.stringify(d);
  assert.equal(formatMonth("ja", d.month), "2026年10月");
  assert.equal(formatMonth("en", d.month), "OCTOBER 2026");
  assert.notEqual(formatDate("en", d.at), formatDate("ja", d.at));
  assert.equal(JSON.stringify(d), before);
  assert.equal(formatDate("ja", "bad"), "—");
});
test("exercise mapping preserves stable identity, custom names and renamed historical names", () => {
  const e = { id: "push-up", name: "Push-up", isCustom: false },
    before = JSON.stringify(e);
  assert.equal(exerciseName("ja", e), "腕立て伏せ");
  assert.equal(exerciseName("en", e), "Push-up");
  assert.equal(exerciseName("ja", { ...e, isCustom: true }), "Push-up");
  assert.equal(
    exerciseName("ja", { ...e, name: "Original push-up" }),
    "Original push-up",
  );
  assert.equal(JSON.stringify(e), before);
});
test("display adapters change body/targets only at presentation boundary", () => {
  assert.equal(displayValue("ja", "Chest"), "胸");
  assert.equal(targetText("ja", { type: "reps", reps: 12 }), "12 回");
  assert.equal(targetText("en", { type: "time", seconds: 30 }), "30 sec");
  assert.equal(
    displayError("ja", "Could not save. Please retry."),
    "保存できませんでした。再試行してください。",
  );
  assert.equal(displayError("ja", "日本語のエラー"), "日本語のエラー");
});
test("Coach display translation never changes stored recommendation", () => {
  const value = "Using 3 exercises to fit the available library and time.";
  assert.equal(
    displayValue("ja", value),
    "利用できる種目と時間に合わせて3種目にしています。",
  );
  assert.equal(displayValue("en", value), value);
});
test("settings copies are detached", async () => {
  const m = memory(),
    r = new SettingsRepository(m.adapter);
  const a = await r.select("ja");
  a.settings.locale = "en";
  assert.equal((await r.load()).settings.locale, "ja");
  assert.equal(parseSettings(null).settings.locale, "en");
});
