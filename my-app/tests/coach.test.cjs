const { test } = require("node:test");
const assert = require("node:assert/strict");
const { standardExercises } = require("../src/data/exercises.ts");
const {
  newWorkout,
  newEntry,
  copyExercise,
} = require("../src/training/plans.ts");
const { isWorkout } = require("../src/training/validation.ts");
const {
  startSession,
  confirmSet,
  position,
} = require("../src/sessions/domain.ts");
const {
  generateWorkoutRecommendation: generate,
  recommendationToPlan,
  equipmentCompatible,
  estimateSeconds,
} = require("../src/coach/engine.ts");
const {
  defaultProfile,
  profilePreferences,
  isProfile,
  copyProfile,
} = require("../src/coach/profile.ts");
const {
  CoachRepository,
  COACH_KEY,
} = require("../src/storage/coach-repository.ts");
const {
  TrainingRepository,
  TRAINING_KEY,
} = require("../src/storage/training-repository.ts");
const {
  SessionRepository,
  SESSION_KEY,
} = require("../src/storage/session-repository.ts");
const now = "2026-09-19T12:00:00.000Z";
const profile = () => defaultProfile(now);
const byId = (id) => standardExercises.find((e) => e.id === id);
function preferences(overrides = {}) {
  return { ...profilePreferences(profile()), ...overrides };
}
function history(
  id,
  actuals,
  date = "2026-09-18T12:00:00.000Z",
  exercise = byId(id),
) {
  const entry = newEntry(exercise);
  entry.restSeconds = 0;
  entry.sets = actuals.map((_, i) => ({ ...entry.sets[0], id: "target-" + i }));
  const plan = { ...newWorkout(), name: "Recorded", exercises: [entry] };
  let session = startSession(plan, [exercise], date);
  for (const actual of actuals)
    session = confirmSet(session, position(session).set.id, actual, date);
  return session;
}
function ready(
  p = profile(),
  library = standardExercises,
  sessions = [],
  prefs = null,
) {
  const result = generate(p, library, sessions, prefs, now);
  assert.equal(result.status, "ready", result.reason);
  return result;
}
function memory() {
  const values = new Map();
  return {
    values,
    read: async (k) => values.get(k) ?? null,
    write: async (k, v) => {
      values.set(k, v);
    },
    remove: async (k) => {
      values.delete(k);
    },
  };
}
test("profile defaults preserve omitted measurements and skipped baselines", () => {
  const p = profile();
  assert.ok(isProfile(p));
  assert.equal(p.heightCm, null);
  assert.equal(p.weightKg, null);
  assert.equal(p.primaryGoal, "strength");
  assert.deepEqual(p.baselineAssessments, []);
  assert.ok(ready(null).explanations.some((x) => x.includes("defaults")));
});
test("profile creation, editing/reload and detached input/output", async () => {
  const adapter = memory(),
    repo = new CoachRepository(adapter);
  assert.equal((await repo.load()).profile, null);
  const p = profile();
  p.baselineAssessments = [
    {
      exercise: copyExercise(byId("push-up")),
      actual: { type: "reps", reps: 8 },
      source: "known",
      recordedAt: now,
    },
  ];
  const pending = repo.save(p);
  p.availableEquipment.push("Machine");
  p.baselineAssessments[0].actual.reps = 999;
  const saved = await pending;
  assert.deepEqual(saved.profile.availableEquipment, ["Bodyweight"]);
  assert.equal(saved.profile.baselineAssessments[0].actual.reps, 8);
  saved.profile.availableEquipment.push("Other");
  assert.deepEqual((await repo.load()).profile.availableEquipment, [
    "Bodyweight",
  ]);
  const edited = copyProfile((await repo.load()).profile);
  edited.primaryGoal = "fitness";
  edited.preferredDurationMinutes = 5;
  edited.id = "replacement";
  edited.createdAt = "2020-01-01T00:00:00.000Z";
  await repo.save(edited);
  const restored = (await new CoachRepository(adapter).load()).profile;
  assert.equal(restored.id, "training-profile");
  assert.equal(restored.createdAt, now);
  assert.equal(restored.primaryGoal, "fitness");
  assert.equal(restored.preferredDurationMinutes, 5);
});
test("invalid numeric fields, dates, enums and baseline structures are rejected", () => {
  for (const edit of [
    (p) => (p.heightCm = NaN),
    (p) => (p.weightKg = 0),
    (p) => (p.preferredDurationMinutes = 0),
    (p) => (p.preferredExerciseCount = 1.5),
    (p) => (p.preferredTrainingDaysPerWeek = 8),
    (p) => (p.experienceLevel = "expert"),
    (p) => (p.availableEquipment = ["Imaginary"]),
    (p) => (p.createdAt = "bad"),
    (p) => (p.id = " "),
    (p) =>
      (p.baselineAssessments = [
        {
          exercise: byId("plank"),
          actual: { type: "reps", reps: 5 },
          source: "known",
          recordedAt: now,
        },
      ]),
  ]) {
    const p = profile();
    edit(p);
    assert.equal(isProfile(p), false);
  }
});
test("equipment is a hard all-required constraint; bodyweight is implicit", () => {
  assert.equal(equipmentCompatible(byId("bench-press"), ["Barbell"]), false);
  assert.equal(
    equipmentCompatible(byId("bench-press"), ["Barbell", "Bench"]),
    true,
  );
  assert.equal(equipmentCompatible(byId("pull-up"), []), false);
  assert.equal(equipmentCompatible(byId("push-up"), []), true);
  const result = ready(
    profile(),
    standardExercises,
    [],
    preferences({ equipment: [] }),
  );
  assert.ok(
    result.exercises.every((e) =>
      e.exercise.equipment.every((x) => x === "Bodyweight"),
    ),
  );
});
test("automatic no-history recommendation is deterministic, short and valid after conversion", () => {
  const a = ready(),
    b = ready();
  assert.deepEqual(a, b);
  assert.ok(a.exercises.length <= 3);
  assert.ok(a.estimatedSeconds <= 8 * 60);
  assert.ok(a.exercises.every((e) => e.evidence === "initial"));
  assert.ok(
    isWorkout(recommendationToPlan(a, standardExercises), standardExercises),
  );
});
test("directed focus is honored and cannot silently fall back to an unrelated body part", () => {
  const chest = ready(
    profile(),
    standardExercises,
    [],
    preferences({ bodyParts: ["Chest"] }),
  );
  assert.ok(
    chest.exercises.every(
      (e) =>
        e.exercise.primaryBodyParts.includes("Chest") ||
        e.exercise.secondaryBodyParts.includes("Chest"),
    ),
  );
  assert.equal(
    generate(
      profile(),
      standardExercises,
      [],
      preferences({ bodyParts: ["Back"], equipment: [] }),
      now,
    ).status,
    "blocked",
  );
  const arms = ready(
    profile(),
    standardExercises,
    [],
    preferences({ bodyParts: ["Arms"] }),
  );
  assert.ok(arms.explanations.some((x) => x.includes("secondary")));
});
test("empty library, invalid constraints and missing/corrupt history fail clearly", () => {
  assert.equal(generate(profile(), [], [], null, now).status, "blocked");
  assert.equal(
    generate(profile(), standardExercises, null, null, now).status,
    "blocked",
  );
  assert.equal(
    generate(profile(), standardExercises, [{ status: "completed" }], null, now)
      .status,
    "blocked",
  );
  for (const durationMinutes of [0, -1, Infinity, 121])
    assert.equal(
      generate(
        profile(),
        standardExercises,
        [],
        preferences({ durationMinutes }),
        now,
      ).status,
      "blocked",
    );
});
for (const [id, actuals, expected] of [
  [
    "push-up",
    [
      { type: "reps", reps: 12 },
      { type: "reps", reps: 10 },
    ],
    { type: "reps", reps: 10 },
  ],
  [
    "bench-press",
    [
      { type: "weight_reps", weightKg: 52.5, reps: 7 },
      { type: "weight_reps", weightKg: 50, reps: 8 },
    ],
    { type: "weight_reps", weightKg: 50, reps: 8 },
  ],
  [
    "plank",
    [
      { type: "time", seconds: 42 },
      { type: "time", seconds: 38 },
    ],
    { type: "time", seconds: 38 },
  ],
])
  test(`confirmed ${id} evidence supplies independent conservative targets`, () => {
    const exercise = byId(id),
      sessions = [history(id, actuals)];
    const before = structuredClone(sessions);
    const result = ready(
      profile(),
      [exercise],
      sessions,
      preferences({
        equipment: exercise.equipment,
        bodyParts: exercise.primaryBodyParts,
      }),
    );
    assert.equal(result.exercises[0].evidence, "session");
    assert.deepEqual(result.exercises[0].targets[0], expected);
    assert.deepEqual(sessions, before);
    result.exercises[0].targets[0].reps = 99;
    assert.deepEqual(sessions, before);
  });
