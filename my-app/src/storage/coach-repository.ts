import type { StorageAdapter } from "./index";
import type { CoachData, TrainingProfile } from "../types/coach";
import {
  copyCoachData,
  copyProfile,
  isCoachData,
  isProfile,
} from "../coach/profile";
import { newId } from "../training/plans";
export const COACH_KEY = "ascend.coach.v1";
export class CoachRepository {
  private data: CoachData | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private adapter: StorageAdapter<string>) {}
  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    const operation = this.queue.then(work);
    this.queue = operation.catch(() => undefined);
    return operation;
  }
  load(): Promise<CoachData> {
    return this.enqueue(async () => {
      this.data = null;
      const raw = await this.adapter.read(COACH_KEY);
      let parsed: unknown;
      try {
        parsed = raw === null ? { version: 1, profile: null } : JSON.parse(raw);
      } catch {
        throw new Error(
          "Your training profile could not be read. Saved data has been kept.",
        );
      }
      if (!isCoachData(parsed))
        throw new Error(
          "Your training profile is incompatible or damaged. Saved data has been kept.",
        );
      this.data = parsed;
      return copyCoachData(parsed);
    });
  }
  save(profile: TrainingProfile): Promise<CoachData> {
    if (!isProfile(profile))
      return Promise.reject(
        new Error("Check your profile values before saving."),
      );
    const submitted = copyProfile(profile);
    return this.enqueue(async () => {
      if (!this.data)
        throw new Error("Profile data has not loaded. Please retry.");
      const next: CoachData = {
        version: 1,
        profile: {
          ...submitted,
          id: this.data.profile?.id ?? submitted.id,
          createdAt: this.data.profile?.createdAt ?? submitted.createdAt,
        },
      };
      if (!isCoachData(next))
        throw new Error("Check your profile dates and values.");
      await this.adapter.write(COACH_KEY, JSON.stringify(next));
      this.data = next;
      return copyCoachData(next);
    });
  }
  reset(): Promise<CoachData> {
    return this.enqueue(async () => {
      const raw = await this.adapter.read(COACH_KEY);
      if (raw !== null)
        await this.adapter.write(
          `${COACH_KEY}.backup.${Date.now()}.${newId()}`,
          raw,
        );
      const next: CoachData = { version: 1, profile: null };
      await this.adapter.write(COACH_KEY, JSON.stringify(next));
      this.data = next;
      return copyCoachData(next);
    });
  }
}
