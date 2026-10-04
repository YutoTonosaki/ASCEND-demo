import type { StorageAdapter } from "./index";
import {
  activeSeason,
  assertOwner,
  captureEvidence,
  parseSeasons,
  copy,
  type SeasonsData,
  startSeason,
  completeSeason,
  associateEvidence,
} from "../seasons/domain";
export const SEASONS_KEY = "ascend.seasons.v1";
export class SeasonsRepository {
  private queue: Promise<unknown> = Promise.resolve();
  record(
    owner: {
      career: Parameters<typeof startSeason>[1];
      player: Parameters<typeof startSeason>[2];
    },
    ...args: Parameters<typeof captureEvidence> extends [unknown, ...infer R]
      ? R
      : never
  ) {
    const input = copy(args),
      identity = copy(owner);
    return this.mutate((d) => {
      const s = activeSeason(d);
      if (!s) return d;
      assertOwner(d, identity.career, identity.player);
      const e = captureEvidence(s, ...input);
      return e ? associateEvidence(d, s.id, e) : d;
    });
  }
  constructor(private adapter: StorageAdapter<string>) {}
  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    const op = this.queue.then(work);
    this.queue = op.catch(() => {});
    return op;
  }
  load() {
    return this.enqueue(async () =>
      parseSeasons(await this.adapter.read(SEASONS_KEY)),
    );
  }
  private mutate(f: (d: SeasonsData) => SeasonsData) {
    return this.enqueue(async () => {
      const prev = parseSeasons(await this.adapter.read(SEASONS_KEY));
      const next = parseSeasons(JSON.stringify(f(prev)));
      if (JSON.stringify(prev) !== JSON.stringify(next))
        await this.adapter.write(SEASONS_KEY, JSON.stringify(next));
      return next;
    });
  }
  start(
    ...args: Parameters<typeof startSeason> extends [SeasonsData, ...infer R]
      ? R
      : never
  ) {
    const input = copy(args);
    return this.mutate((d) => startSeason(d, ...input));
  }
  complete(
    ...args: Parameters<typeof completeSeason> extends [SeasonsData, ...infer R]
      ? R
      : never
  ) {
    const input = copy(args);
    return this.mutate((d) => completeSeason(d, ...input));
  }
}
