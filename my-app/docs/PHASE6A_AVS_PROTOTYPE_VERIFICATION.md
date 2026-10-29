# Phase 6A — Isolated AVS Athlete Prototype

Updated: 2026-10-29 (America/Vancouver). Baseline: `bd3f7c6`, initially clean.
The prior read-only feasibility/headless-camera report is retained in that commit.

## Status and scope

**Isolated prototype implemented; physical iPhone acceptance pending.** A genuine
MakeHuman-derived 3D human GLB has been generated and displayed with WebGL in the
separate `experiments/avs-6a` Expo app. This is not a static image or a primitive
mannequin. Native rendering has **not** been tested. PLAYER integration and Phase
6B remain blocked on the user's successful isolated iPhone test.

The user explicitly approved the MakeHuman CC0 route and a separate Expo GL/Fiber
experiment. Production ASCEND is unchanged: no PLAYER entry, route/provider,
gameplay calculation, SHOP equipment, app configuration, dependency/lockfile or
storage schema change. The only existing file edited is this requested report.
No real saved user data was accessed. The prototype has no AsyncStorage dependency
or import of ASCEND providers, repositories or progression state.

## Environment and compatibility

Read AGENTS.md, its exact SDK 57 reference, actual SDK 58 documentation, prior
Phase 6A/5B reports, current project and working tree before editing. Production
remains Expo 58.0.19 / RN 0.88.0 / React 19.3.0. The **isolated** app uses:

| Dependency | Exact version |
| --- | --- |
| Expo | 58.0.21 |
| React Native | 0.88.1 |
| React / React DOM | 19.3.0 |
| React Three Fiber | 9.8.2 |
| Three.js / types | 0.186.1 / 0.186.0 |
| Expo GL | 58.0.3 |
| Expo Asset / FileSystem | 58.0.19 / 58.0.13 |
| react-native-web | 0.21.4 |
| Safe-area context | 5.10.1 |
| TypeScript | 6.0.3 |

The initial isolated install matched ASCEND's patch versions. Online
`expo install --check` requested newer SDK 58 patches, so only the lab's Expo,
Asset, FileSystem and RN were updated. No unrelated production upgrade occurred.
`package-lock.json` belongs to the isolated app. Fiber's published peers include
React >=19 <19.4 and RN >=0.78; these declared ranges include this stack.

