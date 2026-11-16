import type { StorageAdapter } from "./index";
import type { Exercise, WorkoutPlan } from "../types/training";
import type { ActualResult, SessionData } from "../types/session";
import { copyExercise, copyWorkoutPlan, newId } from "../training/plans";
import {
  confirmSet,
  copySessionData,
  endRest,
  isSessionData,
  startSession,
} from "../sessions/domain";
import { withStorageQueue } from "./queue";
import { captureCompletionContext, deviceTimeZone } from "../sessions/calendar";
export const SESSION_KEY = "ascend.sessions.v1";
export const emptySessionData = (): SessionData => ({
  version: 1,
  active: null,
  completed: [],
});
export type SessionCommand =
  | { type: "start"; plan: WorkoutPlan; library: Exercise[] }
  | { type: "confirm"; sessionId: string; setId: string; actual: ActualResult }
  | { type: "rest"; sessionId: string; deadline: string; skip: boolean };
export class SessionRepository {
  private data: SessionData | null = null;
  // Retain an unacknowledged final confirmation during same-process retries.
  private completionAttempt: { base: string; command: string; data: SessionData } | null = null;
  constructor(
    private adapter: StorageAdapter<string>,
    private clock = () => new Date().toISOString(),
    private timeZone = deviceTimeZone,
  ) {}
  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    return withStorageQueue(this.adapter, work);
  }
  private async read(): Promise<SessionData> {
    return readSessionData(this.adapter);
  }
  load(): Promise<SessionData> {
    return this.enqueue(async () => {
      this.data = null;
      const parsed = await this.read();
      this.data = parsed;
      return copySessionData(parsed);
    });
  }
  commit(command: SessionCommand): Promise<SessionData> {
    const submitted: SessionCommand =
      command.type === "start"
        ? {
            ...command,
            plan: copyWorkoutPlan(command.plan),
            library: command.library.map(copyExercise),
          }
        : command.type === "confirm"
          ? { ...command, actual: { ...command.actual } }
          : { ...command };
    return this.enqueue(async () => {
      if (!this.data)
        throw new Error("Workout sessions have not loaded. Please retry.");
      const durable = await this.read();
      const base = JSON.stringify(durable);
      const commandKey = JSON.stringify(submitted);
      const attempt = this.completionAttempt;
      if (attempt?.base === base && attempt.command === commandKey) {
        await this.adapter.write(SESSION_KEY, JSON.stringify(attempt.data));
        this.data = attempt.data;
        this.completionAttempt = null;
        return copySessionData(this.data);
      }
      this.completionAttempt = null;
      const next = copySessionData(durable);
      if (submitted.type === "start") {
        if (next.active)
          throw new Error(
            "Resume your current workout before starting another.",
          );
        next.active = startSession(
          submitted.plan,
          submitted.library,
          this.clock(),
        );
      } else if (next.active?.id === submitted.sessionId) {
        next.active =
          submitted.type === "confirm"
            ? confirmSet(
                next.active,
                submitted.setId,
                submitted.actual,
                this.clock(),
              )
            : endRest(
                next.active,
                submitted.deadline,
                submitted.skip,
                this.clock(),
              );
        if (next.active.status === "completed") {
          next.active.completionContext = captureCompletionContext(
            new Date(next.active.completedAt),
            this.timeZone(),
          );
          next.completed.unshift(next.active);
          next.active = null;
        }
      }
      if (!isSessionData(next))
        throw new Error(
          "Invalid workout session. Your saved data has been kept.",
        );
      const serialized = JSON.stringify(next);
      if (serialized !== base) {
        if (submitted.type === "confirm" && durable.active && !next.active) {
          this.completionAttempt = { base, command: commandKey, data: next };
        }
        await this.adapter.write(SESSION_KEY, serialized);
      }
      this.completionAttempt = null;
      this.data = next;
      return copySessionData(next);
    });
  }
  reset(): Promise<SessionData> {
    return this.enqueue(async () => {
      const raw = await this.adapter.read(SESSION_KEY);
      if (raw !== null)
        await this.adapter.write(
          `${SESSION_KEY}.backup.${Date.now()}.${newId()}`,
          raw,
        );
      const next = emptySessionData();
      await this.adapter.write(SESSION_KEY, JSON.stringify(next));
      this.data = next;
      return copySessionData(next);
    });
  }
}

/** Raw read for callers already holding the shared adapter lock. No writes. */
export async function readSessionData(adapter: StorageAdapter<string>): Promise<SessionData> {
  const raw = await adapter.read(SESSION_KEY);
  let parsed: unknown;
  try {
    parsed = raw === null ? emptySessionData() : JSON.parse(raw);
  } catch {
    throw new Error("Workout sessions could not be read. Your data has been kept unchanged.");
  }
  if (!isSessionData(parsed))
    throw new Error("Workout sessions are incompatible or damaged. Your data has been kept unchanged.");
  return parsed;
}
