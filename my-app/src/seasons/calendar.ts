export interface CalendarContext {
  at: string;
  localDay: string;
  monthId: string;
  offsetMinutes: number;
}
const pad = (n: number) => String(n).padStart(2, "0");
export function localMonth(date: Date): string {
  if (!Number.isFinite(date.getTime())) throw Error("Invalid date");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}
export function calendarContext(date: Date): CalendarContext {
  return {
    at: date.toISOString(),
    monthId: localMonth(date),
    localDay: `${localMonth(date)}-${pad(date.getDate())}`,
    offsetMinutes: date.getTimezoneOffset(),
  };
}
export function validCalendar(c: CalendarContext): boolean {
  try {
    if (
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(c.monthId) ||
      !Number.isInteger(c.offsetMinutes) ||
      Math.abs(c.offsetMinutes) > 840 ||
      new Date(c.at).toISOString() !== c.at
    )
      return false;
    const wall = new Date(Date.parse(c.at) - c.offsetMinutes * 60000);
    const day = `${wall.getUTCFullYear()}-${pad(wall.getUTCMonth() + 1)}-${pad(wall.getUTCDate())}`;
    return c.localDay === day && c.monthId === day.slice(0, 7);
  } catch {
    return false;
  }
}
export function monthLabel(month: string): string {
  return new Date(`${month}-15T12:00:00Z`)
    .toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    })
    .toUpperCase();
}
