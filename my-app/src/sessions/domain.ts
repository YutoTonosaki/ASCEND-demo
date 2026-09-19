import { copyExercise, newId } from "../training/plans";
import { isExercise, isTarget, isWorkout } from "../training/validation";
import { trainingConfig as c } from "../config/training";
import type { Exercise, SetTarget, WorkoutPlan } from "../types/training";
import type {
  ActualResult,
  SessionData,
  WorkoutSession,
} from "../types/session";
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const id = (v: unknown): v is string =>
  typeof v === "string" && v.trim() === v && v.length > 0 && v.length <= 150;
const date = (v: unknown): v is string =>
  typeof v === "string" &&
  Number.isFinite(Date.parse(v)) &&
  new Date(v).toISOString() === v;
const nonnegative = (v: unknown, integer = true): v is number =>
  typeof v === "number" &&
  Number.isFinite(v) &&
  v >= 0 &&
  (!integer || Number.isSafeInteger(v));
export function isActual(
  v: unknown,
  type: SetTarget["type"],
): v is ActualResult {
  if (!record(v) || v.type !== type) return false;
  const keys =
    type === "time"
      ? ["type", "seconds"]
      : type === "reps"
        ? ["type", "reps"]
        : ["type", "reps", "weightKg"];
  return (
    Object.keys(v).every((k) => keys.includes(k)) &&
    (type === "time"
      ? nonnegative(v.seconds)
      : nonnegative(v.reps) &&
        (type === "reps" || nonnegative(v.weightKg, false)))
  );
}
export function prefill(target: SetTarget): ActualResult {
  switch (target.type) {
    case "reps":
      return { type: "reps", reps: target.reps };
    case "weight_reps":
      return {
        type: "weight_reps",
        reps: target.reps,
        weightKg: target.weightKg,
      };
    case "time":
      return { type: "time", seconds: target.seconds };
  }
}
export function copySession(session: WorkoutSession): WorkoutSession {
  return {
    ...session,
    exercises: session.exercises.map((entry) => ({
      ...entry,
      exercise: copyExercise(entry.exercise),
      sets: entry.sets.map((set) => ({
        ...set,
        target: { ...set.target },
        result: set.result
          ? { ...set.result, actual: { ...set.result.actual } }
          : null,
      })),
    })),
  };
}
export function copySessionData(data: SessionData): SessionData {
  return {
    version: 1,
    active: data.active ? copySession(data.active) : null,
    completed: data.completed.map(copySession),
  };
}
export function position(session: WorkoutSession) {
  for (const [exerciseIndex, entry] of session.exercises.entries()) {
    const setIndex = entry.sets.findIndex((set) => set.result === null);
    if (setIndex >= 0)
      return { entry, set: entry.sets[setIndex], exerciseIndex, setIndex };
  }
  return null;
}
export function isSession(v: unknown): v is WorkoutSession {
  if (
    !record(v) ||
    !id(v.id) ||
    !id(v.sourceWorkoutId) ||
    typeof v.name !== "string" ||
    !v.name.trim() ||
    v.name.length > c.maxNameLength ||
    !date(v.startedAt) ||
    !Array.isArray(v.exercises) ||
    v.exercises.length < 1 ||
    v.exercises.length > c.maxExercises
  )
    return false;
  let pending = false,
    confirmed = 0,
    lastTime = Date.parse(v.startedAt),
    lastRest = 0;
  const entries = new Set<string>(),
    sets = new Set<string>();
  for (const entry of v.exercises) {
    if (
      !record(entry) ||
      !id(entry.id) ||
      entries.has(entry.id) ||
      !isExercise(entry.exercise) ||
      !nonnegative(entry.restSeconds) ||
      entry.restSeconds > c.maxRestSeconds ||
      !Array.isArray(entry.sets) ||
      entry.sets.length < 1 ||
      entry.sets.length > c.maxSets
    )
      return false;
    entries.add(entry.id);
    const targetIds = new Set<string>();
    for (const set of entry.sets) {
      if (
        !record(set) ||
        !id(set.id) ||
        sets.has(set.id) ||
        !isTarget(set.target, entry.exercise) ||
        targetIds.has(set.target.id)
      )
        return false;
      sets.add(set.id);
      targetIds.add(set.target.id);
      if (set.result === null) {
        pending = true;
        continue;
      }
      if (
        pending ||
        !record(set.result) ||
        !isActual(set.result.actual, set.target.type) ||
        !date(set.result.confirmedAt) ||
        Date.parse(set.result.confirmedAt) < lastTime
      )
        return false;
      lastTime = Date.parse(set.result.confirmedAt);
      lastRest = entry.restSeconds;
      confirmed++;
    }
  }
  if (v.status === "completed")
    return (
      !pending &&
      date(v.completedAt) &&
      Date.parse(v.completedAt) === lastTime &&
      v.restUntil === null
    );
  if (v.status !== "active" || !pending || v.completedAt !== null) return false;
  return (
    v.restUntil === null ||
    (confirmed > 0 &&
      lastRest > 0 &&
      date(v.restUntil) &&
      Date.parse(v.restUntil) === lastTime + lastRest * 1000)
  );
}
export function isSessionData(v: unknown): v is SessionData {
  if (
    !record(v) ||
    v.version !== 1 ||
    !Array.isArray(v.completed) ||
    !v.completed.every((x) => isSession(x) && x.status === "completed") ||
    !(
      v.active === null ||
      (isSession(v.active) && v.active.status === "active")
    )
  )
    return false;
  const ids = [
    ...v.completed.map((x) => x.id),
    ...(v.active ? [v.active.id] : []),
  ];
  return new Set(ids).size === ids.length;
}
export function startSession(
  plan: WorkoutPlan,
  library: Exercise[],
  now = new Date().toISOString(),
): WorkoutSession {
  if (!isWorkout(plan, library) || !date(now))
    throw new Error("Check this workout before starting.");
  const session: WorkoutSession = {
    id: newId(),
    sourceWorkoutId: plan.id,
    name: plan.name,
    startedAt: now,
    completedAt: null,
    status: "active",
    restUntil: null,
    exercises: plan.exercises.map((entry) => {
      const exercise = library.find((x) => x.id === entry.exerciseId)!;
      if (!isExercise(exercise))
        throw new Error("Exercise metadata is invalid.");
      return {
        id: newId(),
        exercise: copyExercise(exercise),
        restSeconds: entry.restSeconds,
        sets: entry.sets.map((target) => ({
          id: newId(),
          target: { ...target },
          result: null,
        })),
      };
    }),
  };
  return session;
}
export function confirmSet(
  session: WorkoutSession,
  setId: string,
  actual: ActualResult,
  now: string,
): WorkoutSession {
  if (session.status !== "active") return copySession(session);
  const current = position(session);
  // The expected set identity makes stale/double submissions harmless.
  if (!current || current.set.id !== setId) return copySession(session);
  if (session.restUntil !== null) throw new Error("Finish or skip rest first.");
  if (!isActual(actual, current.set.target.type) || !date(now))
    throw new Error("Check the actual result before completing this set.");
  const next = copySession(session);
  next.exercises[current.exerciseIndex].sets[current.setIndex].result = {
    actual: { ...actual },
    confirmedAt: now,
  };
  const result: WorkoutSession = position(next)
    ? {
        ...next,
        status: "active",
        completedAt: null,
        restUntil:
          current.entry.restSeconds > 0
            ? new Date(
                Date.parse(now) + current.entry.restSeconds * 1000,
              ).toISOString()
            : null,
      }
    : { ...next, status: "completed", completedAt: now, restUntil: null };
  if (!isSession(result))
    throw new Error(
      "Could not confirm this set. Check your device clock and retry.",
    );
  return result;
}
export function endRest(
  session: WorkoutSession,
  deadline: string,
  skip: boolean,
  now: string,
): WorkoutSession {
  const next = copySession(session);
  if (!date(now)) throw new Error("Invalid time.");
  if (
    next.status === "active" &&
    next.restUntil === deadline &&
    (skip || Date.parse(now) >= Date.parse(deadline))
  )
    next.restUntil = null;
  return next;
}
