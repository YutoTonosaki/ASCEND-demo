import type { Trace } from "./diagnostics";
import type { CameraState } from "./camera";
export type Bounds = { width: number; height: number; depth: number };
export type SceneProps = {
  cameraState: CameraState | null;
  trace: Trace;
  onFrame: () => void;
  onReady: (bounds: Bounds) => void;
  onError: (error?: unknown) => void;
};
