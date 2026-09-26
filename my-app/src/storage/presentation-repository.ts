import type { StorageAdapter } from "./index";
export const PRESENTATION_KEY = "ascend.presentation.v1";
interface PresentationData {
  version: 1;
  consumed: string[];
}
function parse(raw: string | null): PresentationData {
  if (raw === null) return { version: 1, consumed: [] };
  const data = JSON.parse(raw);
  if (
    data?.version !== 1 ||
    !Array.isArray(data.consumed) ||
    !data.consumed.every(
      (id: unknown) => typeof id === "string" && id.trim(),
    ) ||
    new Set(data.consumed).size !== data.consumed.length
  )
    throw new Error("Presentation storage is unavailable");
  return data;
}
/** Mark-before-show. Failed/malformed reads never reset data or permit display. */
export class PresentationRepository {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private adapter: StorageAdapter<string>) {}
  consume(identity: string): Promise<boolean> {
    const result = this.queue.then(async () => {
      const data = parse(await this.adapter.read(PRESENTATION_KEY));
      if (data.consumed.includes(identity)) return false;
      await this.adapter.write(
        PRESENTATION_KEY,
        JSON.stringify({
          version: 1,
          consumed: [...data.consumed, identity],
        }),
      );
      return true;
    });
    this.queue = result.catch(() => {});
    return result;
  }
}
