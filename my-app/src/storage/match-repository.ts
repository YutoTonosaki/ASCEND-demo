import { withStorageQueue } from "./queue";
import type { StorageAdapter } from "./index";
import {
  assertOwner,
  copy,
  generateCurrentMatch,
  parseMatches,
  matchStatus,
  resolveMatch,
  type MatchOwner,
} from "../matches/domain";
import { reconstructWeekEnd, type EvidenceResult } from "../matches/evidence";
import { isSessionData } from "../sessions/domain";
import type { SessionData } from "../types/session";
import type { TrainingProfile } from "../types/coach";
export const MATCHES_KEY = "ascend.matches.v1";
export class MatchRepository {
  constructor(
    private adapter: StorageAdapter<string>,
    private random: () => number = Math.random,
    private clock = () => new Date().toISOString(),
  ) {}
  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    return withStorageQueue(this.adapter, work);
  }
  load() {
    return this.enqueue(async () =>
      parseMatches(await this.adapter.read(MATCHES_KEY)),
    );
  }
  play(owner: MatchOwner, id: string) {
    const submitted = copy(owner);
    return this.enqueue(async () => {
      const data = parseMatches(await this.adapter.read(MATCHES_KEY));
      assertOwner(data, submitted);
      const match = data.matches.find((m) => m.id === id);
      if (!match) throw Error("Match not found.");
      // Read the clock inside the queue, after the durable read, never at tap time.
      const now = this.clock();
      if (matchStatus(match, now) === "SKIPPED") {
        if (!match.skippedAt) {
          match.skippedAt = now;
          const next = parseMatches(JSON.stringify(data));
          await this.adapter.write(MATCHES_KEY, JSON.stringify(next));
        }
        throw Error("Match playable window has ended.");
      }
      if (match.result) return data; // recovers a saved result after lost acknowledgment
      match.result = resolveMatch(match, now);
      const next = parseMatches(JSON.stringify(data));
      await this.adapter.write(MATCHES_KEY, JSON.stringify(next));
      return next;
    });
  }
  refresh(
    owner: MatchOwner,
    profile: TrainingProfile | null,
    sessions: SessionData,
    now: string,
    timeZone: string,
  ) {
    const input = copy({ owner, profile, sessions, now, timeZone });
    return this.enqueue(async () => {
      const prev = parseMatches(await this.adapter.read(MATCHES_KEY));
      assertOwner(prev, input.owner);
      if (!isSessionData(input.sessions))
        throw Error("Match Session data is not ready.");
      const next = copy(
        generateCurrentMatch(
          prev,
          input.owner,
          input.profile,
          input.now,
          input.timeZone,
          this.random,
        ),
      );
      const pending: Record<string, string> = {};
      for (const m of next.matches) {
        if (matchStatus(m, input.now) === "SKIPPED") {
          m.skippedAt ??= input.now;
          continue;
        }
        if (m.result || m.weekEnd !== null || input.now < m.week.endExclusiveAt)
          continue;
        const result: EvidenceResult = reconstructWeekEnd(
          input.owner.player,
          input.sessions,
          m.week,
          m.goalSnapshot,
          input.now,
        );
        if (result.status === "ready") m.weekEnd = result.snapshot;
        else pending[m.id] = result.reason;
      }
      const validated = parseMatches(JSON.stringify(next));
      if (JSON.stringify(prev) !== JSON.stringify(validated))
        await this.adapter.write(MATCHES_KEY, JSON.stringify(validated));
      return { data: validated, pending };
    });
  }
}
