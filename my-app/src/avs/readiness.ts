import type { Trace } from "./diagnostics";
export type Scheduler = {
  set: (callback: () => void, ms: number) => unknown;
  clear: (handle: unknown) => void;
};
const timers: Scheduler = {
  set: (callback, ms) => setTimeout(callback, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};
/** One mounted attempt. All import/model/frame callbacks must belong to this lease. */
export class ViewerLoad {
  private phase: "idle" | "loading" | "ready" | "closed" | "failed" = "idle";
  private timer: unknown;
  private generation = 0;
  constructor(
    private trace: Trace,
    private fail: (error: unknown) => void,
    private scheduler: Scheduler = timers,
  ) {}
  start() {
    this.cancel();
    const token = ++this.generation;
    this.phase = "loading";
    this.trace.mark("attempt/start", { token });
    this.timer = this.scheduler.set(() => {
      if (token === this.generation && this.phase === "loading")
        this.failure(new Error("AVS load timeout"), token);
    }, 30000);
    return token;
  }
  accepts(token = this.generation) {
    return (
      token === this.generation &&
      (this.phase === "loading" || this.phase === "ready")
    );
  }
  private cancel() {
    this.scheduler.clear(this.timer);
    this.timer = undefined;
  }
  rendered() {
    if (this.phase !== "loading") return false;
    this.phase = "ready";
    this.cancel();
    this.trace.mark("viewer/ready-after-frame");
    return true;
  }
  failure(error: unknown, token = this.generation) {
    if (!this.accepts(token)) return;
    this.phase = "failed";
    this.cancel();
    this.trace.error("attempt/failure", error);
    this.fail(error);
  }
  close(token = this.generation) {
    if (token !== this.generation || this.phase === "closed") return;
    this.phase = "closed";
    this.cancel();
    this.trace.mark("attempt/closed");
  }
}
/** Observe an actual successful render return (native Fiber includes endFrameEXP).
 * No ready signal on scheduling, parsing, ground-only frames, or thrown rendering.
 */
export function observeModelFrame<A extends unknown[], R>(
  renderer: { render: (...args: A) => R },
  hasModel: () => boolean,
  ready: () => void,
  trace: Trace,
  beforeRender: () => void = () => {},
) {
  const previous = renderer.render;
  let active = true,
    done = false,
    frames = 0;
  function observed(this: unknown, ...args: A) {
    beforeRender();
    const result = previous.apply(this, args);
    const modelDrawn = hasModel();
    if (active && frames++ < 3) trace.mark("frame/observed", { modelDrawn });
    if (active && !done && modelDrawn) {
      done = true;
      trace.mark("frame/model-render-returned");
      ready();
    }
    return result;
  }
  renderer.render = observed;
  return () => {
    active = false;
    if (renderer.render === observed) renderer.render = previous;
  };
}
