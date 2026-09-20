import {
  coachConfig as c,
  experienceLabels,
  goalLabels,
  locationLabels,
} from "../config/coach";
import { bodyParts, equipmentOptions } from "../config/training";
import { copyExercise } from "../training/plans";
import { isExercise } from "../training/validation";
import { isActual } from "../sessions/domain";
import type {
  CoachData,
  CoachPreferences,
  TrainingProfile,
} from "../types/coach";
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const id = (v: unknown): v is string =>
  typeof v === "string" && !!v.trim() && v.trim() === v && v.length <= 150;
const date = (v: unknown): v is string =>
  typeof v === "string" &&
  Number.isFinite(Date.parse(v)) &&
  new Date(v).toISOString() === v;
const number = (
  v: unknown,
  min: number,
  max: number,
  integer = true,
): v is number =>
  typeof v === "number" &&
  Number.isFinite(v) &&
  v >= min &&
  v <= max &&
  (!integer || Number.isInteger(v));
const list = (v: unknown, allowed: readonly string[]): v is string[] =>
  Array.isArray(v) &&
  v.every((x) => typeof x === "string" && allowed.includes(x)) &&
  new Set(v).size === v.length;
const option = (v: unknown, labels: object) =>
  typeof v === "string" && Object.hasOwn(labels, v);
export function defaultProfile(
  now: string,
  profileId = "training-profile",
): TrainingProfile {
  return {
    id: profileId,
    heightCm: null,
    weightKg: null,
    experienceLevel: "beginner",
    primaryGoal: "strength",
    preferredLocation: "home",
    availableEquipment: ["Bodyweight"],
    preferredDurationMinutes: c.defaultMinutes,
    preferredExerciseCount: c.defaultCount,
    preferredTrainingDaysPerWeek: null,
    baselineAssessments: [],
    createdAt: now,
    updatedAt: now,
  };
}
export function profilePreferences(profile: TrainingProfile): CoachPreferences {
  return {
    location: profile.preferredLocation,
    equipment: [...profile.availableEquipment],
    durationMinutes: profile.preferredDurationMinutes,
    exerciseCount: profile.preferredExerciseCount,
    bodyParts: [],
    customExerciseIds: [],
  };
}
export function isPreferences(v: unknown): v is CoachPreferences {
  return (
    record(v) &&
    option(v.location, locationLabels) &&
    list(v.equipment, equipmentOptions) &&
    number(v.durationMinutes, 1, c.maxMinutes) &&
    number(v.exerciseCount, 1, c.maxCount) &&
    list(v.bodyParts, bodyParts) &&
    Array.isArray(v.customExerciseIds) &&
    v.customExerciseIds.every(id) &&
    new Set(v.customExerciseIds).size === v.customExerciseIds.length
  );
}
export function isProfile(v: unknown): v is TrainingProfile {
  if (
    !record(v) ||
    !id(v.id) ||
    !date(v.createdAt) ||
    !date(v.updatedAt) ||
    Date.parse(v.updatedAt) < Date.parse(v.createdAt) ||
    !(v.heightCm === null || number(v.heightCm, 50, 300, false)) ||
    !(v.weightKg === null || number(v.weightKg, 10, 500, false)) ||
    !option(v.experienceLevel, experienceLabels) ||
    !option(v.primaryGoal, goalLabels) ||
    !isPreferences({
      location: v.preferredLocation,
      equipment: v.availableEquipment,
      durationMinutes: v.preferredDurationMinutes,
      exerciseCount: v.preferredExerciseCount,
      bodyParts: [],
      customExerciseIds: [],
    }) ||
    !(
      v.preferredTrainingDaysPerWeek === null ||
      number(v.preferredTrainingDaysPerWeek, 1, 7)
    ) ||
    !Array.isArray(v.baselineAssessments)
  )
    return false;
  const seen = new Set<string>();
  for (const b of v.baselineAssessments) {
    if (
      !record(b) ||
      !isExercise(b.exercise) ||
      !(c.baselineIds as readonly string[]).includes(b.exercise.id) ||
      !isActual(b.actual, b.exercise.trackingType) ||
      !(b.source === "performed" || b.source === "known") ||
      !date(b.recordedAt) ||
      Date.parse(b.recordedAt) > Date.parse(v.updatedAt) ||
      seen.has(b.exercise.id)
    )
      return false;
    seen.add(b.exercise.id);
  }
  return true;
}
export function isCoachData(v: unknown): v is CoachData {
  return (
    record(v) && v.version === 1 && (v.profile === null || isProfile(v.profile))
  );
}
export function copyProfile(p: TrainingProfile): TrainingProfile {
  return {
    ...p,
    availableEquipment: [...p.availableEquipment],
    baselineAssessments: p.baselineAssessments.map((b) => ({
      ...b,
      exercise: copyExercise(b.exercise),
      actual: { ...b.actual },
    })),
  };
}
export function copyCoachData(data: CoachData): CoachData {
  return {
    version: 1,
    profile: data.profile ? copyProfile(data.profile) : null,
  };
}
