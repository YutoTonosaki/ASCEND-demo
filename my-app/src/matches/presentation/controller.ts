export type Stage = "vs" | "simulation" | "reveal" | "report";
export const STAGE_MS = { vs: 2000, simulation: 8000, reveal: 2000 } as const;
export interface Scheduler {
  schedule: (callback: () => void, delay: number) => unknown;
  cancel: (handle: unknown) => void;
}
const timers: Scheduler = {
  schedule: (fn, delay) => setTimeout(fn, delay),
  cancel: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};
/** Only playback state. No persistence, resolution or reward API. */
export class CinematicController {
  private generation = 0;
  private reported = false;
  private timer: unknown;
  private publish: ((stage: Stage) => void) | null = null;
  constructor(private scheduler: Scheduler = timers) {}
  start(publish: (stage: Stage) => void, reduceMotion: boolean) {
    this.dispose();
    this.publish = publish;
    this.reported = false;
    this.enter(reduceMotion ? "report" : "vs", this.generation);
  }
  private enter(stage: Stage, generation: number) {
    if (generation !== this.generation || !this.publish) return;
    this.reported = stage === "report";
    this.publish(stage);
    if (stage !== "report") {
      const next: Stage =
        stage === "vs"
          ? "simulation"
          : stage === "simulation"
            ? "reveal"
            : "report";
      this.timer = this.scheduler.schedule(
        () => this.enter(next, generation),
        STAGE_MS[stage],
      );
    }
  }
  skip() {
    if (!this.publish || this.reported) return;
    this.scheduler.cancel(this.timer);
    ++this.generation;
    this.reported = true;
    this.publish("report");
  }
  background() {
    this.skip();
  }
  dispose() {
    ++this.generation;
    this.scheduler.cancel(this.timer);
    this.publish = null;
  }
}
