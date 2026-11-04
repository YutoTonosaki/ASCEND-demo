import { mark } from "./diagnostics";
import { Canvas, useThree } from "@react-three/fiber";
import { createScene } from "./create-scene";
mark("module/Scene.web:dependencies-initialized");
export default createScene(Canvas, useThree);
