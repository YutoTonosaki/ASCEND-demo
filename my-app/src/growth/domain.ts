import { bodyParts } from "../config/training";
import { assessmentCurves, growthConfig as c } from "../config/growth";
import { standardExercises } from "../data/exercises";
import { derivePersonalRecords } from "../records/domain";
import { isSessionData } from "../sessions/domain";
import { isProfile } from "../coach/profile";
import { copyExercise } from "../training/plans";
import type { TrainingProfile } from "../types/coach";
import type { BodyArea, BodyRatings } from "../types/domain";
import type { Exercise } from "../types/training";
import type { ActualResult, SessionData } from "../types/session";
import type { SetRecordComparison } from "../types/records";
import type {
  Allocation,
  GrowthEvent,
  GrowthPlayer,
  RatingStatuses,
} from "../types/growth";

export const setIdentity = (sessionId: string, setId: string) =>
  JSON.stringify([sessionId, setId]);
export const validDate = (s: unknown): s is string =>
  typeof s === "string" &&
  Number.isFinite(Date.parse(s)) &&
  new Date(s).toISOString() === s;
export const displayRating = (n: number) =>
  Math.floor(Math.max(0, Math.min(c.maximum, n)));
export const overall = (ratings: BodyRatings) =>
  displayRating(
    bodyParts.reduce((sum, area) => sum + ratings[area], 0) / bodyParts.length,
  );
export const allSessions = (data: SessionData) => [
  ...data.completed,
  ...(data.active ? [data.active] : []),
];
const confirmedIds = (data: SessionData) =>
  allSessions(data).flatMap((s) =>
    s.exercises.flatMap((e) =>
      e.sets.filter((x) => x.result).map((x) => setIdentity(s.id, x.id)),
    ),
  );
export function assessmentValue(
  exercise: Exercise,
  actual: ActualResult,
): number | null {
  const curve = assessmentCurves[exercise.id];
  const standard = standardExercises.find((e) => e.id === exercise.id);
  // Custom/changed movement metadata cannot inherit a built-in assessment curve.
  if (
    !curve ||
    !standard ||
    exercise.isCustom ||
    actual.type !== curve.type ||
    exercise.trackingType !== standard.trackingType ||
    JSON.stringify(exercise.primaryBodyParts) !==
      JSON.stringify(standard.primaryBodyParts) ||
    JSON.stringify(exercise.equipment) !== JSON.stringify(standard.equipment)
  )
    return null;
  if (actual.type === "weight_reps" && actual.reps < (curve.minimumReps ?? 1))
    return null;
  const value =
    actual.type === "reps"
      ? actual.reps
      : actual.type === "time"
        ? actual.seconds
        : actual.weightKg;
  if (!Number.isFinite(value) || value < 0) return null;
  const points = curve.points;
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i],
      [previousX, previousY] = points[i - 1];
    if (value <= x)
      return (
        previousY + ((y - previousY) * (value - previousX)) / (x - previousX)
      );
  }
  return points[points.length - 1][1];
}
export function initializePlayer(
  id: string,
  at: string,
  profile: TrainingProfile | null,
  sessions: SessionData,
): GrowthPlayer {
  if (
    !id.trim() ||
    !validDate(at) ||
    !isSessionData(sessions) ||
    (profile !== null && !isProfile(profile))
  )
    throw new Error(
      "Player initialization needs valid profile and workout data.",
    );
  const ratings = Object.fromEntries(
    bodyParts.map((area) => [area, c.provisional]),
  ) as BodyRatings;
  const status = Object.fromEntries(
    bodyParts.map((area) => [area, "provisional"]),
  ) as RatingStatuses;
  // Latest eligible baseline per exercise; no measurements or unrelated movements.
  const evidence = [...(profile?.baselineAssessments ?? [])]
    .filter(
      (b) => assessmentCurves[b.exercise.id]?.baseline && b.recordedAt <= at,
    )
    .sort(
      (a, b) =>
        a.recordedAt.localeCompare(b.recordedAt) ||
        a.exercise.id.localeCompare(b.exercise.id),
    );
  const used = new Map<string, (typeof evidence)[number]>();
  for (const item of evidence)
    if (assessmentValue(item.exercise, item.actual) !== null)
      used.set(item.exercise.id, item);
  for (const item of used.values()) {
    const value = assessmentValue(item.exercise, item.actual)!;
    for (const area of item.exercise.primaryBodyParts) {
      ratings[area] = value;
      status[area] = "assessed";
    }
  }
  return {
    id,
    initializedAt: at,
    rulesVersion: 1,
    baselineEvidence: [...used.values()].map((b) => ({
      ...b,
      exercise: copyExercise(b.exercise),
      actual: { ...b.actual },
    })),
    initialRatings: { ...ratings },
    initialStatus: { ...status },
    ratings,
    status,
    processedSetIds: confirmedIds(sessions),
    finalizedSessionIds: sessions.completed.map((s) => s.id),
    events: [],
  };
}
export function earlyMultiplier(initializedAt: string, at: string) {
  const week = Math.max(
    0,
    Math.floor((Date.parse(at) - Date.parse(initializedAt)) / (7 * 86400000)),
  );
  return c.early[Math.min(week, c.early.length - 1)];
}
export function diminishing(rating: number) {
  return Math.max(
    c.diminishingFloor,
    Math.min(1, (c.maximum - rating) / (c.maximum - c.diminishingStart)),
  );
}
export function allocationFor(exercise: Exercise): Allocation {
  const weights: Allocation = {};
  for (const area of exercise.primaryBodyParts) weights[area] = 1;
  for (const area of exercise.secondaryBodyParts)
    if (weights[area] === undefined) weights[area] = c.secondaryWeight;
  const total = Object.values(weights).reduce((sum, n) => sum + n, 0);
  for (const area of bodyParts)
    if (weights[area] !== undefined) weights[area]! /= total;
  return weights;
}
/** One winning comparable metric per set. No e1RM and no sum of weighted metrics. */
export function growthSignal(comparison: SetRecordComparison) {
  const actual = comparison.source.actual;
  const candidates = comparison.metrics
    .filter((m) => m.outcome === "improved" && m.previous !== null)
    .filter((m) => {
      if (m.metric !== "weightKg") return true;
      if (actual.type !== "weight_reps" || !comparison.previous) return false;
      const previousReps = comparison.previous.byWeight.find(
        (w) => w.weightKg === comparison.previous!.best.value,
      )?.best.value;
      return previousReps !== undefined && actual.reps >= previousReps;
    })
    .map((metric) => ({
      metric,
      ratio:
        metric.previous === 0
          ? c.zeroReferenceRatio
          : Math.min(
              c.ratioCap,
              (metric.value - metric.previous!) / metric.previous!,
            ),
    }));
  candidates.sort((a, b) => b.ratio - a.ratio);
  return candidates[0] ?? null;
}
const amount = (e: GrowthEvent) =>
  e.kind === "assessment"
    ? 0
    : e.changes.reduce((sum, x) => sum + x.after - x.before, 0);