Expo GL is documented for iOS/Android/Web and included in SDK 58 Expo Go. Fiber
provides a native GL/asset adapter and a separate web entry. SDK 58 always uses New
Architecture; Hermes is the default. Successful Hermes bundle compilation proves
syntax/bundling, **not** on-device GL, Hermes execution, driver stability or FPS.
[SDK 58 GLView](https://docs.expo.dev/versions/v58.0.0/sdk/gl-view/),
[Fiber native installation](https://r3f.docs.pmnd.rs/getting-started/installation),
[New Architecture](https://docs.expo.dev/guides/new-architecture/).

Native Filament would add native/worklet integration and require a Development
Build. Babylon RN does not officially test/support Expo. Direct Three + GL would
require more adapter/lifecycle code. Fiber native was chosen for this scoped spike;
its peer ranges and source inspection are compatibility evidence, not a substitute
for testing the exact model on a physical iPhone. Web uses actual WebGL2.

The Mac has Xcode 15.4 and no Blender/adb on PATH. No native build, signing/EAS
change, simulator or physical-device execution was performed. Expo Go avoids the
local Xcode build requirement; use an Expo Go release compatible with SDK 58.
The installed native build helper requires a newer Xcode if a custom build is
later needed. No custom build is currently required by this chosen architecture.

## Asset provenance — every included component

Source repository: [MakeHuman official source and license](https://github.com/makehumancommunity/makehuman/blob/a8bc2d54ff0ac92e78ff71431b1023eda42bf482/LICENSE.md).
Fixed revision: `a8bc2d54ff0ac92e78ff71431b1023eda42bf482`.
Every source URL and SHA-256 is retained in the lab's
`asset-source/provenance.json`; original files and CC0 legal text are included.

| Component | Actual input / rights evidence |
| --- | --- |
| Human anatomy, head, hands, feet | hm08 `base.obj`; explicit September 2020 CC0 header; Data Collection AB, Joel Palmius, Jonas Hauquier |
| Fixed adult/muscle appearance | Three official `.target` files, each explicitly CC0; adult target plus a fixed 65% average / 35% maximum-muscle authoring blend |
| Pose references and weights | `default.mhskel` / `default_weights.mhw`, each explicitly `license: CC0`; used only to bake the arms near the sides |
| Top and shorts | Newly derived separate compression-garment meshes from the same CC0 body surface; original cut/offset definitions, dedicated CC0-1.0 for this prototype |
| Skin / garment materials | Original constant colors and roughness; CC0-1.0 definitions; no external image, logo or photograph |

[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) permits commercial
use, modification and redistribution without mandatory attribution. Provenance is
retained voluntarily. MakeHuman's **program code** has a separate AGPL license;
none is copied/imported/installed here. The converter is newly written Python,
using only standard-library math/JSON/binary output and the licensed asset data.
No community apparel is assumed CC0: **none is included**. No hair, shoe, animation,
private photograph or biometric source is included. See the lab's
`ASSET-LICENSE.md` for component details and complete license locations.

### Generated runtime asset

- File: `experiments/avs-6a/assets/athlete.glb` (glTF 2.0).
- Bytes: **563,184**; triangles: **30,815**; meshes/materials: **3 / 3**.
- Textures, animations and runtime skeleton: **0**. No decoder/remote asset URL.
- SHA-256: `4b655504291c7389994b8d3e420744405a21fbb71fde2e20f318880aee849cfc`.
- Y-up, faces +Z; nominal art height 1.8 model-space meters, feet at ground.
  This is an art scale, never a user measurement or Player Rating input.
- Source rig weights bake a symmetric standing pose with arms near the sides.
- Top/shorts are actual separate fitted meshes. Exact interpolated cuts replace
  the first pass's visibly serrated hems. This is simple prototype apparel.

**A model was actually generated.** Blender was not needed: the stdlib converter
triangulates the licensed body, applies fixed targets and pose, generates fitted
apparel, computes normals, and writes a self-contained GLB. Run
`python3 tools/prepare-asset.py` in the lab to rebuild offline. It checks all source
hashes first. `npm run asset:verify` checks source/runtime hashes and binary bounds.

Khronos `gltf-validator` 2.0.0-dev.3.10, installed only under /tmp for QA, reported
**0 errors, 0 warnings, 0 infos, 0 hints** on the final generated model. This checks
format, not anatomy or native visual fidelity. A browser render was visually
inspected before and after the garment-cut adjustment.

Limitations: bald, barefoot, untextured skin and simple facial detail; fixed baked
pose; no runtime rig, morphs, fabric simulation or exercise clips. Semi-realistic
proportions come from MakeHuman; this is not final sports-game character art.
Future customization/animation requires a separately validated asset contract.

## Viewer architecture and behavior

The lab has its own `package.json`, lockfile, `app.json`, entry and Metro resolver.
Slug `ascend-avs-6a-lab`, scheme `ascend-avs-lab`, native ID `com.ascend.avslab`.
It never mounts within ASCEND. GLB is added to the lab's default Expo asset extension
list without replacing other defaults. No main-app configuration is edited.

- `App.jsx`: safe-area screen, fixed CLOSE, ephemeral EN/JA/open/camera state,
  selected language text/state, scrollable controls, rendering error boundary,
  loading timeout and lab-only non-destructive failure simulation. No persistence.
- `Scene.native.jsx` imports `@react-three/fiber/native`; `Scene.web.jsx` imports the
  web renderer. `create-scene.jsx` loads the locally required GLB through Expo
  Asset/GLTFLoader and owns its model. No global `useLoader` cache is retained.
- `camera.ts`: immutable yaw normalization, bounded zoom, presets/reset. Framing
  measures the actual model box and fits full height/width across orbit azimuths.
  Near/far planes and distance bounds keep the camera outside the model envelope.
- `lifecycle.ts`: one visible/foreground/healthy renderer, cancellable publication
  of asynchronous loads, late-model disposal and touch-count rebasing.
- `resources.js`: releases owned geometries/materials/textures once, deduplicating
  shared references. The Fiber-owned floor/renderer unmount with Canvas.
- `strings.ts`: centralized EN/JA labels, errors/instructions and controls.

Horizontal drag rotates the camera; pinch scales distance within limits. Switching
between one/two fingers rebases rather than jumping. FRONT/SIDE/BACK, rotation,
zoom and RESET buttons provide non-gesture alternatives. The preview owns its touch
surface; controls scroll separately. Web disables browser page-zoom on that surface.
Android hardware back closes an open viewer; native behavior is not yet verified.

Demand rendering draws on camera/load changes, with no idle rotation, animation,
shadows, postprocessing, sound or flashing. Reduce Motion receives the same static
information. The native adapter chooses native PixelRatio; a web DPR cap must not
be assumed to control native resolution. No measured FPS/thermal claim is made.
[Fiber demand rendering](https://r3f.docs.pmnd.rs/advanced/scaling-performance).

CLOSE, background or error unmounts Canvas. Foreground reloads the visible model;
there is no animation to resume. Late successes are disposed and stale failures do
not publish. Failed loading has retry/close and a 30-second deadline. No invisible
viewer context exists at the lab home screen. Tests observe DOM context presence,
not native driver memory reclamation; OS/driver crashes cannot be caught reliably
by a React error boundary.

## Isolation, offline behavior and gameplay integrity

No Growth, OVR, PR, Coin, Match, Season, Career, cosmetic ownership or equipment is
passed into the lab. The original `my-app/experiments/avs/camera.ts` is unchanged;
the lab has an independent camera module. Production schemas and source remain
byte-identical to the baseline. No USER/PLAYER initialization or wallet operation
is introduced. The lab's language selection is in memory only.

Native Expo Asset/FileSystem may use ordinary **asset cache files**. That differs
from gameplay/settings repository writes; no AsyncStorage dependency exists here.
Browser verification instruments Storage writes and preserves a sentinel exactly.

The GLB is local and self-contained, included in iOS/Android/Web export outputs.
There is no runtime model/CDN/decoder download. Expo Go still needs Metro to obtain
its development JavaScript/initial assets; a cold offline native packaged launch
has not been tested. Do not claim that airplane mode can cold-start a Metro session.

## Exact verification results

- Lab Node tests: **21 passed, 0 failed**, exit 0.
- Lab TypeScript (`checkJs` for UI plus typed camera/lifecycle/strings): passed.
- Lab lint: passed. Three-specific intrinsic properties are whitelisted only in
  its renderer file; no production lint rule is modified or globally disabled.
- `npm ls --depth=0`: no invalid dependencies.
- Final online `expo install --check`: **Dependencies are up to date**, exit 0.
- `env -u NO_COLOR EXPO_OFFLINE=1 CI=1 npx expo export --platform all --max-workers 1 --output-dir /tmp/avs-lab-final-export`:
  **passed**, exit 0. Web JS ~1.5 MB; iOS/Android Hermes bundles ~3.3 MB each.
  The exported GLB's SHA-256 matches the final source model exactly. This is
  bundling, not native execution. Expo Go startup on port 8131 also succeeded.
- Khronos validation: final GLB 0 errors/warnings/infos/hints.
- Production ASCEND: `npm test` **541 passed, 0 failed**; typecheck/lint passed.
  Production source/assets/manifest/lock/config comparisons have no changes.
- `tests/browser-viewer.cjs`: **passed**, exit 0, on the final patched export.
  Actual human rendering at 390/320px, different front/side/back pixels, mouse drag,
  multi-step two-finger pinch, page scale remaining 1, zoom buttons and exact-pixel
  reset verified. EN/JA, accurate 1.5× font/line-height approximation, reduced motion,
  reachable reset/close, no horizontal overflow, background/foreground, repeated
  opens and zero Storage writes passed. Real GLB request rejection → retry and
  simulated unavailable WebGL2 → recoverable UI/CLOSE also passed. No browser page
  exceptions occurred. GPU screenshots were visually inspected; native touch is
  not established by synthetic browser events.
- `git diff --check`: passed. Untracked source files additionally checked for
  trailing whitespace; no unintended production changes or generated main assets.

The lab tests cover camera inputs/framing/limits/presets/reset, visibility gating,
load failures/retry, late success/failure, exact-once disposal, touch transitions,
translation parity, actual GLB structure/hash, per-component CC0 declarations and
absence of gameplay/storage imports. No new test framework was introduced.

The previous Phase 6A baseline ran all 25 existing ASCEND browser scripts. Those
are historical results, not repeated claims for this follow-up. This follow-up
reruns all production unit tests and directly verifies the separate viewer; there
is no new production UI integration to test. No existing assertion is weakened.

The first direct PNG buffer assertion produced expensive Node diagnostics when
the initial single-move synthetic pinch was ineffective. Comparisons now use
Buffer.equals with the same exact-pixel requirements. The gesture test represents
finger addition and continuous movement rather than a single jump. Web touch-action
also prevents the browser's default page pinch. The final test requires actual
camera change **and** unchanged page scale; it does not accept browser zoom as AVS
zoom. Initial garment cuts were visually rough; exact interpolated cuts fixed the
hems and the resulting model was revalidated. No production code was changed.

Remaining tool notices: the pinned ESLint 9 package emitted its upstream support
deprecation notice during install; no unrelated linter upgrade was made. One startup
emitted NO_COLOR/FORCE_COLOR notices. The first offline dependency check warned that
offline validation is unreliable, so final validation was repeated online. Final
typecheck/lint/export have no new application errors/warnings.

### Browser screenshots (not native proof)

![Generated athlete, front](../../experiments/avs-6a/docs/images/athlete-front.png)

[Side view](../../experiments/avs-6a/docs/images/athlete-side.png),
[Japanese 320px viewer](../../experiments/avs-6a/docs/images/viewer-ja-320.png),
[Japanese 1.5× text](../../experiments/avs-6a/docs/images/viewer-ja-large.png).
The captured [Khronos report](../../experiments/avs-6a/docs/gltf-validation.json)
belongs to the final model, not the first garment draft.

## Files

Created only under `experiments/avs-6a/`:

- Package/lockfile, app/Metro/TypeScript/ESLint configs, `.gitignore`, `index.js`.
- `App.jsx`; `src/camera.ts`, `lifecycle.ts`, `strings.ts`, `resources.js`,
  `create-scene.jsx`, platform Scene entries and GLB type declaration.
- `assets/athlete.glb`, `manifest.json`; eight original source/license files and
  `asset-source/provenance.json`.
- `tools/prepare-asset.py`, `verify-asset.cjs`.
- Existing-convention Node tests, test registration and `tests/browser-viewer.cjs`.
- `README.md`, `ASSET-LICENSE.md` and selected verified screenshots.

Updated: `my-app/docs/PHASE6A_AVS_PROTOTYPE_VERIFICATION.md` (this report).
No other tracked production file is changed.

## Exact iPhone Expo Go procedure — user acceptance pending

1. Preserve your normal ASCEND installation/data. Install/use Expo Go compatible
   with **SDK 58**. Connect iPhone/Mac to the same Wi-Fi.
2. Run in a separate Terminal:

   ```sh
   cd /Users/tonosaki/Desktop/PF/ASCEND/experiments/avs-6a
   npm ci --ignore-scripts
   npm start -- --port 8131
   ```

3. Scan **this lab's QR code** with iPhone Camera. Expect **ASCEND AVS Lab** and
   OPEN ATHLETE VIEWER, not the normal five-tab ASCEND app. No PLAYER entry exists.
4. Open the viewer. Check a full head-to-feet 3D human, teal top/dark shorts, intact
   hands/feet and reasonable stance/materials. Rotate, pinch, FRONT/SIDE/BACK,
   zoom buttons and RESET. Report clipping, distortion or touch issues.
5. Switch English/日本語. Check selected state, loading/error text, controls,
   safe areas, small screen, large Dynamic Type, VoiceOver and Reduce Motion.
6. CLOSE/reopen several times; background/foreground both while loading and after
   display. Verify recovery and no freeze, crash or abnormal heating.
7. Use the lab-only SIMULATE LOAD ERROR, RETRY, then CLOSE. This changes no saved
   files. Do not corrupt/reset real phone storage.
8. Exit the lab and open ordinary ASCEND separately. Verify existing PLAYER/card,
   SHOP ownership/equipment/balance, TRAIN, HOME and CAREER are unchanged.
9. Record iPhone/iOS/Expo Go versions and actual results. This acceptance is the
   gate for PLAYER integration; no integration or Phase 6B begins automatically.

On physical Android use the same isolated project and compatible Expo Go. Verify
hardware back, model/controls, large text, background/foreground and memory/thermal
behavior independently. No Android native success is claimed.

No custom Development Build was produced. If Expo Go fails, first report the exact
error; do not upgrade production dependencies. A later lab-only build would need
compatible Xcode/macOS/CocoaPods/provisioning or Android SDK/JDK tooling, with
`expo-dev-client` and `npx expo run:ios --device` / `run:android --device` followed
by `npx expo start --dev-client --lan`. No signing or EAS setup was altered here.

## Remaining gate

**Implemented and browser-tested:** generated/licensed local model and isolated
viewer foundation. **Not natively verified:** GL loading/materials, Hermes/driver
execution, physical gestures, native context cleanup, VoiceOver/Dynamic Type,
performance/thermal behavior and cold offline packaging.

Do not integrate into PLAYER or begin Phase 6B until the isolated iPhone test
succeeds. No body-growth morphing, SHOP 3D cosmetics or Career cinematic work is
included. The model/renderer can be replaced without changing physical progression.
