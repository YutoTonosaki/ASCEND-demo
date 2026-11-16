import type { StorageAdapter } from "./index";
import { withStorageQueue } from "./queue";
import { readSessionData } from "./session-repository";
import { parseXPData, type XPData } from "../xp/activation";

export const XP_KEY = "ascend.experience.v1";

/** Explicit activation only. Constructing/loading this repository never activates XP. */
export class XPRepository {
  constructor(
    private adapter: StorageAdapter<string>,
    private clock = () => new Date().toISOString(),
  ) {}

  load(): Promise<XPData> {
    return withStorageQueue(this.adapter, async () =>
      parseXPData(await this.adapter.read(XP_KEY)),
    );
  }

  activate(): Promise<XPData> {
    return withStorageQueue(this.adapter, async () => {
      const existing = parseXPData(await this.adapter.read(XP_KEY));
      if (existing.activation) return existing;
      // Raw read inside the same lock as Session commits; never call load/commit here.
      const sessions = await readSessionData(this.adapter);
      const next: XPData = {
        version: 1,
        activation: {
          activatedAt: this.clock(),
          excludedSessionIds: sessions.completed.map(session => session.id).sort(),
        },
      };
      const serialized = JSON.stringify(next);
      parseXPData(serialized);
      await this.adapter.write(XP_KEY, serialized);
      const confirmed = parseXPData(await this.adapter.read(XP_KEY));
      if (JSON.stringify(confirmed) !== serialized)
        throw new Error("XP activation could not be verified. Please retry.");
      return confirmed;
    });
  }
}
