/** Small storage boundary shared by local repositories. */
export interface StorageAdapter<T> {
  read(key: string): Promise<T | null>;
  write(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}
