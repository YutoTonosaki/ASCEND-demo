import { gestureDelta, type Touch } from "./lifecycle";
import {
  rotateCamera,
  zoomCamera,
  type CameraRig,
  type CameraState,
} from "./camera";
/** Imperative gesture memory, never read by render. No React refs cross responder creation. */
export class CameraGestures {
  private touches: readonly Touch[] = [];
  private rig: CameraRig | null = null;
  constructor(
    private update: (
      fn: (value: CameraState | null) => CameraState | null,
    ) => void,
  ) {}
  setRig(rig: CameraRig | null) {
    this.rig = rig;
    this.reset();
  }
  reset() {
    this.touches = [];
  }
  start(touches: readonly Touch[]) {
    this.touches = touches;
  }
  move(next: readonly Touch[]) {
    const delta = gestureDelta(this.touches, next);
    this.touches = next;
    const rig = this.rig;
    this.update((value) =>
      value && rig
        ? zoomCamera(rig, rotateCamera(value, -delta.rotation), delta.zoom)
        : value,
    );
  }
}
