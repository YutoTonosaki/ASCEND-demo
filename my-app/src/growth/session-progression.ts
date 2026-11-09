import { bodyParts } from "../config/training";
import { allSessions, overall } from "./domain";
import { derivePersonalRecords } from "../records/domain";
import { isSessionData } from "../sessions/domain";
import type { BodyArea } from "../types/domain";
import type { PlayerData } from "../types/growth";
import type { MetricComparison } from "../types/records";
import type { SessionData } from "../types/session";

export interface ImprovedSet {
  setId: string;
  setNumber: number;
  entryId: string;
  exerciseId: string;
  name: string;
  metrics: MetricComparison[];
}
export type ProgressionState =
  | "loading" | "pending" | "error" | "uninitialized"
  | "beforeInitialization" | "unavailable" | "ready";
export interface SessionProgression {
  state: ProgressionState;
  records: { state: "loading" | "unavailable" | "ready"; sets: ImprovedSet[] };
  growth: { area: BodyArea; delta: number }[];
  assessments: { area: BodyArea; before: number; after: number }[];
  ovr: { before: number; after: number } | null;
  explainUnchangedOVR: boolean;
  partiallyTracked: boolean;
}

/** Reads persisted Provider snapshots only. Never reconciles, consumes or writes. */
export function sessionProgression(
  sessionId: string,
  sessions: SessionData | null,
  playerData: PlayerData | null,
  errors: { growth?: boolean; sessions?: boolean } = {},
): SessionProgression {
  const result: SessionProgression = {
    state: "loading", records: { state: "loading", sets: [] },
    growth: [], assessments: [], ovr: null,
    explainUnchangedOVR: false, partiallyTracked: false,
  };
  if (errors.sessions || (sessions && !isSessionData(sessions))) {
    return { ...result, state: "error", records: { state: "unavailable", sets: [] } };
  }
  if (!sessions) return { ...result, state: errors.growth ? "error" : "loading" };
  const session = sessions.completed.find(s => s.id === sessionId);
  if (!session) {
    return { ...result, state: "unavailable", records: { state: "unavailable", sets: [] } };
  }
  const records = derivePersonalRecords(allSessions(sessions));
  if (records.rejectedSessions) {
    return { ...result, state: "error", records: { state: "unavailable", sets: [] } };
  }
  const improved = new Map<string, ImprovedSet>();
  for (const comparison of records.comparisons) {
    if (comparison.source.sessionId !== sessionId) continue;
    const metrics = comparison.metrics.filter(m => m.outcome === "improved");
    if (!metrics.length) continue;
    const entry = session.exercises.find(e => e.id === comparison.source.entryId)!;
    improved.set(JSON.stringify([comparison.source.entryId, comparison.source.setId]), {
      setId: comparison.source.setId,
      setNumber: entry.sets.findIndex(set => set.id === comparison.source.setId) + 1,
      entryId: comparison.source.entryId,
      exerciseId: comparison.exerciseId, name: entry.exercise.name,
      metrics: metrics.map(m => ({ ...m })),
    });
  }
  result.records = { state: "ready", sets: [...improved.values()] };
  if (errors.growth) return { ...result, state: "error" };
  if (!playerData) return result;
  const player = playerData.player;
  if (!player) return { ...result, state: "uninitialized" };
  if (Date.parse(session.completedAt!) <= Date.parse(player.initializedAt)) {
    return { ...result, state: "beforeInitialization" };
  }
  if (!player.finalizedSessionIds.includes(sessionId)) return { ...result, state: "pending" };

  const ratings = { ...player.initialRatings };
  const deltas = new Map<BodyArea, number>();
  const assessments = new Map<BodyArea, { area: BodyArea; before: number; after: number }>();
  const ids = new Set<string>();
  let before: typeof ratings | null = null;
  let after: typeof ratings | null = null;
  let leftSession = false;
  let interleaved = false;
  for (const event of player.events) {
    if (ids.has(event.id)) return { ...result, state: "unavailable" };
    ids.add(event.id);
    const target = event.sessionId === sessionId;
    if (target) {
      before ??= { ...ratings };
      if (leftSession) interleaved = true;
    } else if (before) leftSession = true;
    for (const change of event.changes) {
      if (!Number.isFinite(change.after) || ratings[change.area] !== change.before) {
        return { ...result, state: "unavailable" };
      }
      ratings[change.area] = change.after;
      if (!target) continue;
      if (event.kind === "assessment") {
        assessments.set(change.area, {
          area: change.area,
          before: assessments.get(change.area)?.before ?? change.before,
          after: change.after,
        });
      } else {
        const delta = change.after - change.before;
        if (delta < 0) return { ...result, state: "unavailable" };
        deltas.set(change.area, (deltas.get(change.area) ?? 0) + delta);
      }
    }
    if (target) after = { ...ratings };
  }
  if (bodyParts.some(area => ratings[area] !== player.ratings[area])) {
    return { ...result, state: "unavailable" };
  }
  const growth = bodyParts.flatMap(area => {
    const delta = deltas.get(area) ?? 0;
    return delta > 0 ? [{ area, delta }] : [];
  });
  const ovr = before && after && !interleaved
    ? { before: overall(before), after: overall(after) } : null;
  return {
    ...result, state: "ready", growth, assessments: [...assessments.values()], ovr,
    explainUnchangedOVR: growth.length > 0 && assessments.size === 0 &&
      ovr !== null && ovr.before === ovr.after,
    partiallyTracked: session.exercises.some(e => e.sets.some(s =>
      s.result && Date.parse(s.result.confirmedAt) <= Date.parse(player.initializedAt))),
  };
}

/** Format only after summation. Preserve visibility of any positive small delta. */
export function formatGrowthDelta(delta: number): string {
  if (!Number.isFinite(delta) || delta <= 0) return "0.00";
  return delta < 0.01 ? "<0.01" : delta.toFixed(2);
}
