import { coachConfig as c, locationLabels } from "../config/coach";
import { trainingConfig } from "../config/training";
import { copyExercise, newId, newWorkout } from "../training/plans";
import { isExercise, isWorkout } from "../training/validation";
import { isSession } from "../sessions/domain";
import {
  defaultProfile,
  isPreferences,
  isProfile,
  profilePreferences,
} from "./profile";
import type { Exercise, WorkoutPlan, SetTarget } from "../types/training";
import type { ActualResult, WorkoutSession } from "../types/session";
import type { BodyArea } from "../types/domain";
import type {
  CoachPreferences,
  RecommendedExercise,
  SuggestedTarget,
  TrainingProfile,
  WorkoutRecommendation,
} from "../types/coach";
export function equipmentCompatible(
  exercise: Exercise,
  equipment: CoachPreferences["equipment"],
): boolean {
  return exercise.equipment.every(
    (item) => item === "Bodyweight" || equipment.includes(item),
  );
}
/** Renaming preserves evidence, changing movement metadata does not transfer it. */
export function sameMovement(a: Exercise, b: Exercise): boolean {
  const equal = (x: string[], y: string[]) =>
    [...x].sort().join("|") === [...y].sort().join("|");
  return (
    a.id === b.id &&
    a.trackingType === b.trackingType &&
    a.category === b.category &&
    a.isCustom === b.isCustom &&
    a.difficulty === b.difficulty &&
    a.progressionFamily === b.progressionFamily &&
    equal(a.equipment, b.equipment) &&
    equal(a.primaryBodyParts, b.primaryBodyParts) &&
    equal(a.secondaryBodyParts, b.secondaryBodyParts)
  );
}
const positive = (actual: ActualResult) =>
  actual.type === "time" ? actual.seconds > 0 : actual.reps > 0;
