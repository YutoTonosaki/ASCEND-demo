import type { BodyRatings, CardTier } from "../types/domain";
import type { GrowthPlayer } from "../types/growth";
import type { Club } from "../types/club";
import type { Career } from "../career/domain";
import type { SessionData, WorkoutSession } from "../types/session";
import { currentTenure } from "../career/domain";
import { overall } from "../growth/domain";
import {
  deriveCardTier,
  deriveCardFinish,
  type CardFinish,
} from "../cards/domain";
import { derivePersonalRecords } from "../records/domain";
import { isSession } from "../sessions/domain";
import { bodyParts } from "../config/training";
import {
  calendarContext,
  validCalendar,
  type CalendarContext,
} from "./calendar";
export interface PlayerSnapshot {
  ratings: BodyRatings;
  ovr: number;
  tier: CardTier;
  finish: CardFinish;
}
export interface SeasonEvidence extends CalendarContext {
  sessionId: string;
  prSetIds: string[];
}
export interface SeasonStats {
  workouts: number;
  trainingDays: number;
  prImprovements: number;
}
export interface Season {
  id: string;
  number: number;
  monthId: string;
  playerId: string;
  careerStartedAt: string;
  start: CalendarContext;
  club: Club;
  startingPlayer: PlayerSnapshot;
  evidence: SeasonEvidence[];
  end: null | {
    calendar: CalendarContext;
    player: PlayerSnapshot;
    stats: SeasonStats;
  };
}
export interface SeasonsData {
  version: 1;
  seasons: Season[];
}
export const emptySeasons = (): SeasonsData => ({ version: 1, seasons: [] });
export const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v));
export const activeSeason = (d: SeasonsData) => d.seasons.find((s) => !s.end);
export const seasonIdentity = (
  playerId: string,
  careerStartedAt: string,
  monthId: string,
) => JSON.stringify([playerId, careerStartedAt, monthId]);
export function playerSnapshot(player: GrowthPlayer): PlayerSnapshot {
  const ovr = overall(player.ratings);
  return {
    ratings: { ...player.ratings },
    ovr,
    tier: deriveCardTier(ovr),
    finish: deriveCardFinish(ovr),
  };
}
export function statistics(s: Season): SeasonStats {
  return {
    workouts: s.evidence.length,
    trainingDays: new Set(s.evidence.map((e) => e.localDay)).size,
    prImprovements: new Set(s.evidence.flatMap((e) => e.prSetIds)).size,
  };
}
export function assertOwner(
  d: SeasonsData,
  career: Career,
  player: GrowthPlayer,
) {
  if (career.playerId !== player.id || !career.clubHistory.length)
    throw Error("A valid Career and Player are required.");
  if (
    d.seasons.some(
      (s) =>
        s.playerId !== player.id ||
        s.careerStartedAt !== career.clubHistory[0].joinedAt,
    )
  )
    throw Error("Season Career identity mismatch. Saved data is preserved.");
  const active = activeSeason(d);
  if (active && active.club.id !== currentTenure(career).clubId)
    throw Error("Active Season Club does not match Career.");
}
export function startSeason(
  d: SeasonsData,
  career: Career,
  player: GrowthPlayer,
  club: Club,
  clock: CalendarContext,
): SeasonsData {
  assertOwner(d, career, player);
  if (
    !validCalendar(clock) ||
    club.id !== currentTenure(career).clubId ||
    Date.parse(clock.at) < Date.parse(currentTenure(career).joinedAt)
  )
    throw Error("Season starting evidence is invalid.");
  const same = d.seasons.find((s) => s.monthId === clock.monthId);
  if (same) return copy(d);
  if (activeSeason(d)) throw Error("Complete your previous Season first.");
  const last = d.seasons.at(-1);
  if (
    last &&
    (clock.monthId <= last.monthId ||
      Date.parse(clock.at) < Date.parse(last.end!.calendar.at))
  )
    throw Error("Device calendar is earlier than saved Season history.");
  const next = copy(d);
  next.seasons.push({
    id: seasonIdentity(
      player.id,
      career.clubHistory[0].joinedAt,
      clock.monthId,
    ),
    number: d.seasons.length + 1,
    monthId: clock.monthId,
    playerId: player.id,
    careerStartedAt: career.clubHistory[0].joinedAt,
    start: { ...clock },
    club: copy(club),
    startingPlayer: playerSnapshot(player),
    evidence: [],
    end: null,
  });
  return next;
}
export function completeSeason(
  d: SeasonsData,
  id: string,
  career: Career,
  player: GrowthPlayer,
  clock: CalendarContext,
): SeasonsData {
  assertOwner(d, career, player);
  const next = copy(d),
    s = next.seasons.find((s) => s.id === id);
  if (!s) throw Error("Season not found.");
  if (s.end) return next;
  if (
    !validCalendar(clock) ||
    clock.monthId <= s.monthId ||
    Date.parse(clock.at) < Date.parse(s.start.at) ||
    s.evidence.some((e) => Date.parse(e.at) > Date.parse(clock.at))
  )
    throw Error("Complete this Season after its calendar month ends.");
  s.end = {
    calendar: { ...clock },
    player: playerSnapshot(player),
    stats: statistics(s),
  };
  return next;
}
/** Capture only from the successful live-completion callback, never a history scan. */
export function captureEvidence(
  s: Season,
  session: WorkoutSession,
  history: SessionData,
  captured = calendarContext(new Date(session.completedAt!)),
): SeasonEvidence | null {
  if (!isSession(session) || session.status !== "completed")
    throw Error("Completed workout required.");
  if (
    !history.completed.some(
      (x) =>
        x.id === session.id && JSON.stringify(x) === JSON.stringify(session),
    )
  )
    throw Error("Saved session evidence unavailable.");
  const cal = { ...captured };
  if (!validCalendar(cal) || cal.at !== session.completedAt)
    throw Error("Completion calendar mismatch.");
  if (
    s.end ||
    cal.monthId !== s.monthId ||
    Date.parse(cal.at) < Date.parse(s.start.at)
  )
    return null;
  const records = derivePersonalRecords([
    ...history.completed,
    ...(history.active ? [history.active] : []),
  ]);
  if (records.rejectedSessions)
    throw Error("Workout history could not be validated for Season PRs.");
  const prSetIds = records.comparisons
    .filter(
      (c) =>
        c.source.sessionId === session.id &&
        Date.parse(c.source.confirmedAt) >= Date.parse(s.start.at) &&
        c.metrics.some((m) => m.outcome === "improved"),
    )
    .map((c) =>
      JSON.stringify([c.source.sessionId, c.source.entryId, c.source.setId]),
    );
  return { ...cal, sessionId: session.id, prSetIds };
}
export function associateEvidence(
  d: SeasonsData,
  id: string,
  e: SeasonEvidence,
): SeasonsData {
  const next = copy(d),
    s = next.seasons.find((s) => s.id === id);
  if (!s) throw Error("Season not found.");
  if (
    d.seasons.some((x) => x.evidence.some((v) => v.sessionId === e.sessionId))
  )
    return next;
  if (
    s.end ||
    e.monthId !== s.monthId ||
    Date.parse(e.at) < Date.parse(s.start.at)
  )
    throw Error("Workout does not belong to this active Season.");
  s.evidence.push(copy(e));
  return next;
}
function validSnapshot(v: PlayerSnapshot): boolean {
  return (
    !!v &&
    bodyParts.every(
      (a) =>
        Number.isFinite(v.ratings?.[a]) &&
        v.ratings[a] >= 0 &&
        v.ratings[a] <= 99,
    ) &&
    v.ovr === overall(v.ratings) &&
    v.tier === deriveCardTier(v.ovr) &&
    v.finish === deriveCardFinish(v.ovr)
  );
}
const text = (v: unknown): v is string => typeof v === "string" && !!v.trim();
function validClub(c: Club): boolean {
  return (
    !!c &&
    [c.id, c.name, c.shortName, c.country, c.description].every(text) &&
    ["japan", "england", "germany", "spain", "italy", "france"].includes(
      c.environment,
    ) &&
    c.league === c.environment.toUpperCase() &&
    Number.isInteger(c.reputation) &&
    c.reputation >= 1 &&
    c.reputation <= 5 &&
    Number.isInteger(c.recommendedOVR) &&
    c.recommendedOVR >= 0 &&
    c.recommendedOVR <= 99 &&
    [c.primaryColor, c.secondaryColor].every((x) => /^#[\da-f]{6}$/i.test(x)) &&
    !!c.crest &&
    [c.crest.viewBox, c.crest.outlinePath, c.crest.markPath].every(text) &&
    Array.isArray(c.preferredArchetypes) &&
    c.preferredArchetypes.every(text) &&
    Array.isArray(c.preferredAttributes) &&
    c.preferredAttributes.every((a) => bodyParts.includes(a))
  );
}
export function parseSeasons(raw: string | null): SeasonsData {
  if (raw === null) return emptySeasons();
  try {
    const d: SeasonsData = JSON.parse(raw);
    if (d?.version !== 1 || !Array.isArray(d.seasons)) throw Error();
    const months = new Set<string>(),
      sessions = new Set<string>(),
      prs = new Set<string>();
    for (const [i, s] of d.seasons.entries()) {
      if (
        !s ||
        s.number !== i + 1 ||
        !text(s.playerId) ||
        !text(s.careerStartedAt) ||
        new Date(s.careerStartedAt).toISOString() !== s.careerStartedAt ||
        !validCalendar(s.start) ||
        s.monthId !== s.start.monthId ||
        s.id !== seasonIdentity(s.playerId, s.careerStartedAt, s.monthId) ||
        months.has(s.monthId) ||
        !validClub(s.club) ||
        !validSnapshot(s.startingPlayer) ||
        !Array.isArray(s.evidence) ||
        Date.parse(s.start.at) < Date.parse(s.careerStartedAt)
      )
        throw Error();
      if (i) {
        const prev = d.seasons[i - 1];
        if (
          !prev.end ||
          s.monthId <= prev.monthId ||
          s.playerId !== prev.playerId ||
          s.careerStartedAt !== prev.careerStartedAt ||
          Date.parse(s.start.at) < Date.parse(prev.end.calendar.at)
        )
          throw Error();
      }
      months.add(s.monthId);
      for (const e of s.evidence) {
        if (
          !e ||
          !text(e.sessionId) ||
          sessions.has(e.sessionId) ||
          !validCalendar(e) ||
          e.monthId !== s.monthId ||
          Date.parse(e.at) < Date.parse(s.start.at) ||
          !Array.isArray(e.prSetIds)
        )
          throw Error();
        sessions.add(e.sessionId);
        for (const id of e.prSetIds) {
          const ids = JSON.parse(id);
          if (
            !Array.isArray(ids) ||
            ids.length !== 3 ||
            ids[0] !== e.sessionId ||
            !ids.every(text) ||
            JSON.stringify(ids) !== id ||
            prs.has(id)
          )
            throw Error();
          prs.add(id);
        }
      }
      if (s.end !== null) {
        if (
          !s.end ||
          !validCalendar(s.end.calendar) ||
          s.end.calendar.monthId <= s.monthId ||
          Date.parse(s.end.calendar.at) < Date.parse(s.start.at) ||
          !validSnapshot(s.end.player) ||
          s.evidence.some(
            (e) => Date.parse(e.at) > Date.parse(s.end!.calendar.at),
          )
        )
          throw Error();
        const st = statistics(s);
        if (
          !s.end.stats ||
          Object.keys(st).some(
            (k) =>
              st[k as keyof SeasonStats] !==
              s.end!.stats[k as keyof SeasonStats],
          )
        )
          throw Error();
      } else if (i !== d.seasons.length - 1) throw Error();
    }
    return copy(d);
  } catch {
    throw Error(
      "Season data is unavailable or incompatible. Saved history is preserved. Please retry.",
    );
  }
}
