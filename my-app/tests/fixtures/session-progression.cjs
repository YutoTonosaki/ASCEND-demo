const { standardExercises } = require("../../src/data/exercises.ts");
const { defaultProfile } = require("../../src/coach/profile.ts");
const { newWorkout, newEntry } = require("../../src/training/plans.ts");
const { startSession, confirmSet, position } = require("../../src/sessions/domain.ts");
const { initializePlayer, reconcilePlayer } = require("../../src/growth/domain.ts");
const at = n => new Date(Date.UTC(2026, 8, 21) + n * 1000).toISOString();
const data = (...completed) => ({ version: 1, active: null, completed });
function workout(entries, offset) {
  const plan = {
    ...newWorkout(), name: "Progression QA",
    exercises: entries.map(([id, values]) => {
      const entry = newEntry(standardExercises.find(e => e.id === id));
      return { ...entry, restSeconds: 0,
        sets: values.map((_, i) => ({ ...entry.sets[0], id: entry.id + "-" + i })) };
    }),
  };
  const active = startSession(plan, standardExercises, at(offset));
  let completed = active;
  let time = offset;
  for (const [, values] of entries) for (const actual of values) {
    completed = confirmSet(completed, position(completed).set.id, actual, at(++time));
  }
  return { active, completed, plan };
}
function fixture() {
  const profile = defaultProfile(at(0));
  profile.baselineAssessments = ["push-up", "squat", "plank"].map(id => ({
    exercise: standardExercises.find(e => e.id === id), source: "known", recordedAt: at(0),
    actual: id === "plank" ? { type: "time", seconds: 30 } : { type: "reps", reps: 10 },
  }));
  const initial = initializePlayer("progression-player", at(10), profile, data());
  const first = workout([["push-up", [{ type: "reps", reps: 10 }]],
    ["squat", [{ type: "reps", reps: 10 }]]], 20).completed;
  const before = reconcilePlayer(initial, data(first), at(25));
  const target = workout([["push-up", [{ type: "reps", reps: 12 }, { type: "reps", reps: 13 }]],
    ["squat", [{ type: "reps", reps: 12 }]]], 30);
  const sessions = data(first, target.completed);
  const player = reconcilePlayer(before, sessions, at(40));
  return { initial, first, before, target, sessions, player };
}
function squatPRFixture() {
  const profile = defaultProfile(at(0));
  // Existing baseline APIs assess Legs and Core before the improved workout.
  profile.baselineAssessments = [
    { exercise: standardExercises.find(e => e.id === "squat"),
      actual: { type: "reps", reps: 30 }, source: "known", recordedAt: at(0) },
    { exercise: standardExercises.find(e => e.id === "plank"),
      actual: { type: "time", seconds: 30 }, source: "known", recordedAt: at(0) },
  ];
  const initial = initializePlayer("squat-pr-player", at(10), profile, data());
  const previous = workout([["squat", [{ type: "reps", reps: 30 }]]], 20).completed;
  const before = reconcilePlayer(initial, data(previous), at(25));
  const entry = newEntry(standardExercises.find(e => e.id === "squat"));
  const plan = { ...newWorkout(), name: "Squat PR 30 to 35",
    exercises: [{ ...entry, restSeconds: 0,
      sets: [{ ...entry.sets[0], reps: 35 }] }] };
  const active = startSession(plan, standardExercises, at(30));
  const completed = confirmSet(active, position(active).set.id,
    { type: "reps", reps: 35 }, at(40));
  return { profile, initial, previous, before, plan, active, completed };
}
module.exports = { at, data, workout, fixture, squatPRFixture };