test("unknown working load requires explicit confirmation; explicit zero load remains valid", () => {
  const result = ready(
    profile(),
    [byId("bench-press")],
    [],
    preferences({ equipment: ["Barbell", "Bench"], bodyParts: ["Chest"] }),
  );
  assert.equal(result.exercises[0].targets[0].weightKg, null);
  assert.equal(result.exercises[0].evidence, "confirmation");
  assert.throws(
    () => recommendationToPlan(result, standardExercises),
    /confirm/,
  );
  assert.throws(() =>
    recommendationToPlan(result, standardExercises, { "bench-press": NaN }),
  );
  const plan = recommendationToPlan(result, standardExercises, {
    "bench-press": 0,
  });
  assert.equal(plan.exercises[0].sets[0].weightKg, 0);
  assert.ok(isWorkout(plan, standardExercises));
});
test("zero performance is not missing evidence and does not fall back to a generic/baseline target", () => {
  const p = profile();
  p.baselineAssessments = [
    {
      exercise: copyExercise(byId("push-up")),
      actual: { type: "reps", reps: 12 },
      source: "known",
      recordedAt: now,
    },
  ];
  assert.equal(
    generate(
      p,
      [byId("push-up")],
      [history("push-up", [{ type: "reps", reps: 0 }])],
      null,
      now,
    ).status,
    "blocked",
  );
  for (const [id, actual] of [
    ["plank", { type: "time", seconds: 0 }],
    ["bench-press", { type: "weight_reps", weightKg: 50, reps: 0 }],
  ])
    assert.equal(
      generate(
        profile(),
        [byId(id)],
        [history(id, [actual])],
        preferences({ equipment: byId(id).equipment }),
        now,
      ).status,
      "blocked",
    );
  const zeroLoad = ready(
    profile(),
    [byId("bench-press")],
    [history("bench-press", [{ type: "weight_reps", weightKg: 0, reps: 8 }])],
    preferences({ equipment: ["Barbell", "Bench"] }),
  );
  assert.equal(zeroLoad.exercises[0].targets[0].weightKg, 0);
});
test("baseline is separate, optional, zero-aware and overridden by completed matching evidence", () => {
  const p = profile();
  p.baselineAssessments = [
    {
      exercise: copyExercise(byId("plank")),
      actual: { type: "time", seconds: 25 },
      source: "performed",
      recordedAt: now,
    },
  ];
  const result = ready(p, [byId("plank")]);
  assert.equal(result.exercises[0].evidence, "baseline");
  assert.equal(result.exercises[0].targets[0].seconds, 25);
  const session = history("plank", [{ type: "time", seconds: 20 }]);
  assert.equal(
    ready(p, [byId("plank")], [session]).exercises[0].targets[0].seconds,
    20,
  );
  p.baselineAssessments[0].actual.seconds = 0;
  assert.ok(isProfile(p));
  assert.equal(generate(p, [byId("plank")], [], null, now).status, "blocked");
});
test("recent body-part involvement shifts automatic selection; explicit choices remain allowed with reminder", () => {
  const sessions = [
    history("push-up", [
      { type: "reps", reps: 12 },
      { type: "reps", reps: 10 },
    ]),
  ];
  const automatic = ready(
    profile(),
    standardExercises,
    sessions,
    preferences({ exerciseCount: 1 }),
  );
  assert.ok(
    !automatic.exercises[0].exercise.primaryBodyParts.includes("Chest"),
  );
  const directed = ready(
    profile(),
    standardExercises,
    sessions,
    preferences({ exerciseCount: 1, bodyParts: ["Chest"] }),
  );
  assert.ok(directed.exercises[0].exercise.primaryBodyParts.includes("Chest"));
  assert.ok(
    directed.explanations.some((x) => x.includes("was involved recently")),
  );
});
test("custom difficulty is never assumed; explicit familiar-custom choice is required", () => {
  const custom = {
    ...copyExercise(byId("push-up")),
    id: "custom-coach",
    name: "My movement",
    isCustom: true,
    difficulty: null,
    progressionFamily: null,
  };
  assert.equal(generate(profile(), [custom], [], null, now).status, "blocked");
  const result = ready(
    profile(),
    [custom],
    [],
    preferences({ customExerciseIds: [custom.id] }),
  );
  assert.ok(result.exercises[0].explanation.includes("unknown"));
  assert.equal(
    generate(
      profile(),
      [],
      [],
      preferences({ customExerciseIds: [custom.id] }),
      now,
    ).status,
    "blocked",
  );
});
test("renames retain matching evidence but incompatible metadata does not reuse old capacity", () => {
  const session = history("push-up", [{ type: "reps", reps: 20 }]);
  const renamed = { ...copyExercise(byId("push-up")), name: "Renamed" };
  assert.equal(
    ready(profile(), [renamed], [session]).exercises[0].targets[0].reps,
    20,
  );
  const changed = { ...renamed, equipment: ["Dumbbell"] };
  assert.equal(
    generate(
      profile(),
      [changed],
      [session],
      preferences({ equipment: ["Dumbbell"] }),
      now,
    ).status,
    "blocked",
  );
  const result = ready();
  assert.throws(() => recommendationToPlan(result, []), /changed/);
});
test("count and time constraints reduce sets/exercises without shortening rest", () => {
  const one = ready(
    profile(),
    standardExercises,
    [],
    preferences({ exerciseCount: 1, durationMinutes: 1 }),
  );
  assert.equal(one.exercises.length, 1);
  assert.equal(one.exercises[0].targets.length, 1);
  assert.equal(one.exercises[0].restSeconds, 90);
  assert.ok(one.estimatedSeconds <= 60);
  const timed = ready(profile(), [byId("plank")]);
  assert.equal(estimateSeconds(timed.exercises), 15 * 2 + 90 + 20);
  const huge = history("plank", [{ type: "time", seconds: 300 }]);
  assert.equal(
    generate(
      profile(),
      [byId("plank")],
      [huge],
      preferences({ durationMinutes: 1 }),
      now,
    ).status,
    "blocked",
  );
});
test("height/weight never change recommended capacity; profile edits leave plans/history intact", () => {
  const p = profile(),
    measurements = { ...p, heightCm: 200, weightKg: 150 };
  const sessions = [history("push-up", [{ type: "reps", reps: 8 }])];
  const before = structuredClone(sessions);
  assert.deepEqual(
    ready(p, standardExercises, sessions),
    ready(measurements, standardExercises, sessions),
  );
  assert.deepEqual(sessions, before);
  const plan = recommendationToPlan(ready(), standardExercises),
    copy = structuredClone(plan);
  p.primaryGoal = "fitness";
  ready(p);
  assert.deepEqual(plan, copy);
});
test("a proposal creates no storage evidence; acceptance produces editable plans that execute normally", async () => {
  const adapter = memory(),
    training = new TrainingRepository(adapter),
    sessions = new SessionRepository(adapter);
  await training.load();
  await sessions.load();
  const proposal = ready();
  assert.equal(adapter.values.size, 0);
  const plan = recommendationToPlan(proposal, standardExercises);
  plan.name = "Edited Coach";
  plan.exercises = plan.exercises.slice(0, 1);
  plan.exercises[0].sets = plan.exercises[0].sets.slice(0, 1);
  plan.exercises[0].sets[0].reps = 5;
  await training.commit({ type: "saveWorkout", workout: plan });
  assert.ok(!adapter.values.has(SESSION_KEY));
  let state = await sessions.commit({
    type: "start",
    plan,
    library: standardExercises,
  });
  state = await sessions.commit({
    type: "confirm",
    sessionId: state.active.id,
    setId: position(state.active).set.id,
    actual: { type: "reps", reps: 4 },
  });
  assert.equal(state.completed.length, 1);
  assert.equal(state.completed[0].exercises[0].sets[0].target.reps, 5);
  assert.equal(state.completed[0].exercises[0].sets[0].result.actual.reps, 4);
});
test("corrupt coach storage/reset never touches plans or sessions; backups and errors are recoverable", async () => {
  for (const raw of ["broken", JSON.stringify({ version: 2, profile: null })]) {
    const adapter = memory();
    adapter.values.set(COACH_KEY, raw);
    adapter.values.set(TRAINING_KEY, "plans");
    adapter.values.set(SESSION_KEY, "sessions");
    const repo = new CoachRepository(adapter);
    await assert.rejects(repo.load());
    await assert.rejects(repo.save(profile()));
    assert.equal(adapter.values.get(COACH_KEY), raw);
    const write = adapter.write;
    adapter.write = async () => {
      throw new Error("disk full");
    };
    await assert.rejects(repo.reset());
    assert.equal(adapter.values.get(COACH_KEY), raw);
    adapter.write = write;
    await repo.reset();
    assert.ok(
      [...adapter.values].some(
        ([key, value]) =>
          key.startsWith(COACH_KEY + ".backup.") && value === raw,
      ),
    );
    assert.equal(adapter.values.get(TRAINING_KEY), "plans");
    assert.equal(adapter.values.get(SESSION_KEY), "sessions");
  }
});
test("failed profile save/reload cannot publish or overwrite stale state; queue recovers", async () => {
  const adapter = memory(),
    repo = new CoachRepository(adapter);
  const loading = repo.load();
  const saving = repo.save(profile());
  await loading;
  await saving;
  const write = adapter.write;
  adapter.write = async () => {
    throw new Error("full");
  };
  await assert.rejects(repo.save({ ...profile(), primaryGoal: "fitness" }));
  adapter.write = write;
  assert.equal((await repo.load()).profile.primaryGoal, "strength");
  adapter.values.set(COACH_KEY, "bad");
  await assert.rejects(repo.load());
  await assert.rejects(repo.save(profile()));
  assert.equal(adapter.values.get(COACH_KEY), "bad");
  const reset = repo.reset();
  const after = repo.save(profile());
  await reset;
  assert.ok((await after).profile);
});

