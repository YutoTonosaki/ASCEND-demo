import {mark,recordError} from "./diagnostics";
import React, { useEffect, useState } from "react";
import { Asset } from "expo-asset";
import { Box3, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ownedLoad } from "./lifecycle";
import { disposeModel } from "./resources";
import modelAsset from "../assets/athlete.glb";

/** Native and Web supply their own Canvas/hook entry points. */
export function createScene(Canvas, useThree) {
  function Contents({ cameraState, onReady, onError }) {
    const { camera, invalidate } = useThree();
    const [model, setModel] = useState(
      /** @type {import('three').Group | null} */ (null),
    );
    const [target, setTarget] = useState(new Vector3(0, 0.9, 0));
    useEffect(
      () =>
        ownedLoad(
          async () => {
            mark("asset/resolve:before");
            const asset = await Asset.fromModule(modelAsset).downloadAsync();
            mark("asset/resolve:ok");
            mark("asset/parse:before");
            const gltf = await new GLTFLoader().loadAsync(
              asset.localUri || asset.uri,
            );
            mark("asset/parse:ok");
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
            onReady({ width: size.x, height: size.y, depth: size.z });
            invalidate();
          },
          error=>{recordError("asset/load",error);onError(error);},
          disposeModel,
        ),
      [onReady, onError, invalidate],
    );
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
    return (
      <>
        <color attach="background" args={["#101820"]} />
        <hemisphereLight args={["#e4efff", "#45403a", 1.5]} />
        <directionalLight position={[2, 4, 5]} intensity={2.4} />
        <directionalLight
          position={[-3, 2, -3]}
          intensity={1.6}
          color="#64c7d1"
        />
        {model && <primitive object={model} dispose={null} />}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.018, 0]}>
          <circleGeometry args={[1.25, 48]} />
          <meshStandardMaterial color="#1d303a" roughness={1} />
        </mesh>
      </>
    );
  }
  return function Scene(props) {
    return (
      <Canvas
        onCreated={()=>mark("canvas/created")}
        frameloop="demand"
        camera={{ fov: 45, near: 0.01, far: 30, position: [0, 0.9, 4] }}
        gl={{ antialias: true, alpha: false }}
      >
        <Contents {...props} />
      </Canvas>
    );
  };
}
