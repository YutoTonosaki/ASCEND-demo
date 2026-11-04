/** Own an asynchronous model independently of navigation or React remounts. */
export function ownedLoad<T>(
  load: () => Promise<T>,
  ready: (value: T) => void,
  fail: (error: unknown) => void,
  release: (value: T) => void,
): () => void {
  let closed = false;
  let resource: T | undefined;
  void (async () => {
    try {
      const value = await load();
      if (closed) release(value);
      else {
        resource = value;
        ready(value);
      }
    } catch (error) {
      if (!closed) fail(error);
    }
  })();
  return () => {
    if (closed) return;
    closed = true;
    if (resource !== undefined) {
      const value = resource;
      resource = undefined;
      release(value);
    }
  };
}

export const shouldMountRenderer = (
  open: boolean,
  foreground: boolean,
  failed: boolean,
) => open && foreground && !failed;

/** Native AppState can be null during bridge bootstrap. A fresh visible UI
 * intent may open unless the OS has positively reported background/inactive.
 * Subsequent OS events remain authoritative.
 */
export const foregroundAtOpen = (state: string | null | undefined) =>
  state !== "background" && state !== "inactive";

export type Touch = Readonly<{ x: number; y: number }>;
export function gestureDelta(
  previous: readonly Touch[],
  next: readonly Touch[],
) {
  if (previous.length === 1 && next.length === 1) {
    const dx = next[0].x - previous[0].x;
    return { rotation: Number.isFinite(dx) ? dx * 0.012 : 0, zoom: 1 };
  }
  if (previous.length === 2 && next.length === 2) {
    const distance = (t: readonly Touch[]) =>
      Math.hypot(t[0].x - t[1].x, t[0].y - t[1].y);
    const a = distance(previous),
      b = distance(next);
    return {
      rotation: 0,
      zoom: a > 0 && b > 0 && Number.isFinite(a / b) ? a / b : 1,
    };
  }
  return { rotation: 0, zoom: 1 }; // Rebase on 1↔2 fingers, no jump.
}
