import { mark } from "./diagnostics";
import { Canvas, useThree } from "@react-three/fiber/native";
import { createScene } from "./create-scene";
mark("module/Scene.native:dependencies-initialized");
export default createScene(Canvas, useThree);