test('stale/future/active sessions cannot masquerade as recent completed performance', () => {
  const old = history('push-up', [{ type: 'reps', reps: 90 }], '2020-01-01T00:00:00.000Z');
  const future = history('push-up', [{ type: 'reps', reps: 90 }], '2030-01-01T00:00:00.000Z');
  const plan = { ...newWorkout(), name: 'Not completed', exercises: [newEntry(byId('push-up'))] };
  const active = startSession(plan, standardExercises, now);
  for (const session of [old, future, active]) {
    const result = ready(profile(), [byId('push-up')], [session]);
    assert.equal(result.exercises[0].evidence, 'initial');
    assert.equal(result.exercises[0].targets[0].reps, 6);
  }
});

test('proposal output and accepted plans never share mutable catalog/profile targets', () => {
  const p = profile();
  const library = standardExercises.map(copyExercise);
  const before = structuredClone(library);
  const result = ready(p, library);
  result.exercises[0].exercise.equipment.push('Other');
  assert.deepEqual(library, before);
  assert.deepEqual(p, profile());
  const clean = ready(p, library);
  const plan = recommendationToPlan(clean, library);
  plan.exercises[0].sets[0].reps = 99;
  assert.equal(clean.exercises[0].targets[0].reps, 6);
  assert.deepEqual(library, before);
});
