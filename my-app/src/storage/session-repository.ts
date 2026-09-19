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
  private queue: Promise<unknown> = Promise.resolve();
  constructor(
    private adapter: StorageAdapter<string>,
    private clock = () => new Date().toISOString(),
  ) {}
  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    const operation = this.queue.then(work);
    this.queue = operation.catch(() => undefined);
    return operation;
  }
  load(): Promise<SessionData> {
    return this.enqueue(async () => {
      this.data = null;
      const raw = await this.adapter.read(SESSION_KEY);
      let parsed: unknown;
      try {
        parsed = raw === null ? emptySessionData() : JSON.parse(raw);
      } catch {
        throw new Error(
          "Workout sessions could not be read. Your data has been kept unchanged.",
        );
      }
      if (!isSessionData(parsed))
        throw new Error(
          "Workout sessions are incompatible or damaged. Your data has been kept unchanged.",
        );
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
      const next = copySessionData(this.data);
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
          next.completed.unshift(next.active);
          next.active = null;
        }
      }
      if (!isSessionData(next))
        throw new Error(
          "Invalid workout session. Your saved data has been kept.",
        );
      await this.adapter.write(SESSION_KEY, JSON.stringify(next));
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
