import { observeModelFrame } from "./readiness";
import { View } from "react-native";
import React, { useEffect, useState } from "react";
import type {
  Canvas as WebCanvas,
  useThree as useWebThree,
} from "@react-three/fiber";
import type { SceneProps } from "./scene-types";
import { Asset } from "expo-asset";
import { Box3, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ownedLoad } from "./lifecycle";
import { disposeModel } from "./resources";
import modelAsset from "../../assets/avs/athlete.glb";

/** Native and Web supply their own Canvas/hook entry points. */
export function createScene(
  Canvas: React.ComponentType<
    Pick<
      React.ComponentProps<typeof WebCanvas>,
      "children" | "onCreated" | "frameloop" | "camera" | "gl"
    >
  >,
  useThree: typeof useWebThree,
) {
  function Contents({
    cameraState,
    onReady,
    onFrame,
    onError,
    trace,
  }: SceneProps) {
    const { camera, invalidate, gl, scene } = useThree();
    const [model, setModel] = useState<import("three").Group | null>(null);
    const [target, setTarget] = useState(new Vector3(0, 0.9, 0));
    useEffect(() => {
      trace.mark("contents/effect-start");
      const close = ownedLoad(
        async () => {
          trace.mark("asset/resolve:before");
          const asset = await Asset.fromModule(modelAsset).downloadAsync();
          trace.mark("asset/resolve:ok", {
            uri: asset.uri,
            localUri: asset.localUri,
          });
          trace.mark("asset/parse:before");
          const gltf = await new GLTFLoader().loadAsync(
            asset.localUri || asset.uri,
          );
          trace.mark("asset/parse:ok");
          return gltf.scene;
        },
        (root) => {
          const bounds = new Box3().setFromObject(root);
          const center = bounds.getCenter(new Vector3()),
            size = bounds.getSize(new Vector3());
          if (!Number.isFinite(size.length()) || size.y <= 0)
            throw new Error("Invalid model bounds");
          setTarget(center);
          setModel(root);
          trace.mark("model/bounds", {
            width: size.x,
            height: size.y,
            depth: size.z,
          });
          onReady({ width: size.x, height: size.y, depth: size.z });
          invalidate();
        },
        (error) => {
          trace.error("asset/load", error);
          onError(error);
        },
        (root) => {
          trace.mark("model/dispose");
          disposeModel(root);
        },
      );
      return () => {
        trace.mark("contents/effect-cleanup");
        close();
      };
    }, [onReady, onError, invalidate, trace]);
    useEffect(() => {
      if (!cameraState) return;
      const { yaw, distance } = cameraState;
      camera.position.set(
        target.x + Math.sin(yaw) * distance,
        target.y,
        target.z + Math.cos(yaw) * distance,
      );
      camera.lookAt(target);
      camera.updateProjectionMatrix();
      invalidate();
    }, [camera, cameraState, invalidate, target]);
    useEffect(() => {
      if (!model || !cameraState) return;
      trace.mark("model/committed-camera-applied");
      let bodyMesh: import("three").Mesh | undefined;
      model.traverse((node) => {
        if (!bodyMesh && (node as import("three").Mesh).isMesh)
          bodyMesh = node as import("three").Mesh;
      });
      if (!bodyMesh) {
        onError(new Error("Model has no renderable mesh"));
        return;
      }
      const mesh = bodyMesh,
        originalAfter = mesh.onAfterRender;
      let drawn = false;
      const after: typeof originalAfter = function (
        this: import("three").Mesh,
        ...args
      ) {
        originalAfter.apply(this, args);
        drawn = true;
      };
      mesh.onAfterRender = after;
      const stop = observeModelFrame(
        gl,
        () => drawn && !!scene.getObjectById(model.id),
        onFrame,
        trace,
        () => {
          drawn = false;
        },
      );
      invalidate();
      return () => {
        stop();
        if (mesh.onAfterRender === after) mesh.onAfterRender = originalAfter;
      };
    }, [model, cameraState, gl, scene, onFrame, onError, trace, invalidate]);
    return (
      <>
        {React.createElement("color", {
          attach: "background",
          args: ["#101820"],
        })}
        {React.createElement("hemisphereLight", {
          args: ["#e4efff", "#45403a", 1.5],
        })}
        {React.createElement("directionalLight", {
          position: [2, 4, 5],
          intensity: 2.4,
        })}
        {React.createElement("directionalLight", {
          position: [-3, 2, -3],
          intensity: 1.6,
          color: "#64c7d1",
        })}
        {model &&
          React.createElement("primitive", { object: model, dispose: null })}
        {React.createElement(
          "mesh",
          { rotation: [-Math.PI / 2, 0, 0], position: [0, -0.018, 0] },
          React.createElement("circleGeometry", { args: [1.25, 48] }),
          React.createElement("meshStandardMaterial", {
            color: "#1d303a",
            roughness: 1,
          }),
        )}
      </>
    );
  }
  return function Scene(props: SceneProps) {
    useEffect(() => {
      props.trace.mark("scene/mounted");
      return () => props.trace.mark("scene/unmounted");
    }, [props.trace]);
    return (
      <View
        collapsable={false}
        style={{ flex: 1 }}
        onLayout={(e) =>
          props.trace.mark("canvas/host-layout", e.nativeEvent.layout)
        }
      >
        <Canvas
          onCreated={(state) => {
            const context = state.gl.getContext();
            props.trace.mark("canvas/onCreated", {
              size: state.size,
              bufferWidth: context.drawingBufferWidth,
              bufferHeight: context.drawingBufferHeight,
              nativeEndFrame: typeof (
                context as typeof context & { endFrameEXP?: unknown }
              ).endFrameEXP,
            });
          }}
          frameloop="demand"
          camera={{ fov: 45, near: 0.01, far: 30, position: [0, 0.9, 4] }}
          gl={{ antialias: true, alpha: false }}
        >
          <Contents {...props} />
        </Canvas>
      </View>
    );
  };
}
