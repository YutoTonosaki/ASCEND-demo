/** Development diagnostics only. Handled optional-viewer failures do not trigger LogBox. */
export type Trace = {
  mark: (stage: string, detail?: unknown) => void;
  error: (stage: string, error: unknown) => void;
};
const origin = Date.now();
export function mark(stage: string, detail?: unknown) {
  if (__DEV__)
    console.log(`[AVS] +${Date.now() - origin}ms ${stage}`, detail ?? "");
}
export function recordError(stage: string, error: unknown, fatal = false) {
  if (!__DEV__) return;
  const original =
    error instanceof Error ? error.stack || error.message : String(error);
  if (fatal) console.error(`[AVS] UNEXPECTED ${stage}`, error);
  else console.log(`[AVS] RECOVERABLE ${stage}\n${original}`);
}
let sequence = 0;
export function createTrace(now = () => Date.now()): Trace {
  const id = ++sequence,
    start = now();
  let last = "created";
  return {
    mark(stage, detail) {
      last = stage;
      mark(`run=${id} +${now() - start}ms ${stage}`, detail);
    },
    error(stage, error) {
      recordError(
        `run=${id} +${now() - start}ms ${stage}; last=${last}`,
        error,
      );
    },
  };
}
