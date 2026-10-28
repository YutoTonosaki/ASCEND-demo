/** Headless AVS feasibility experiment. Not imported by the application.
 * Units are model-space units and radians; no Player or persistence inputs.
 */
export type CameraState = Readonly<{ yaw: number; distance: number }>;
export type CameraRig = Readonly<{
  initial: CameraState;
  minimumDistance: number;
  maximumDistance: number;
}>;
export type CameraPreset = "front" | "side" | "back";

const turn = Math.PI * 2;
const normalize = (radians: number) => ((radians % turn) + turn) % turn;
const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value));

/** Frame a sphere centered on the orbit target in both portrait and landscape.
 * The renderer must measure the *actual* asset bounds before using this rig.
 * This does not establish that an asset has suitable orientation or proportions.
 */
export function frameCamera(
  radius: number,
  aspect: number,
  verticalFov: number = Math.PI / 4,
): CameraRig {
  if (
    !Number.isFinite(radius) ||
    radius <= 0 ||
    !Number.isFinite(aspect) ||
    aspect <= 0 ||
    !Number.isFinite(verticalFov) ||
    verticalFov <= 0 ||
    verticalFov >= Math.PI
  )
    throw new Error("Invalid AVS camera bounds or viewport.");
  const horizontalHalfFov = Math.atan(Math.tan(verticalFov / 2) * aspect);
  const limitingHalfFov = Math.min(verticalFov / 2, horizontalHalfFov);
  const distance = Math.max(
    radius * 1.15,
    (radius / Math.sin(limitingHalfFov)) * 1.1,
  );
  if (!Number.isFinite(distance) || !Number.isFinite(distance * 2.5))
    throw new Error("AVS camera bounds exceed numeric capacity.");
  return Object.freeze({
    initial: Object.freeze({ yaw: 0, distance }),
    minimumDistance: radius * 1.15,
    maximumDistance: distance * 2.5,
  });
}

export function rotateCamera(state: CameraState, delta: number): CameraState {
  if (!Number.isFinite(delta)) return state;
  return Object.freeze({
    ...state,
    yaw: normalize(state.yaw + normalize(delta)),
  });
}

/** Multiplicative distance: ratios < 1 zoom in, > 1 zoom out.
 * A gesture adapter must rebase when touch count changes; no native adapter yet.
 */
export function zoomCamera(
  rig: CameraRig,
  state: CameraState,
  ratio: number,
): CameraState {
  if (!Number.isFinite(ratio) || ratio <= 0) return state;
  return Object.freeze({
    ...state,
    distance: clamp(
      state.distance * ratio,
      rig.minimumDistance,
      rig.maximumDistance,
    ),
  });
}

export function presetCamera(
  state: CameraState,
  preset: CameraPreset,
): CameraState {
  switch (preset) {
    case "front":
      return Object.freeze({ ...state, yaw: 0 });
    case "side":
      return Object.freeze({ ...state, yaw: Math.PI / 2 });
    case "back":
      return Object.freeze({ ...state, yaw: Math.PI });
    default:
      return state;
  }
}

export function resetCamera(rig: CameraRig): CameraState {
  return rig.initial;
}
