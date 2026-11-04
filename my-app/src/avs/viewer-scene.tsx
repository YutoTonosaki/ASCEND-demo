import React, { useCallback, useEffect, useState } from "react";
import { loadRenderer } from "./load-renderer";
import { createTrace } from "./diagnostics";
import { ViewerLoad } from "./readiness";
import type { SceneProps, Bounds } from "./scene-types";
import type { CameraState } from "./camera";
/** Each foreground mount/retry has its own deadline and callback lease. */
export function ViewerScene({
  cameraState,
  onModel,
  onFrame,
  onError,
}: {
  cameraState: CameraState | null;
  onModel: (value: Bounds) => void;
  onFrame: () => void;
  onError: (error?: unknown) => void;
}) {
  const [Renderer, setRenderer] =
    useState<React.ComponentType<SceneProps> | null>(null);
  const [trace] = useState(() => createTrace());
  const [load] = useState(() => new ViewerLoad(trace, onError));
  useEffect(() => {
    const token = load.start();
    trace.mark("import/Scene:request");
    void loadRenderer()
      .then((component) => {
        if (!load.accepts(token)) {
          trace.mark("import/Scene:late-ignored");
          return;
        }
        if (!component) throw new Error("Missing Scene export");
        trace.mark("import/Scene:resolved");
        setRenderer(() => component);
      })
      .catch((error) => load.failure(error, token));
    return () => load.close(token);
  }, [load, trace]);
  const model = useCallback(
    (bounds: Bounds) => {
      if (load.accepts()) {
        trace.mark("model/publish");
        onModel(bounds);
      }
    },
    [load, trace, onModel],
  );
  const frame = useCallback(() => {
    if (load.rendered()) onFrame();
  }, [load, onFrame]);
  const fail = useCallback((error?: unknown) => load.failure(error), [load]);
  return Renderer ? (
    <Renderer
      cameraState={cameraState}
      onReady={model}
      onFrame={frame}
      onError={fail}
      trace={trace}
    />
  ) : null;
}