function award(player: GrowthPlayer, event: GrowthEvent, budget: number) {
  const workoutUsed = player.events
    .filter((e) => e.sessionId === event.sessionId)
    .reduce((sum, e) => sum + amount(e), 0);
  const dayUsed = player.events
    .filter((e) => e.at.slice(0, 10) === event.at.slice(0, 10))
    .reduce((sum, e) => sum + amount(e), 0);
  const requested: Allocation = {};
  for (const area of bodyParts)
    if (player.status[area] === "assessed" && event.allocation[area])
      requested[area] = Math.min(
        c.maximum - player.ratings[area],
        budget * event.allocation[area]! * diminishing(player.ratings[area]),
      );
  const total = Object.values(requested).reduce((sum, n) => sum + n, 0);
  const available = Math.max(
    0,
    Math.min(c.workoutCap - workoutUsed, c.dayCap - dayUsed, total),
  );
  for (const area of bodyParts)
    if (requested[area] && total > 0) {
      const before = player.ratings[area],
        after = Math.min(
          c.maximum,
          before + (requested[area]! * available) / total,
        );
      if (after > before) {
        event.changes.push({ area, before, after });
        player.ratings[area] = after;
      }
    }
  player.events.push(event);
}
/** Existing PR engine is authoritative; incremental ledger commits are atomic. */
export function reconcilePlayer(
  input: GrowthPlayer,
  data: SessionData,
  now: string,
): GrowthPlayer {
  if (!isSessionData(data) || !validDate(now))
    throw new Error("Workout history is not ready for player growth.");
  const currentIds = new Set(confirmedIds(data));
  if (input.processedSetIds.some((id) => !currentIds.has(id)))
    throw new Error(
      "Previously processed workout evidence is missing. Ratings are preserved; restore session data before retrying.",
    );
  const player: GrowthPlayer = JSON.parse(JSON.stringify(input));
  const processed = new Set(player.processedSetIds);
  const sessions = allSessions(data);
  const confirmed = sessions.flatMap((session) =>
    session.exercises.flatMap((entry) =>
      entry.sets.flatMap((set) =>
        set.result
          ? [
              {
                id: setIdentity(session.id, set.id),
                at: set.result.confirmedAt,
              },
            ]
          : [],
      ),
    ),
  );
  const through = confirmed.reduce(
    (latest, set) =>
      processed.has(set.id) ? Math.max(latest, Date.parse(set.at)) : latest,
    Date.parse(player.initializedAt),
  );
  if (
    confirmed.some(
      (set) =>
        !processed.has(set.id) &&
        Date.parse(set.at) > Date.parse(player.initializedAt) &&
        Date.parse(set.at) < through,
    )
  )
    throw new Error(
      "New workout evidence predates already processed results. Ratings are preserved; check the workout dates before retrying.",
    );
  const comparisons = derivePersonalRecords(sessions).comparisons;
  // Interleave completion bonuses with sets to make catch-up and live processing agree.
  const timeline = [
    ...comparisons.map((comparison) => ({
      at: comparison.source.confirmedAt,
      sessionId: comparison.source.sessionId,
      comparison,
    })),
    ...data.completed.flatMap((s) =>
      s.status === "completed" && !player.finalizedSessionIds.includes(s.id)
        ? [{ at: s.completedAt, sessionId: s.id, comparison: null }]
        : [],
    ),
  ];
  timeline.sort(
    (a, b) =>
      Date.parse(a.at) - Date.parse(b.at) ||
      (a.sessionId < b.sessionId ? -1 : a.sessionId > b.sessionId ? 1 : 0) ||
      (a.comparison === null ? 1 : 0) - (b.comparison === null ? 1 : 0),
  );
  for (const item of timeline) {
    const { at, sessionId, comparison } = item;
    if (Date.parse(at) > Date.parse(now))
      throw new Error(
        "A workout timestamp is ahead of this device clock. Ratings are preserved; check the clock and retry.",
      );
    if (!comparison) {
      if (player.finalizedSessionIds.includes(sessionId)) continue;
      const qualifying = new Map<string, GrowthEvent>();
      for (const event of player.events)
        if (
          event.kind === "growth" &&
          event.sessionId === sessionId &&
          event.exerciseId
        ) {
          const old = qualifying.get(event.exerciseId);
          if (!old) qualifying.set(event.exerciseId, event);
          else
            qualifying.set(event.exerciseId, {
              ...old,
              allocation: Object.fromEntries(
                bodyParts.map((area) => [
                  area,
                  Math.max(
                    old.allocation[area] ?? 0,
                    event.allocation[area] ?? 0,
                  ),
                ]),
              ),
            });
        }
      if (qualifying.size >= 2) {
        const allocation: Allocation = {};
        for (const e of qualifying.values())
          for (const area of bodyParts)
            allocation[area] =
              (allocation[area] ?? 0) + (e.allocation[area] ?? 0);
        const total = Object.values(allocation).reduce((sum, n) => sum + n, 0);
        if (total > 0)
          for (const area of bodyParts)
            allocation[area] = (allocation[area] ?? 0) / total;
        award(
          player,
          {
            id: JSON.stringify([sessionId, "bonus"]),
            kind: "bonus",
            sessionId,
            setId: null,
            exerciseId: null,
            at,
            changes: [],
            allocation,
            metric: null,
            actual: null,
          },
          Math.min(c.bonusCap, c.bonusPerExtraExercise * (qualifying.size - 1)),
        );
      }
      player.finalizedSessionIds.push(sessionId);
      continue;
    }
    const source = comparison.source,
      identity = setIdentity(sessionId, source.setId);
    if (processed.has(identity)) continue;
    processed.add(identity);
    if (Date.parse(at) <= Date.parse(player.initializedAt)) continue;
    const exercise = sessions
      .find((s) => s.id === sessionId)!
      .exercises.find((e) => e.id === source.entryId)!.exercise;
    const assessedNow = new Set<BodyArea>();
    const value = assessmentValue(exercise, source.actual);
    if (value !== null) {
      const event: GrowthEvent = {
        id: identity + ":assessment",
        kind: "assessment",
        sessionId,
        setId: source.setId,
        exerciseId: exercise.id,
        at,
        changes: [],
        allocation: {},
        metric: null,
        actual: { ...source.actual },
      };
      for (const area of exercise.primaryBodyParts)
        if (player.status[area] === "provisional") {
          event.changes.push({
            area,
            before: player.ratings[area],
            after: value,
          });
          player.ratings[area] = value;
          player.status[area] = "assessed";
          assessedNow.add(area);
        }
      if (event.changes.length) player.events.push(event);
    }
    const signal = growthSignal(comparison);
    if (!signal) continue;
    const allocation = allocationFor(exercise);
    // Never infer assessed capacity from secondary involvement or overwrite later growth.
    for (const area of bodyParts)
      if (player.status[area] !== "assessed" || assessedNow.has(area))
        delete allocation[area];
    const budget = Math.min(
      c.eventCap,
      (c.base + c.improvementScale * signal.ratio) *
        earlyMultiplier(player.initializedAt, at),
    );
    award(
      player,
      {
        id: identity + ":growth",
        kind: "growth",
        sessionId,
        setId: source.setId,
        exerciseId: exercise.id,
        at,
        changes: [],
        allocation,
        metric: { ...signal.metric },
        actual: { ...source.actual },
      },
      budget,
    );
  }
  // Zero-rep weighted confirmations produce no PR comparison but still need an identity guard.
  player.processedSetIds = [...new Set([...processed, ...currentIds])];
  return player;
}
