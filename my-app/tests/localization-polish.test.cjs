const test = require("node:test");
const assert = require("node:assert/strict");
const {
  exerciseName,
  displayValue,
} = require("../src/localization/presentation.ts");
const {
  exerciseNames,
  exerciseNameAliases,
} = require("../src/localization/exercise-names.ts");
const { translate } = require("../src/localization/core.ts");
const { standardExercises } = require("../src/data/exercises.ts");
const { recovery } = require("../src/data/mock.ts");
const { newWorkout, newEntry } = require("../src/training/plans.ts");
const {
  startSession,
  confirmSet,
  position,
} = require("../src/sessions/domain.ts");
const { derivePersonalRecords } = require("../src/records/domain.ts");

test("recovery display translates all existing states without changing source status", () => {
  const before = JSON.stringify(recovery);
  const expected = {
    Ready: "トレーニング可能",
    Recovering: "回復中",
    Moderate: "一部回復中",
  };
  for (const item of recovery) {
    assert.equal(displayValue("en", item.state), item.state);
    assert.equal(displayValue("ja", item.state), expected[item.state]);
  }
  assert.equal(JSON.stringify(recovery), before);
});
test("every catalog identity has an exact Japanese display mapping", () => {
  assert.deepEqual(
    Object.keys(exerciseNames).sort(),
    standardExercises.map((e) => e.id).sort(),
  );
  for (const exercise of standardExercises) {
    assert.equal(exerciseNames[exercise.id].en, exercise.name);
    assert.equal(exerciseName("ja", exercise), exerciseNames[exercise.id].ja);
    assert.notEqual(exerciseName("ja", exercise), exercise.name);
    assert.equal(exerciseName("en", exercise), exercise.name);
  }
});
test("explicit aliases are scoped to built-in IDs, not names or fuzzy matching", () => {
  for (const [id, aliases] of Object.entries(exerciseNameAliases))
    for (const name of aliases) {
      assert.equal(exerciseName("ja", { id, name }), exerciseNames[id].ja);
      assert.equal(exerciseName("en", { id, name }), name);
      assert.equal(
        exerciseName("ja", { id: "custom-legacy", name, isCustom: true }),
        name,
      );
      assert.equal(exerciseName("ja", { id: "unknown", name }), name);
    }
  assert.equal(
    exerciseName("ja", { id: "decline-push-up", name: "Decline Push-Up " }),
    "Decline Push-Up ",
  );
});
test("unidentified observed names, custom names and renamed snapshots are preserved", () => {
  const names = [
    "Demo",
    "Demo2",
    "Demo4",
    "Demo6",
    "Bicycle Crunch",
    "Hindu Push-up",
    "Leg Raise",
    "Reverse Crunch",
    "Reverse Grip Push-Up",
    "V Up",
    "typewriter Push-Up",
  ];
  for (const name of names) {
    assert.equal(
      exerciseName("ja", { id: "custom-test", name, isCustom: true }),
      name,
    );
    assert.equal(exerciseName("ja", { id: "unknown", name }), name);
    assert.equal(exerciseName("ja", { id: "decline-push-up", name }), name);
  }
});
test("historical alias display preserves completed evidence and derived PR records", () => {
  const exercise = {
    ...standardExercises.find((e) => e.id === "decline-push-up"),
    name: "Decline Push-Up",
  };
  const entry = newEntry(exercise);
  const plan = {
    ...newWorkout(),
    name: "History",
    exercises: [{ ...entry, sets: entry.sets.slice(0, 1), restSeconds: 0 }],
  };
  let session = startSession(plan, [exercise], "2026-10-01T12:00:00.000Z");
  session = confirmSet(
    session,
    position(session).set.id,
    { type: "reps", reps: 12 },
    "2026-10-01T12:01:00.000Z",
  );
  const records = derivePersonalRecords([session]);
  const before = JSON.stringify({ session, records });
  for (const entry of session.exercises)
    assert.equal(
      exerciseName("ja", entry.exercise),
      "デクラインプッシュアップ",
    );
  for (const record of records.records)
    assert.equal(
      exerciseName("ja", { id: record.exerciseId, name: record.name }),
      "デクラインプッシュアップ",
    );
  assert.equal(JSON.stringify({ session, records }), before);
  assert.deepEqual(derivePersonalRecords([session]), records);
});
test("Japanese rating and card terms retain their meaning", () => {
  assert.equal(translate("ja", "player.rating"), "プレイヤー能力値");
  assert.equal(translate("ja", "player.bodyRatings"), "部位別能力値");
  assert.equal(
    translate("ja", "card.finish", {
      finish: translate("ja", "card.standard"),
    }),
    "仕上げ：スタンダード",
  );
});
test("Season summary interpolates actual workout/day counts naturally", () => {
  for (const [workouts, days] of [
    [0, 0],
    [1, 1],
    [5, 3],
  ]) {
    assert.equal(
      translate("ja", "season.activitySummary", { workouts, days }),
      `${workouts}回のワークアウト・トレーニング${days}日`,
    );
    assert.equal(
      translate("en", "season.activitySummary", { workouts, days }),
      `${workouts} WORKOUTS · ${days} TRAINING DAYS`,
    );
  }
});
