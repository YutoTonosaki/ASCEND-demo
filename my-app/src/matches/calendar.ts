import { validDate } from "../growth/domain";
export interface MatchWeek {
  weekId: string;
  timeZone: string;
  startAt: string;
  endExclusiveAt: string;
  expiresAt: string;
}
const formatters = new Map<string, Intl.DateTimeFormat>();
function parts(at: string, timeZone: string) {
  if (!validDate(at))
    throw Error("Invalid Match timestamp.");
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone, calendar: "iso8601", numberingSystem: "latn",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    });
    formatters.set(timeZone, formatter);
  }
  return Object.fromEntries(formatter.formatToParts(new Date(at)).map(p => [p.type, p.value]));
}
export function matchDay(at: string, timeZone: string) {
  const p = parts(at, timeZone);
  return `${p.year}-${p.month}-${p.day}`;
}
function shift(day: string, days: number) {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
/** Resolve each local midnight independently. Unrepresentable/ambiguous calendars fail closed. */
function midnight(day: string, timeZone: string) {
  const target = Date.parse(`${day}T00:00:00.000Z`);
  const candidates = new Set<number>();
  for (let h = -48; h <= 48; h += 6) {
    const probe = target + h * 3600000;
    const p = parts(new Date(probe).toISOString(), timeZone);
    const wall = Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}.000Z`);
    const candidate = target - (wall - probe);
    const c = parts(new Date(candidate).toISOString(), timeZone);
    if (`${c.year}-${c.month}-${c.day}` === day && c.hour === "00" && c.minute === "00" && c.second === "00")
      candidates.add(candidate);
  }
  if (candidates.size !== 1)
    throw Error("Match calendar midnight is missing or ambiguous. Saved data is preserved.");
  return new Date([...candidates][0]).toISOString();
}
export function matchWeek(at: string, timeZone: string): MatchWeek {
  const day = matchDay(at, timeZone);
  const weekday = new Date(`${day}T00:00:00.000Z`).getUTCDay();
  const weekId = shift(day, -(weekday + 6) % 7);
  return { weekId, timeZone, startAt: midnight(weekId, timeZone),
    endExclusiveAt: midnight(shift(weekId, 7), timeZone), expiresAt: midnight(shift(weekId, 14), timeZone) };
}
export function validWeek(w: MatchWeek) {
  try {
    if (!w || !validDate(w.startAt))
      return false;
    const expected = matchWeek(w.startAt, w.timeZone);
    return Object.keys(expected).every(k => expected[k as keyof MatchWeek] === w[k as keyof MatchWeek]);
  }
  catch {
    return false;
  }
}
