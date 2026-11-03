import { registerRootComponent } from "expo";
import { mark, stage } from "./src/diagnostics";
// Expo/RN bootstrap runs before this marker. Keep its supported named import.
mark("entry", `Hermes=${"HermesInternal" in globalThis}`);
const App = stage("startup/App", () => require("./App").default);
stage("startup/registerRootComponent", () => registerRootComponent(App));
