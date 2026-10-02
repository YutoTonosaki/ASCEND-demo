import type { StorageAdapter } from "./index";
import { beginCareer, parseCareer, type CareerData } from "../career/domain";
export const CAREER_KEY = "ascend.career.v1";
export class CareerRepository {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(
    private adapter: StorageAdapter<string>,
    private clock = () => new Date().toISOString(),
  ) {}
  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    const operation = this.queue.then(work);
    this.queue = operation.catch(() => {});
    return operation;
  }
  load(): Promise<CareerData> {
    return this.enqueue(async () =>
      parseCareer(await this.adapter.read(CAREER_KEY)),
    );
  }
  join(playerId: string, clubId: string): Promise<CareerData> {
    return this.enqueue(async () => {
      const saved = parseCareer(await this.adapter.read(CAREER_KEY));
      if (saved.career) {
        if (saved.career.playerId !== playerId)
          throw new Error(
            "Career belongs to another Player. Saved data is preserved.",
          );
        return saved;
      }
      const next = beginCareer(playerId, clubId, this.clock());
      await this.adapter.write(CAREER_KEY, JSON.stringify(next));
      return next;
    });
  }
}
