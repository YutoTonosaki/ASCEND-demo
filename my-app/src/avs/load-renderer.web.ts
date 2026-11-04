import type { ComponentType } from "react";
import type { SceneProps } from "./scene-types";
/** Only invoked after the viewer opens. Native Metro defers evaluation, web may split. */
export async function loadRenderer(): Promise<ComponentType<SceneProps>> {
  return (await import("./Scene.web")).default;
}
