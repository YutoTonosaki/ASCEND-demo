import { PlayerRepository } from "../storage/player-repository";
import type { StorageAdapter } from "../storage";

/** Independent read-only repository: a debug read cannot invalidate the live writer's state. */
export function createGrowthDebugReader(adapter: StorageAdapter<string>) {
  const repository = new PlayerRepository({
    read: (key) => adapter.read(key),
    write: async () => { throw new Error("Growth debug is read-only."); },
    remove: async () => { throw new Error("Growth debug is read-only."); },
  });
  return () => repository.load();
}
