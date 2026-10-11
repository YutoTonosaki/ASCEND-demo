import type { StorageAdapter } from "./index";
import { assertOwner, copy, generateCurrentMatch, parseMatches, type MatchOwner } from "../matches/domain";
import { reconstructWeekEnd, type EvidenceResult } from "../matches/evidence";
import { isSessionData } from "../sessions/domain";
import type { SessionData } from "../types/session";
import type { TrainingProfile } from "../types/coach";
export const MATCHES_KEY = "ascend.matches.v1";
// Share serialization across remounts/repository instances using the same adapter.
const queues = new WeakMap<StorageAdapter<string>, Promise<unknown>>();
export class MatchRepository {
  constructor(private adapter: StorageAdapter<string>, private random: () => number = Math.random) { }
  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    const op = (queues.get(this.adapter) ?? Promise.resolve()).then(work);
    queues.set(this.adapter, op.catch(() => { }));
    return op;
  }
  load() { return this.enqueue(async () => parseMatches(await this.adapter.read(MATCHES_KEY))); }
  refresh(owner: MatchOwner, profile: TrainingProfile | null, sessions: SessionData, now: string, timeZone: string) {
    const input = copy({ owner, profile, sessions, now, timeZone });
    return this.enqueue(async () => {
      const prev = parseMatches(await this.adapter.read(MATCHES_KEY));
      assertOwner(prev, input.owner);
      if (!isSessionData(input.sessions))
        throw Error("Match Session data is not ready.");
      const next = copy(generateCurrentMatch(prev, input.owner, input.profile, input.now, input.timeZone, this.random));
      const pending: Record<string, string> = {};
      for (const m of next.matches) {
        if (m.weekEnd !== null || input.now < m.week.endExclusiveAt)
          continue;
        const result: EvidenceResult = reconstructWeekEnd(input.owner.player, input.sessions, m.week, m.goalSnapshot, input.now);
        if (result.status === "ready")
          m.weekEnd = result.snapshot;
        else
          pending[m.id] = result.reason;
      }
      const validated = parseMatches(JSON.stringify(next));
      if (JSON.stringify(prev) !== JSON.stringify(validated))
        await this.adapter.write(MATCHES_KEY, JSON.stringify(validated));
      return { data: validated, pending };
    });
  }
}
