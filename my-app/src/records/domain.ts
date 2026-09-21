import { isSession } from "../sessions/domain";
import type { TrackingType } from "../types/training";
import type {
  ExerciseRecord,
  MetricComparison,
  PersonalRecords,
  RecordBest,
  RecordSource,
  SetRecordComparison,
} from "../types/records";

// Code-point ordering is independent of device locale.
const order = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const key = (id: string, type: TrackingType) => JSON.stringify([id, type]);
const copySource = (source: RecordSource): RecordSource => ({
  ...source,
  actual: { ...source.actual },
});
const copyBest = (best: RecordBest): RecordBest => ({
  ...best,
  source: copySource(best.source),
});
function copyRecord(record: ExerciseRecord): ExerciseRecord {
  return {
    ...record,
    best: copyBest(record.best),
    byWeight: record.byWeight.map((load) => ({
      ...load,
      best: copyBest(load.best),
    })),
  };
}
export function compareRecordValue(
  metric: MetricComparison["metric"],
  value: number,
  previous: number | null,
  weightKg?: number,
): MetricComparison {
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    (previous !== null && (!Number.isFinite(previous) || previous < 0))
  )
    throw new Error("Record values must be finite and nonnegative.");
  return {
    metric,
    ...(weightKg === undefined ? {} : { weightKg }),
    previous,
    value,
    outcome:
      previous === null
        ? "first"
        : value > previous
          ? "improved"
          : "maintained",
    relation:
      previous === null
        ? "first"
        : value > previous
          ? "higher"
          : value === previous
            ? "equal"
            : "lower",
  };
}

/** Read-only derivation. Both completed sessions and confirmed active prefixes qualify.
 * The existing validator is the compatibility boundary: missing required identity,
 * timestamps or performance is invalid, never reconstructed from targets/baselines.
 */
export function derivePersonalRecords(
  sessions: readonly unknown[],
): PersonalRecords {
  const valid = sessions.filter(isSession);
  const counts = new Map<string, number>();
  for (const session of valid)
    counts.set(session.id, (counts.get(session.id) ?? 0) + 1);
  const unique = valid.filter((session) => counts.get(session.id) === 1);
  const evidence = unique.flatMap((session) =>
    session.exercises.flatMap((entry, entryIndex) =>
      entry.sets.flatMap((set, setIndex) => {
        if (!set.result) return [];
        const actual = set.result.actual;
        // Zero reps cannot establish that a weight was lifted. Zero kg with reps can.
        if (actual.type === "weight_reps" && actual.reps === 0) return [];
        return [
          {
            exerciseId: entry.exercise.id,
            name: entry.exercise.name,
            trackingType: entry.exercise.trackingType,
            entryIndex,
            setIndex,
            source: {
              sessionId: session.id,
              entryId: entry.id,
              setId: set.id,
              confirmedAt: set.result.confirmedAt,
              actual: { ...actual },
            } satisfies RecordSource,
          },
        ];
      }),
    ),
  );
  evidence.sort(
    (a, b) =>
      order(a.source.confirmedAt, b.source.confirmedAt) ||
      order(a.source.sessionId, b.source.sessionId) ||
      a.entryIndex - b.entryIndex ||
      a.setIndex - b.setIndex ||
      order(a.source.setId, b.source.setId),
  );
  const records = new Map<string, ExerciseRecord>();
  const comparisons: SetRecordComparison[] = [];
  for (const item of evidence) {
    const { source, exerciseId, name, trackingType } = item;
    const actual = source.actual;
    const identity = key(exerciseId, trackingType);
    const old = records.get(identity);
    const previous = old ? copyRecord(old) : null;
    const value =
      actual.type === "time"
        ? actual.seconds
        : actual.type === "reps"
          ? actual.reps
          : actual.weightKg;
    const metric =
      actual.type === "time"
        ? "seconds"
        : actual.type === "reps"
          ? "reps"
          : "weightKg";
    const metrics = [
      compareRecordValue(metric, value, old?.best.value ?? null),
    ];
    const current: ExerciseRecord = old
      ? copyRecord(old)
      : {
          exerciseId,
          name,
          trackingType,
          best: { value, source: copySource(source) },
          byWeight: [],
        };
    current.name = name;
    if (value > current.best.value)
      current.best = { value, source: copySource(source) };
    if (actual.type === "weight_reps") {
      const load = current.byWeight.find((x) => x.weightKg === actual.weightKg);
      metrics.push(
        compareRecordValue(
          "repsAtWeight",
          actual.reps,
          load?.best.value ?? null,
          actual.weightKg,
        ),
      );
      if (!load)
        current.byWeight.push({
          weightKg: actual.weightKg,
          best: { value: actual.reps, source: copySource(source) },
        });
      else if (actual.reps > load.best.value)
        load.best = { value: actual.reps, source: copySource(source) };
      current.byWeight.sort((a, b) => a.weightKg - b.weightKg);
    }
    records.set(identity, current);
    comparisons.push({
      exerciseId,
      trackingType,
      source: copySource(source),
      previous,
      current: copyRecord(current),
      metrics,
    });
  }
  return {
    records: [...records.values()]
      .map(copyRecord)
      .sort(
        (a, b) =>
          order(a.name, b.name) ||
          order(a.exerciseId, b.exerciseId) ||
          order(a.trackingType, b.trackingType),
      ),
    comparisons,
    rejectedSessions: sessions.length - unique.length,
  };
}
export function getExerciseRecord(
  records: PersonalRecords,
  exerciseId: string,
  trackingType: TrackingType,
) {
  return (
    records.records.find(
      (r) => r.exerciseId === exerciseId && r.trackingType === trackingType,
    ) ?? null
  );
}
/** Composite reference avoids assuming set IDs are globally unique across sessions. */
export function getSetComparison(
  records: PersonalRecords,
  sessionId: string,
  setId: string,
) {
  return (
    records.comparisons.find(
      (c) => c.source.sessionId === sessionId && c.source.setId === setId,
    ) ?? null
  );
}
/** undefined = not eligible/not found; null = first eligible result. */
export function getPreviousRecord(
  records: PersonalRecords,
  sessionId: string,
  setId: string,
) {
  return getSetComparison(records, sessionId, setId)?.previous;
}
