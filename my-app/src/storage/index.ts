/** Future local-first adapter contract. Phase 1 does not read or persist data. */
export interface StorageAdapter<T> {
  read(key: string): Promise<T | null>;
  write(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}
