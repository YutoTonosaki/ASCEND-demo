/** Versioned game balance, not physiological measurement or population percentiles. */
export const growthConfig = {
  rulesVersion: 1,
  provisional: 45,
  maximum: 99,
  base: 0.06,
  improvementScale: 0.4,
  ratioCap: 0.5,
  zeroReferenceRatio: 0.1,
  early: [1.25, 1.2, 1.15, 1.1, 1] as readonly number[],
  eventCap: 0.3,
  workoutCap: 0.65,
  dayCap: 0.9,
  bonusPerExtraExercise: 0.04,
  bonusCap: 0.12,
  secondaryWeight: 0.25,
  diminishingFloor: 0.15,
  diminishingStart: 40,
} as const;
export interface AssessmentCurve {
  type: "reps" | "time" | "weight_reps";
  baseline: boolean;
  minimumReps?: number;
  points: readonly (readonly [number, number])[];
}
export const assessmentCurves: Readonly<Record<string, AssessmentCurve>> = {
  "push-up": {
    type: "reps",
    baseline: true,
    points: [
      [0, 40],
      [5, 42],
      [10, 46],
      [20, 52],
      [40, 60],
    ],
  },
  squat: {
    type: "reps",
    baseline: true,
    points: [
      [0, 40],
      [10, 43],
      [20, 48],
      [40, 55],
      [60, 60],
    ],
  },
  plank: {
    type: "time",
    baseline: true,
    points: [
      [0, 40],
      [15, 43],
      [30, 48],
      [60, 55],
      [120, 60],
    ],
  },
  "pull-up": {
    type: "reps",
    baseline: false,
    points: [
      [0, 40],
      [1, 42],
      [5, 48],
      [10, 54],
      [15, 60],
    ],
  },
  "diamond-push-up": {
    type: "reps",
    baseline: false,
    points: [
      [0, 40],
      [5, 44],
      [10, 49],
      [20, 56],
      [30, 60],
    ],
  },
  "overhead-press": {
    type: "weight_reps",
    baseline: false,
    minimumReps: 5,
    points: [
      [0, 40],
      [10, 44],
      [20, 48],
      [40, 54],
      [60, 60],
    ],
  },
};
