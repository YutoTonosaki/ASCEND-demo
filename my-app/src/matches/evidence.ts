import { allSessions, overall, setIdentity, validDate } from "../growth/domain";
import { isPlayerData } from "../growth/validation";
import { isSessionData } from "../sessions/domain";
import type { GrowthPlayer } from "../types/growth";
import type { SessionData } from "../types/session";
import type { BodyRatings } from "../types/domain";
import { matchDay, validWeek, type MatchWeek } from "./calendar";
export interface WeekEnd {
  capturedAt: string;
  ratings: BodyRatings;
  ovr: number;
  trainingDays: string[];
  weeklyBonus: number;
  playerMatchPower: number;
  evidence: {
    initializedAt: string;
    eventIds: string[];
    processedSetIds: string[];
    finalizedSessionIds: string[];
    qualifyingSessionIds: string[];
  };
}
export type EvidenceResult = {
  status: "ready";
  snapshot: WeekEnd;
} | {
  status: "pending";
  reason: string;
};
function sameActual(a: import("../types/session").ActualResult, b: import("../types/session").ActualResult | null) {
  if (!b || a.type !== b.type) return false;
  if (a.type === "time" && b.type === "time") return a.seconds === b.seconds;
  if (a.type === "reps" && b.type === "reps") return a.reps === b.reps;
  return a.type === "weight_reps" && b.type === "weight_reps" && a.reps === b.reps && a.weightKg === b.weightKg;
}
export function reconstructWeekEnd(player: GrowthPlayer, sessions: SessionData, week: MatchWeek, goal: number, now: string): EvidenceResult {
  const pending = (reason: string): EvidenceResult => ({ status: "pending", reason });
  if (!validWeek(week) || !Number.isInteger(goal) || goal < 1 || goal > 7 || !validDate(now) || !isPlayerData({ version: 1, player }) || !isSessionData(sessions))
    return pending("invalid-records");
  const boundary = week.endExclusiveAt;
  if (now < boundary)
    return pending("training-week-open");
  if (player.initializedAt >= boundary)
    return pending("player-initialized-after-boundary");
  const all = allSessions(sessions);
  const sets = all.flatMap(s => s.exercises.flatMap(e => e.sets.flatMap(x => x.result ? [{ sessionId: s.id, setId: x.id, exerciseId: e.exercise.id, ...x.result }] : [])));
  const byId = new Map(sets.map(s => [setIdentity(s.sessionId, s.setId), s]));
  if (player.processedSetIds.some(id => !byId.has(id)) || player.finalizedSessionIds.some(id => !sessions.completed.some(s => s.id === id)))
    return pending("missing-session-history");
  const requiredSets = sets.filter(s => s.confirmedAt < boundary);
  const requiredSessions = sessions.completed.filter(s => s.completedAt! < boundary);
  if (requiredSets.some(s => !player.processedSetIds.includes(setIdentity(s.sessionId, s.setId))) || requiredSessions.some(s => !player.finalizedSessionIds.includes(s.id)))
    return pending("growth-processing-incomplete");
  const ratings = { ...player.initialRatings };
  let previous = player.initializedAt;
  const eventIds: string[] = [];
  for (const event of player.events) {
    if (event.at < previous || event.at > now)
      return pending("growth-timestamp-inconsistent");
    previous = event.at;
    if (event.kind === "bonus") {
      const s = sessions.completed.find(s => s.id === event.sessionId);
      if (!s || s.completedAt !== event.at)
        return pending("growth-source-inconsistent");
    }
    else {
      const s = byId.get(setIdentity(event.sessionId, event.setId!));
      if (!s || s.confirmedAt !== event.at || s.exerciseId !== event.exerciseId || !sameActual(s.actual, event.actual))
        return pending("growth-source-inconsistent");
    }
    if (event.at < boundary) {
      for (const change of event.changes) {
        if (ratings[change.area] !== change.before)
          return pending("growth-chain-inconsistent");
        ratings[change.area] = change.after;
      }
      eventIds.push(event.id);
    }
  }
  const qualifying = requiredSessions.filter(s => s.completedAt! >= week.startAt && s.exercises.some(e => e.sets.some(x => {
    const a = x.result?.actual;
    return a && (a.type === "time" ? a.seconds > 0 : a.reps > 0);
  })));
  const trainingDays = [...new Set(qualifying.map(s => matchDay(s.completedAt!, week.timeZone)))].sort();
  const weeklyBonus = Math.floor(10 * Math.min(trainingDays.length, goal) / goal);
  const ovr = overall(ratings);
  return { status: "ready", snapshot: { capturedAt: now, ratings, ovr, trainingDays, weeklyBonus, playerMatchPower: ovr + weeklyBonus,
      evidence: { initializedAt: player.initializedAt, eventIds, processedSetIds: requiredSets.map(s => setIdentity(s.sessionId, s.setId)).sort(), finalizedSessionIds: requiredSessions.map(s => s.id).sort(), qualifyingSessionIds: qualifying.map(s => s.id).sort() } } };
}
