import { bodyParts } from "../config/training";
import { growthConfig as c } from "../config/growth";
import { defaultProfile, isProfile } from "../coach/profile";
import { isActual } from "../sessions/domain";
import { copyExercise } from "../training/plans";
import {
  assessmentValue,
  initializePlayer,
  setIdentity,
  validDate,
} from "./domain";
import { standardExercises } from "../data/exercises";
import type { PlayerData } from "../types/growth";
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const id = (v: unknown): v is string =>
  typeof v === "string" && !!v.trim() && v.trim() === v && v.length <= 500;
const number = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0;
const ids = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every(id) && new Set(v).size === v.length;
const ratings = (v: unknown) =>
  record(v) &&
  Object.keys(v).length === 6 &&
  bodyParts.every((a) => number(v[a]) && v[a] <= c.maximum);
const statuses = (v: unknown) =>
  record(v) &&
  Object.keys(v).length === 6 &&
  bodyParts.every((a) => v[a] === "assessed" || v[a] === "provisional");
export function isPlayerData(value: unknown): value is PlayerData {
  if (!record(value) || value.version !== 1) return false;
  if (value.player === null) return true;
  const p = value.player;
  if (
    !record(p) ||
    !id(p.id) ||
    !validDate(p.initializedAt) ||
    p.rulesVersion !== 1 ||
    !ratings(p.ratings) ||
    !ratings(p.initialRatings) ||
    !statuses(p.status) ||
    !statuses(p.initialStatus) ||
    !ids(p.processedSetIds) ||
    !ids(p.finalizedSessionIds) ||
    !Array.isArray(p.events)
  )
    return false;
  const profile = {
    ...defaultProfile(p.initializedAt),
    baselineAssessments: p.baselineEvidence,
  };
  if (!isProfile(profile)) return false;
  const initial = initializePlayer(p.id, p.initializedAt, profile, {
    version: 1,
    active: null,
    completed: [],
  });
  const replay = { ...initial.ratings },
    status = { ...initial.status };
  for (const area of bodyParts)
    if (
      (p.initialRatings as Record<string, unknown>)[area] !== replay[area] ||
      (p.initialStatus as Record<string, unknown>)[area] !== status[area]
    )
      return false;
  const seen = new Set<string>(),
    workouts = new Map<string, number>(),
    days = new Map<string, number>();
  for (const event of p.events) {
    if (
      !record(event) ||
      !id(event.id) ||
      seen.has(event.id) ||
      !id(event.sessionId) ||
      !validDate(event.at) ||
      event.at <= p.initializedAt ||
      !["assessment", "growth", "bonus"].includes(String(event.kind)) ||
      !Array.isArray(event.changes) ||
      !record(event.allocation)
    )
      return false;
    seen.add(event.id);
    let allocationTotal = 0;
    for (const [area, weight] of Object.entries(event.allocation)) {
      if (
        !bodyParts.includes(area as (typeof bodyParts)[number]) ||
        !number(weight) ||
        weight > 1
      )
        return false;
      allocationTotal += weight;
    }
    if (allocationTotal > 1 + 1e-9) return false;
    if (event.kind === "bonus") {
      if (
        event.setId !== null ||
        event.exerciseId !== null ||
        event.actual !== null ||
        event.metric !== null ||
        event.id !== JSON.stringify([event.sessionId, "bonus"]) ||
        !p.finalizedSessionIds.includes(event.sessionId)
      )
        return false;
    } else {
      if (
        !id(event.setId) ||
        !id(event.exerciseId) ||
        !record(event.actual) ||
        !["reps", "time", "weight_reps"].includes(String(event.actual.type)) ||
        !isActual(
          event.actual,
          event.actual.type as "reps" | "time" | "weight_reps",
        ) ||
        !p.processedSetIds.includes(
          setIdentity(event.sessionId, event.setId),
        ) ||
        event.id !==
          setIdentity(event.sessionId, event.setId) + ":" + event.kind
      )
        return false;
      if (event.kind === "growth") {
        const m = event.metric;
        if (
          !record(m) ||
          !number(m.previous) ||
          !number(m.value) ||
          m.value <= m.previous ||
          m.outcome !== "improved" ||
          m.relation !== "higher" ||
          !["reps", "seconds", "weightKg", "repsAtWeight"].includes(
            String(m.metric),
          ) ||
          (m.metric === "repsAtWeight" && !number(m.weightKg))
        )
          return false;
      } else if (event.metric !== null || event.changes.length === 0)
        return false;
    }
    if (
      event.kind === "growth" &&
      record(event.actual) &&
      record(event.metric)
    ) {
      const actual = event.actual,
        metric = event.metric;
      if (
        metric.metric === "seconds"
          ? actual.type !== "time" || metric.value !== actual.seconds
          : metric.metric === "weightKg"
            ? actual.type !== "weight_reps" || metric.value !== actual.weightKg
            : metric.metric === "repsAtWeight"
              ? actual.type !== "weight_reps" ||
                metric.weightKg !== actual.weightKg ||
                metric.value !== actual.reps
              : actual.type !== "reps" || metric.value !== actual.reps
      )
        return false;
    }
    let total = 0;
    const areas = new Set<string>();
    for (const change of event.changes) {
      if (
        !record(change) ||
        !bodyParts.includes(change.area as (typeof bodyParts)[number]) ||
        areas.has(String(change.area)) ||
        !number(change.before) ||
        !number(change.after) ||
        change.after > 99
      )
        return false;
      const area = change.area as (typeof bodyParts)[number];
      areas.add(area);
      if (replay[area] !== change.before) return false;
      if (event.kind === "assessment") {
        const exercise = standardExercises.find(
          (e) => e.id === event.exerciseId,
        );
        if (
          status[area] !== "provisional" ||
          change.after < 40 ||
          change.after > 60 ||
          !exercise ||
          !exercise.primaryBodyParts.includes(area) ||
          !isActual(event.actual, exercise.trackingType) ||
          assessmentValue(exercise, event.actual) !== change.after
        )
          return false;
        status[area] = "assessed";
      } else {
        if (
          status[area] !== "assessed" ||
          change.after < change.before ||
          !event.allocation[area]
        )
          return false;
        total += change.after - change.before;
      }
      replay[area] = change.after;
    }
    const workout = (workouts.get(event.sessionId) ?? 0) + total,
      day = (days.get(event.at.slice(0, 10)) ?? 0) + total;
    if (
      total > (event.kind === "bonus" ? c.bonusCap : c.eventCap) + 1e-8 ||
      workout > c.workoutCap + 1e-8 ||
      day > c.dayCap + 1e-8
    )
      return false;
    workouts.set(event.sessionId, workout);
    days.set(event.at.slice(0, 10), day);
  }
  return bodyParts.every(
    (area) =>
      (p.ratings as Record<string, unknown>)[area] === replay[area] &&
      (p.status as Record<string, unknown>)[area] === status[area],
  );
}
export function copyPlayerData(data: PlayerData): PlayerData {
  const p = data.player;
  return {
    version: 1,
    player: p
      ? {
          ...p,
          baselineEvidence: p.baselineEvidence.map((b) => ({
            ...b,
            exercise: copyExercise(b.exercise),
            actual: { ...b.actual },
          })),
          initialRatings: { ...p.initialRatings },
          initialStatus: { ...p.initialStatus },
          ratings: { ...p.ratings },
          status: { ...p.status },
          processedSetIds: [...p.processedSetIds],
          finalizedSessionIds: [...p.finalizedSessionIds],
          events: p.events.map((e) => ({
            ...e,
            changes: e.changes.map((x) => ({ ...x })),
            allocation: { ...e.allocation },
            metric: e.metric ? { ...e.metric } : null,
            actual: e.actual ? { ...e.actual } : null,
          })),
        }
      : null,
  };
}
