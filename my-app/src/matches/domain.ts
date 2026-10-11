import { currentTenure, parseCareer, type Career } from "../career/domain";
import { clubById } from "../config/clubs";
import { bodyParts } from "../config/training";
import { isProfile } from "../coach/profile";
import { overall, validDate } from "../growth/domain";
import { isPlayerData } from "../growth/validation";
import type { GrowthPlayer } from "../types/growth";
import type { TrainingProfile } from "../types/coach";
import type { Club } from "../types/club";
import { matchWeek, validWeek, type MatchWeek } from "./calendar";
import { difficultyWeights, generationEvidence as rivalEvidence, generateRival, type Rival } from "./rival";
import type { WeekEnd } from "./evidence";
export interface Match {
  id: string;
  playerId: string;
  careerStartedAt: string;
  week: MatchWeek;
  generatedAt: string;
  rulesVersion: 1;
  goalSnapshot: number;
  baselineRatings: GrowthPlayer["ratings"];
  baselineOVR: number;
  club: Club;
  generationEvidence: {
    completedMatchIds: string[];
    wins: number;
    weights: [
      number,
      number,
      number
    ];
  };
  rival: Rival;
  weekEnd: WeekEnd | null;
  // Resolution and reward delivery intentionally unavailable in Phase 4C-1.
  result: null;
  rewardDelivery: null;
}
export interface MatchData {
  version: 1;
  matches: Match[];
}
export interface MatchOwner {
  player: GrowthPlayer;
  career: Career;
}
export const copy = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
export const matchId = (playerId: string, careerStartedAt: string, weekId: string) => JSON.stringify([playerId, careerStartedAt, weekId]);
export function assertOwner(data: MatchData, owner: MatchOwner) {
  if (!isPlayerData({ version: 1, player: owner.player }))
    throw Error("Match Player data is invalid.");
  const career = parseCareer(JSON.stringify({ version: 1, career: owner.career })).career!;
  if (career.playerId !== owner.player.id || data.matches.some(m => m.playerId !== owner.player.id || m.careerStartedAt !== career.clubHistory[0].joinedAt))
    throw Error("Match ownership mismatch. Saved data is preserved.");
}
export function generateCurrentMatch(data: MatchData, owner: MatchOwner, profile: TrainingProfile | null, now: string, timeZone: string, random: () => number): MatchData {
  assertOwner(data, owner);
  if (!validDate(now) || (profile !== null && !isProfile(profile)))
    throw Error("Match generation prerequisites are invalid.");
  const tenure = currentTenure(owner.career);
  if (owner.player.initializedAt > now || tenure.joinedAt > now || tenure.leftAt !== null || owner.player.events.some(e => e.at > now))
    throw Error("Match clock or Career is not ready.");
  const week = matchWeek(now, timeZone);
  const id = matchId(owner.player.id, owner.career.clubHistory[0].joinedAt, week.weekId);
  // Also preserve an ongoing Match's original timezone across travel.
  if (data.matches.some(m => m.id === id || (m.week.startAt <= now && now < m.week.endExclusiveAt)))
    return data;
  if (data.matches.some(m => m.generatedAt > now))
    throw Error("Match clock moved backwards. Saved data is preserved.");
  const baselineRatings = { ...owner.player.ratings }, baselineOVR = overall(baselineRatings);
  // No completed results can be created in 4C-1. 4C-2 will supply authoritative completion history.
  const generationEvidence = rivalEvidence([]);
  const m: Match = { id, playerId: owner.player.id, careerStartedAt: owner.career.clubHistory[0].joinedAt,
    week, generatedAt: now, rulesVersion: 1, goalSnapshot: profile?.preferredTrainingDaysPerWeek ?? 3,
    baselineRatings, baselineOVR, club: copy(clubById(tenure.clubId)!), generationEvidence,
    rival: generateRival(id, baselineOVR, generationEvidence.weights, tenure.clubId, random), weekEnd: null, result: null, rewardDelivery: null };
  return { ...data, matches: [...data.matches, m] };
}
const text = (v: unknown): v is string => typeof v === "string" && !!v.trim();
const integer = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
const list = (v: unknown): v is string[] => Array.isArray(v) && v.every(text) && new Set(v).size === v.length;
const ratingsValid = (r: Match["baselineRatings"]) => r && Object.keys(r).length === 6 && bodyParts.every(a => Number.isFinite(r[a]) && r[a] >= 0 && r[a] <= 99);
function clubValid(c: Club) {
  return c && text(c.id) && text(c.name) && text(c.shortName) && text(c.country) && ["JAPAN", "ENGLAND", "SPAIN", "GERMANY", "ITALY", "FRANCE"].includes(c.league) && text(c.primaryColor) && text(c.secondaryColor) && c.crest && text(c.crest.viewBox) && text(c.crest.markPath) && text(c.crest.outlinePath);
}
export function parseMatches(raw: string | null): MatchData {
  if (raw === null)
    return { version: 1, matches: [] };
  try {
    const d: MatchData = JSON.parse(raw);
    if (d?.version !== 1 || !Array.isArray(d.matches))
      throw Error();
    const ids = new Set<string>();
    for (const m of d.matches) {
      if (!m || !text(m.playerId) || !validDate(m.careerStartedAt) || !validWeek(m.week) || !validDate(m.generatedAt) || m.generatedAt < m.week.startAt || m.generatedAt >= m.week.endExclusiveAt || m.generatedAt < m.careerStartedAt || m.rulesVersion !== 1 || !integer(m.goalSnapshot, 1, 7) || m.id !== matchId(m.playerId, m.careerStartedAt, m.week.weekId) || ids.has(m.id) || !ratingsValid(m.baselineRatings) || m.baselineOVR !== overall(m.baselineRatings) || !clubValid(m.club) || m.result !== null || m.rewardDelivery !== null)
        throw Error();
      ids.add(m.id);
      const r = m.rival, e = m.generationEvidence;
      if (!e || !list(e.completedMatchIds) || e.completedMatchIds.length !== 0 || !integer(e.wins, 0, e.completedMatchIds.length) || JSON.stringify(e.weights) !== JSON.stringify(difficultyWeights(e.wins)))
        throw Error();
      const range = { UNDERDOG: [-6, -3], EVEN: [-2, 2], CHALLENGER: [3, 6] }[r?.difficulty];
      if (!r || !range || r.id !== JSON.stringify([m.id, "rival"]) || !text(r.name) || !integer(r.difference, range[0], range[1]) || r.ovr !== Math.max(0, Math.min(99, m.baselineOVR + r.difference)) || !integer(r.condition, 4, 10) || !clubValid(r.club) || !r.appearance || r.appearance.version !== 1 || !integer(r.appearance.avatarVariant, 0, 3) || r.appearance.kitColor !== r.club.primaryColor)
        throw Error();
      if (m.weekEnd !== null) {
        const s = m.weekEnd;
        if (!s || !validDate(s.capturedAt) || s.capturedAt < m.week.endExclusiveAt || !ratingsValid(s.ratings) || s.ovr !== overall(s.ratings) || !list(s.trainingDays) || s.trainingDays.length > 7 || s.trainingDays.some(day => !/^\d{4}-\d{2}-\d{2}$/.test(day) || !validDate(`${day}T00:00:00.000Z`) || day < m.week.weekId || day >= new Date(Date.parse(m.week.weekId) + 7 * 86400000).toISOString().slice(0, 10)) || JSON.stringify([...s.trainingDays].sort()) !== JSON.stringify(s.trainingDays) || s.weeklyBonus !== Math.floor(10 * Math.min(s.trainingDays.length, m.goalSnapshot) / m.goalSnapshot) || s.playerMatchPower !== s.ovr + s.weeklyBonus || !s.evidence || !validDate(s.evidence.initializedAt) || s.evidence.initializedAt > m.generatedAt || !list(s.evidence.eventIds) || !list(s.evidence.processedSetIds) || !list(s.evidence.finalizedSessionIds) || !list(s.evidence.qualifyingSessionIds) || s.trainingDays.length > s.evidence.qualifyingSessionIds.length || s.evidence.qualifyingSessionIds.some(id => !s.evidence.finalizedSessionIds.includes(id)))
          throw Error();
      }
    }
    return copy(d);
  }
  catch {
    throw Error("Match data is unavailable or incompatible. Saved data is preserved; retry after restoring valid data.");
  }
}