function usableTarget(actual: ActualResult): boolean {
  return (
    positive(actual) &&
    (actual.type === "time"
      ? actual.seconds <= trainingConfig.maxSeconds
      : actual.reps <= trainingConfig.maxReps &&
        (actual.type === "reps" ||
          actual.weightKg <= trainingConfig.maxWeightKg))
  );
}
function conservative(results: ActualResult[]): ActualResult {
  // Select an actual observed pair; never combine a high load with unrelated reps.
  return {
    ...[...results].sort((a, b) => {
      if (a.type === "time" && b.type === "time") return a.seconds - b.seconds;
      if (a.type === "weight_reps" && b.type === "weight_reps")
        return a.weightKg - b.weightKg || a.reps - b.reps;
      if (a.type !== "time" && b.type !== "time") return a.reps - b.reps;
      return 0;
    })[0],
  };
}
function targetSuggestion(
  exercise: Exercise,
  profile: TrainingProfile,
  history: WorkoutSession[],
  now: number,
  explicit: boolean,
): RecommendedExercise | null {
  let actuals: ActualResult[] | null = null;
  for (const session of history) {
    const entries = session.exercises.filter((entry) =>
      sameMovement(entry.exercise, exercise),
    );
    if (entries.length) {
      actuals = entries.flatMap((entry) =>
        entry.sets.flatMap((set) =>
          set.result ? [{ ...set.result.actual }] : [],
        ),
      );
      break;
    }
  }
  const baseline = profile.baselineAssessments.find(
    (b) =>
      sameMovement(b.exercise, exercise) &&
      Date.parse(b.recordedAt) <= now &&
      now - Date.parse(b.recordedAt) <= c.evidenceDays * 86400000,
  );
  const evidence: RecommendedExercise["evidence"] =
    actuals !== null
      ? "session"
      : baseline
        ? "baseline"
        : exercise.trackingType === "weight_reps"
          ? "confirmation"
          : "initial";
  const results = actuals ?? (baseline ? [baseline.actual] : null);
  let target: SuggestedTarget;
  let sets = 2;
  if (results) {
    // A recorded zero is evidence, not missing data. Do not replace it with guessed capacity.
    if (!results.length || results.some((result) => !usableTarget(result)))
      return null;
    target = conservative(results);
    sets = Math.min(2, results.length);
  } else if (exercise.trackingType === "weight_reps") {
    target = { type: "weight_reps", reps: c.initialReps, weightKg: null };
    sets = 1;
  } else {
    if (
      !explicit &&
      (!c.initialBodyweight.some((id) => id === exercise.id) ||
        exercise.equipment.some((item) => item !== "Bodyweight"))
    )
      return null;
    target =
      exercise.trackingType === "time"
        ? { type: "time", seconds: c.initialSeconds }
        : { type: "reps", reps: c.initialReps };
    if (exercise.isCustom) sets = 1;
  }
  return {
    exercise: copyExercise(exercise),
    targets: Array.from({ length: sets }, () => ({ ...target })),
    restSeconds: c.rest[profile.primaryGoal],
    evidence,
    explanation:
      evidence === "session"
        ? "Targets repeat a conservative result from your latest matching session; no automatic increase."
        : evidence === "baseline"
          ? "Target uses your optional baseline, not workout history."
          : evidence === "confirmation"
            ? "No recent working load is known. Choose and confirm a comfortable starting load."
            : exercise.isCustom
              ? "You selected this custom movement. Its difficulty is unknown; review this initial target."
              : "Initial suggestion without performance evidence. Adjust to a comfortable effort.",
  };
}
export function estimateSeconds(entries: RecommendedExercise[]): number {
  const sets = entries.flatMap((entry) =>
    entry.targets.map((target) => ({ target, rest: entry.restSeconds })),
  );
  return (
    sets.reduce(
      (seconds, set, index) =>
        seconds +
        (set.target.type === "time"
          ? set.target.seconds
          : set.target.reps * c.secondsPerRep) +
        (index < sets.length - 1 ? set.rest : 0),
      0,
    ) +
    entries.length * c.transitionSeconds
  );
}
/** Pure and deterministic: the caller supplies the reference time; never reads clocks or writes storage. */
export function generateWorkoutRecommendation(
  profile: TrainingProfile | null,
  library: Exercise[],
  sessions: WorkoutSession[] | null,
  overrides: CoachPreferences | null,
  nowISO: string,
): WorkoutRecommendation {
  const blocked = (reason: string): WorkoutRecommendation => ({
    status: "blocked",
    reason,
  });
  const now = Date.parse(nowISO);
  if (!Number.isFinite(now))
    return blocked("Choose a valid date before generating a workout.");
  const p = profile ?? defaultProfile(nowISO);
  if (!isProfile(p))
    return blocked("Check your training profile before generating a workout.");
  const preferences = overrides ?? profilePreferences(p);
  if (!isPreferences(preferences))
    return blocked("Check your time, exercise count and training preferences.");
  if (sessions === null || sessions.some((session) => !isSession(session)))
    return blocked(
      "Workout history is unavailable. Retry session storage or create a manual workout.",
    );
  const history = sessions
    .filter(
      (s) =>
        s.status === "completed" &&
        Date.parse(s.completedAt) <= now &&
        now - Date.parse(s.completedAt) <= c.evidenceDays * 86400000,
    )
    .sort(
      (a, b) =>
        Date.parse(b.completedAt!) - Date.parse(a.completedAt!) ||
        a.id.localeCompare(b.id),
    );
  const validLibrary = library.filter(isExercise);
  if (
    preferences.customExerciseIds.some(
      (id) => !validLibrary.some((e) => e.id === id && e.isCustom),
    )
  )
    return blocked(
      "A selected custom exercise is no longer available. Update your choices.",
    );
  const recent = new Map<BodyArea, number>();
  for (const session of history.filter(
    (s) => now - Date.parse(s.completedAt!) <= c.recentHours * 3600000,
  )) {
    for (const entry of session.exercises) {
      // Count participation for selection only, not effort, fatigue, readiness or recovery.
      const count = Math.min(
        2,
        entry.sets.filter((set) => set.result && positive(set.result.actual))
          .length,
      );
      for (const part of entry.exercise.primaryBodyParts)
        recent.set(part, (recent.get(part) ?? 0) + count);
      for (const part of entry.exercise.secondaryBodyParts)
        recent.set(part, (recent.get(part) ?? 0) + count * 0.25);
    }
  }
  const focus = preferences.bodyParts;
  const candidates = validLibrary
    .filter(
      (e) =>
        equipmentCompatible(e, preferences.equipment) &&
        (e.isCustom
          ? preferences.customExerciseIds.includes(e.id)
          : e.difficulty <= c.difficultyCeiling[p.experienceLevel]) &&
        (!focus.length ||
          focus.some(
            (part) =>
              e.primaryBodyParts.includes(part) ||
              e.secondaryBodyParts.includes(part),
          )),
    )
    .map((e) =>
      targetSuggestion(
        e,
        p,
        history,
        now,
        preferences.customExerciseIds.includes(e.id),
      ),
    )
    .filter((e): e is RecommendedExercise => e !== null);
  const selected: RecommendedExercise[] = [];
  const covered = new Set<BodyArea>();
  const families = new Set<string>();
  const score = (entry: RecommendedExercise) => {
    const e = entry.exercise;
    const primaryMatch = focus.filter(
      (part) => !covered.has(part) && e.primaryBodyParts.includes(part),
    ).length;
    const secondaryMatch = focus.filter(
      (part) => !covered.has(part) && e.secondaryBodyParts.includes(part),
    ).length;
    const primaryVariety = e.primaryBodyParts.filter(
      (part) => !covered.has(part),
    ).length;
    const recentUse =
      e.primaryBodyParts.reduce((n, part) => n + (recent.get(part) ?? 0), 0) +
      e.secondaryBodyParts.reduce(
        (n, part) => n + (recent.get(part) ?? 0) * 0.25,
        0,
      );
    const preferred = c.initialBodyweight.findIndex((id) => id === e.id);
    return (
      primaryMatch * 100 +
      secondaryMatch * 20 +
      primaryVariety * 15 -
      (families.has(e.progressionFamily ?? e.id) ? 40 : 0) -
      recentUse * (focus.length ? 2 : 15) +
      (entry.evidence === "session" ? 5 : 0) +
      (p.primaryGoal === "fitness" &&
      ["Core", "Athletic", "Endurance"].includes(e.category)
        ? 4
        : 0) +
      (preferred >= 0 ? (c.initialBodyweight.length - preferred) / 10 : 0)
    );
  };
  while (candidates.length && selected.length < preferences.exerciseCount) {
    candidates.sort(
      (a, b) =>
        score(b) - score(a) || a.exercise.id.localeCompare(b.exercise.id),
    );
    const next = candidates.shift()!;
    selected.push(next);
    next.exercise.primaryBodyParts.forEach((part) => covered.add(part));
    next.exercise.secondaryBodyParts
      .filter((part) => focus.includes(part))
      .forEach((part) => covered.add(part));
    families.add(next.exercise.progressionFamily ?? next.exercise.id);
  }
  if (!selected.length)
    return blocked(
      "No compatible starting recommendation is available for this focus, equipment and performance evidence. Change your choices or create a manual workout.",
    );
  if (focus.some((part) => !covered.has(part)))
    return blocked(
      "The library cannot cover every selected body part within this exercise count and equipment. Adjust the focus/count or create a manual workout.",
    );
  const explanations: string[] = [
    `Uses only your selected equipment for ${locationLabels[preferences.location]}.`,
    "Duration is approximate; rests are retained. Adjust targets to a comfortable effort.",
  ];
  if (!profile)
    explanations.push(
      "Using beginner, strength and bodyweight defaults until you save a profile.",
    );
  const recentlySelected = [
    ...new Set(selected.flatMap((entry) => entry.exercise.primaryBodyParts)),
  ].filter((part) => (recent.get(part) ?? 0) > 0);
  if (recent.size)
    explanations.push(
      focus.length && recentlySelected.length
        ? `${recentlySelected.join(", ")} was involved recently. You can keep this focus, choose another, or rest.`
        : "Recent confirmed training influences exercise selection; this is not a recovery estimate. Rest is also an option.",
    );
  if (!focus.length && recentlySelected.length) {
    selected.forEach((entry) => {
      if (
        entry.exercise.primaryBodyParts.some(
          (part) => (recent.get(part) ?? 0) > 0,
        )
      )
        entry.targets = entry.targets.slice(0, 1);
    });
    explanations.push("Recently involved areas use one set in this proposal.");
  }
  const requestedCount = selected.length;
  while (estimateSeconds(selected) > preferences.durationMinutes * 60) {
    const multiple = [...selected]
      .reverse()
      .find((entry) => entry.targets.length > 1);
    if (multiple) {
      multiple.targets.pop();
      continue;
    }
    const removeIndex = selected.findLastIndex((entry, index) =>
      focus.every((part) =>
        selected.some(
          (other, otherIndex) =>
            otherIndex !== index &&
            (other.exercise.primaryBodyParts.includes(part) ||
              other.exercise.secondaryBodyParts.includes(part)),
        ),
      ),
    );
    if (selected.length <= 1 || removeIndex < 0)
      return blocked(
        "These targets and rest do not fit the available time. Allow more time, narrow your focus or make a manual workout.",
      );
    selected.splice(removeIndex, 1);
  }
  if (
    selected.length < preferences.exerciseCount ||
    requestedCount !== selected.length
  )
    explanations.push(
      `Using ${selected.length} exercise${selected.length === 1 ? "" : "s"} to fit the available library and time.`,
    );
  for (const part of focus)
    if (
      !selected.some((entry) => entry.exercise.primaryBodyParts.includes(part))
    )
      explanations.push(
        `${part} is included as a secondary area, not a primary focus, in this library selection.`,
      );
  return {
    status: "ready",
    name: focus.length ? `${focus.join(" + ")} training` : "Today's training",
    exercises: selected,
    estimatedSeconds: estimateSeconds(selected),
    explanations,
  };
}
/** Conversion creates real plan IDs only after review; unknown loads cannot become silent zeroes. */
export function recommendationToPlan(
  recommendation: WorkoutRecommendation,
  library: Exercise[],
  confirmedLoads: Record<string, number> = {},
): WorkoutPlan {
  if (recommendation.status !== "ready")
    throw new Error("Generate a valid recommendation first.");
  const plan: WorkoutPlan = {
    ...newWorkout(),
    name: recommendation.name,
    exercises: recommendation.exercises.map((entry) => {
      const current = library.find((e) => e.id === entry.exercise.id);
      if (!current || !sameMovement(entry.exercise, current))
        throw new Error("An exercise changed. Generate a new recommendation.");
      const sets: SetTarget[] = entry.targets.map((target) => {
        if (target.type === "weight_reps" && target.weightKg === null) {
          const weightKg = confirmedLoads[entry.exercise.id];
          if (
            !Number.isFinite(weightKg) ||
            weightKg < 0 ||
            weightKg > trainingConfig.maxWeightKg
          )
            throw new Error(
              `Choose and confirm a starting load for ${entry.exercise.name}.`,
            );
          return {
            id: newId(),
            type: "weight_reps",
            reps: target.reps,
            weightKg,
          };
        }
        if (target.type === "weight_reps")
          return {
            id: newId(),
            type: "weight_reps",
            reps: target.reps,
            weightKg: target.weightKg!,
          };
        return { ...target, id: newId() };
      });
      return {
        id: newId(),
        exerciseId: current.id,
        restSeconds: entry.restSeconds,
        sets,
      };
    }),
  };
  if (!isWorkout(plan, library))
    throw new Error(
      "This recommendation is invalid. Adjust your preferences and retry.",
    );
  return plan;
}
