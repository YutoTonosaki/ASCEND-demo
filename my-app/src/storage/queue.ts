import type { StorageAdapter } from "./index";

// One lock for Match and Rewards operations on a shared adapter. Callers inside
// an operation use raw adapter reads/writes and pure validators, never re-enter it.
const queues = new WeakMap<StorageAdapter<string>, Promise<unknown>>();
export function withStorageQueue<T>(
  adapter: StorageAdapter<string>,
  work: () => Promise<T>,
): Promise<T> {
  const operation = (queues.get(adapter) ?? Promise.resolve()).then(work);
  queues.set(
    adapter,
    operation.catch(() => {}),
  );
  return operation;
}
