# Phase 6A — AVS Prototype: Feasibility and Gated Foundation

Date: 2026-10-28. Baseline: `5ddfa4f`, initially clean working tree.

## Decision and completion status

**PARTIALLY COMPLETE — CONDITIONAL GO for an isolated native experiment; no GO
for PLAYER integration yet. This is not a working 3D athlete viewer.**

The repository and renderer/asset research are complete. A small, headless camera
experiment is implemented and tested. No renderer, athlete model, viewer UI or
PLAYER entry is installed. No dependency, application configuration, route, storage
key or gameplay file is changed. No 2D image or geometric mannequin substitutes for
an athlete. Phase 6B has not started.

The user's follow-up confirms that no athlete asset is available and authorizes
research of free reusable models. It explicitly requires reporting blockers and
approval before proceeding when rights or native compatibility cannot be verified.
Publisher licenses can be established for the three candidates below; an accepted,
prepared GLB and actual SDK 58 native rendering have **not** been established.
Those are separate remaining gates, not evidence that all free human assets are
unusable or that Expo GL cannot work.

## Repository audit

Read `AGENTS.md` and its required SDK 57 reference, then the actual SDK 58 reference.
Installed versions, rather than earlier reports, supply this baseline:

| Component | Observed value |
| --- | --- |
| Expo | 58.0.19 installed; package range ^58.0.19 |
| React Native | 0.88.0 |
| React / React DOM | 19.3.0 |
| react-native-web / SVG | 0.21.4 installed / 15.16.0 |
| Node / TypeScript | 22.15.0 / 6.0.3 |
| Hermes | `.hermesv1version`: hermes-v260318099.0.2; compiler dependency 260318099.0.4 |
| Architecture | SDK 58 uses New Architecture; no app opt-out |
| Local Xcode | 15.4; installed RN CocoaPods helper requires at least 16.1 |
| Assets / native projects | No existing GLB/glTF/FBX/OBJ athlete; no ios/ or android/ project |

Hermes is the default, with no `jsEngine` override. These are file/configuration
observations, **not** a live `HermesInternal` check. No Blender or adb executable
was found on PATH, and no Blender installation was found in /Applications. The
local iOS build toolchain is insufficient even for the installed helper's minimum;
newer official toolchain recommendations must also be checked before a build.
[New Architecture policy](https://docs.expo.dev/guides/new-architecture/),
[Hermes guidance](https://docs.expo.dev/guides/using-hermes/).

Relevant existing boundaries, all preserved:

- `src/app/_layout.tsx`: Localization → Training → Session → Coach → Growth →
  Career → Seasons → Rewards → Shop → Match → GrowthPresentation.
- `src/app/(tabs)/player.tsx`: GrowthStatus, development-only Growth Debug, primary
  PlayerCard, derived tier/finish, PR and body ratings. No viewer is mounted.
- `src/growth/domain.ts`: authoritative `overall` and `displayRating`.
  `src/growth/provider.tsx` exposes saved ratings; AVS must not reconcile them.
- `src/components/player/player-card.tsx`: existing card, `useCosmetics`,
  `cosmeticAppearance`, and `CosmeticArt`. SHOP equipment is 2D card treatment,
  not clothing or an AVS asset contract.
- `src/shop/catalog.ts`, `provider.tsx`, `domain.ts` and Shop/wallet repositories:
  earned/owned/equipped state stays independent of AVS experiments.
- `src/components/ui/safe-area-modal.tsx` and existing Sheet patterns can supply a
  future controlled viewer surface. No sixth tab is needed.
- `tests/register.cjs`: existing TypeScript transpilation and Node test runner;
  optional external Playwright scripts provide browser QA.

The Phase 5B report was read. App orientation remains portrait, web export static,
React Compiler enabled. No Metro override or native 3D package exists currently.

## Renderer comparison and compatibility evidence

The following are researched candidates, **not installed dependencies**.

| Approach | Architecture / dependencies | Expo Go and platforms | Assessment |
| --- | --- | --- | --- |
| Three.js + Expo GL directly | Imperative Three scene/camera/loader around native GLView; expo-gl plus asset/file adapters | Expo GL is documented for iOS, Android, Web and included in Expo Go | Viable lower-level spike; owns frame scheduling, canvas/texture shims, gesture handling and cleanup |
| React Three Fiber native + Three + Expo GL | React scene graph, native loader/event adaptations; expo-gl, expo-asset, expo-file-system | Same Expo GL native module; web uses Fiber's web entry | Preferred **conditional** experiment; less custom bridge code, but exact asset loading and lifecycle must run on devices |
| react-native-filament | Native Filament PBR renderer; worklets-core/native code | Custom Development Build; no Expo Go; separate web fallback | Potential longer-term native rendering choice, higher integration/toolchain cost; wildcard RN peers do not prove 0.88 support |
| Babylon React Native | Native rendering/JSI; Babylon core, permissions/native modules | Custom native build; separate Babylon web backend | Not preferred here: publisher explicitly does not support/test Expo integration |

[Expo GL SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/gl-view/),
[Fiber native installation](https://r3f.docs.pmnd.rs/getting-started/installation),
[Filament source](https://github.com/margelo/react-native-filament),
[Babylon supported baselines/Expo policy](https://github.com/BabylonJS/BabylonReactNative).

Read-only `npm view` metadata observed:

- `@react-three/fiber` **9.8.2** peers: React/React DOM >=19 <19.4, RN >=0.78,
  Expo >=43, Three >=0.156; Expo GL/asset/file-system peers are declared.
- Three **0.186.1** was the registry version observed.
- Installed Expo's `bundledNativeModules.json` recommends expo-gl **~58.0.3**,
  expo-asset **~58.0.18**, expo-file-system **~58.0.11**.
- Filament **1.11.0** declares React/RN wildcard peers and worklets-core >=1.3.2;
  its repository development manifest uses RN 0.83.1, not explicit 0.88 evidence.
- Babylon RN **2.0.8** documents a 0.81.6 Playground baseline; broad peers are not
  a newer-RN guarantee.

Fiber's declared range includes this checkout's React 19.3/RN 0.88. That is useful
compatibility evidence, not a native render test. SDK 58 Expo Go can supply GL;
a custom build is not inherently required for this first approach. Simulators are
not a substitute for iPhone testing; Fiber's native guide warns about simulator GL
stability. The current Xcode limitation does not prevent a compatible physical
Expo Go experiment, but does block a local custom-build validation here.

Also downloaded the published Fiber 9.8.2 npm tarball into /tmp with scripts
disabled and read its native adapter, without installing it. It explicitly imports
Expo GL/Asset, prefers `expo-file-system/legacy`, and presents frames through
`endFrameEXP`. Its native Canvas sets native PixelRatio itself: do not assume a web
DPR cap works there. Native asset/polyfill code patches loader/Blob behavior and
can use filesystem cache writes, so a later integration must audit these global
effects and distinguish asset cache I/O from forbidden gameplay-storage writes.
This inspection supports trying the adapter; it does not execute it on RN 0.88.

Use glTF 2.0/GLB as the eventual runtime format: one local self-contained file,
ordinary PBR materials, skinning and optional morph targets. FBX/Blender files are
authoring sources, not assumed runtime loaders. Start without Draco/KTX2/Meshopt,
remote decoder URLs or complex shaders. Add a GLB extension by merging Expo's
default Metro resolver configuration, not replacing its extension lists.
[GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html).

## Three shortlisted asset routes

These are **source candidates**, not three ready-to-ship GLBs. No candidate binary
has been bundled, converted or benchmarked. Only two Microsoft publisher preview
PNGs and repository file metadata were downloaded to /tmp for investigation.

### 1. MakeHuman core human + verified CC0 apparel — preferred authoring route

- Source: [MakeHuman license](https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.md),
  [official system asset inventory](https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html).
- Exact asset license: **CC0 1.0 Universal** for core mesh, modifiers, textures,
  clothes and poses. Commercial use, modification and redistribution are allowed;
  attribution is not required. Keep provenance anyway. Program code is AGPL and
  must not be copied into ASCEND as if it had the asset license.
- Full-body proportions can be authored without identifying a real person. This
  is the strongest foundation for future body customization; it does not mean
  runtime morphs or clothing fitting already exist.
- Limitations: an athletic, clothed, relaxed standing character still must be
  authored/exported, then inspected. Official files are not an accepted mobile GLB.
  Community clothes have individual licenses; select only explicitly verified
  pieces, such as `elvs_crude_t-shirt_male` in the
  [CC0 shirt inventory](https://download.makehumancommunity.org/assets/assetpacks/shirts01.html).
  Shorts, skin, hair and shoes must each be recorded before export.

### 2. Blender Studio Human Base Meshes v1.4.1 — realistic body foundation

- Source: [Blender's official Demo Files / Asset Bundles](https://www.blender.org/download/demo-files/),
  [official download directory](https://download.blender.org/demo/asset-bundles/human-base-meshes/).
- Candidate: the bundle's realistic full-body human, rather than its stylized or
  isolated head/hand assets. The official listing identifies v1.4.1, 49 MB and
  **CC0**; CC0 1.0 permits commercial modification/redistribution without attribution.
- Limitations: this is an authoring base, not a dressed athlete or accepted rigged
  GLB. Needs apparel, pose/rig preparation, texture/material work and export. The
  listed 49 MB is a whole authoring bundle, not a measured final mobile payload.
  Requires Blender 4.2 LTS or newer according to the listing. Do not confuse it
  with other Blender Studio CC-BY rigs on the same site.

### 3. Microsoft Rocketbox Sports_Male_01 — closest existing sports character

- Source: [specific model directory](https://github.com/microsoft/Microsoft-Rocketbox/tree/master/Assets/Avatars/Professions/Sports_Male_01),
  [publisher README](https://github.com/microsoft/Microsoft-Rocketbox),
  [exact MIT license](https://github.com/microsoft/Microsoft-Rocketbox/blob/master/LICENSE.md).
- License: **MIT, Copyright (c) 2020 Microsoft**. Commercial use, modifications and
  redistribution are permitted with the copyright and permission notice included
  in copies/substantial portions. A shipped derivative must retain that notice.
- Inspected official preview: full-body human in dark sports/swim shorts, athletic
  proportions, arms held out in an A-like pose. This is visually closer than a
  robot/soldier, but is not yet the required relaxed neutral stance.
- Metadata at tree `0943055db6ec570bcef9f2c8b41c9e5467c808f9` lists a 509,504-byte
  ordinary FBX, a separate larger facial FBX and six 12,582,956-byte TGA maps.
  These are source sizes, not final GLB/GPU-memory measurements.
- Needs FBX→GLB conversion, neutral posing, PBR/material conversion and texture
  reduction. Do not ship every embedded LOD/facial asset. Future arbitrary body
  morphs are not established. Inspect all garment markings (other sports variants
  have prominent kit marks), removing/re-authoring them as necessary; do not assume
  a copyright license clears third-party marks or likeness rights.

[CC0 terms](https://creativecommons.org/publicdomain/zero/1.0/) do not certify
third-party identity/trademark rights. Publisher provenance plus per-file checks
remain necessary. No copyrighted game character was selected.

Additional leads were rejected for this delivery: Three sample Soldier/Xbot do not
meet the athlete direction; an Innerscene “sports” listing has unsuitable clothing
and a heavy mesh; GameMog's athlete bundle mixes differently licensed motion data
and cannot be treated wholesale as CC0. CharacterCreator's generated GLBs have an
explicit CC0 carve-out but its runtime code is GPL, and it still needs independent
asset/pose/mobile inspection; no runtime code or model was copied from it.
[CharacterCreator license notes](https://github.com/kblood/CharacterCreator/blob/master/LICENSE-NOTES.md),
[GameMog publisher library](https://gamemog.com/library).

## Implemented isolated experiment

`experiments/avs/camera.ts` has no imports, React, renderer, storage or gameplay
dependency. It is outside `src/app` and is not reachable from the production app.
It provides immutable camera state, full-sphere framing using the narrower of
horizontal/vertical fields of view, normalized yaw, clamped distance ratios,
front/side/back presets and reset. Invalid viewport/bounds fail explicitly;
invalid gesture values retain the previous valid state.

The adapter must eventually measure the actual asset bounds and orient it before
framing. Zoom stays outside that sphere, but actual near/far clipping planes,
touch rebasing, pinch/drag arbitration and native hit targets still require a
renderer/UI implementation. Mathematical tests do not verify gestures or anatomy.

No open/close UI, context lifetime, loading/error component, EN/JA viewer controls,
appearance controls, offline GLB loading or PLAYER entry is implemented. Existing
PLAYER/card/debug remain intact. There is no screenshot of a working AVS viewer.

## Proposed architecture and lifecycle acceptance criteria

These are the next isolated experiment's design, not implemented capabilities:

1. **Asset manifest:** local require/module, source revision, SHA-256, license and
   notices, scale, forward/up axes, bounds and supported material slots. No OVR.
2. **Renderer adapter:** native Fiber Canvas and separate web entry; receives the
   asset and camera only. Loading, unsupported and retryable failure states must
   work before adding a PLAYER entry. No gameplay providers/repositories.
3. **Camera adapter:** existing headless module; horizontal responder inside the
   viewer, pinch distance rebased when touch count changes, accessible preset and
   zoom buttons. No gesture capture on the PLAYER scrolling surface.
4. **Viewer shell:** reuse safe-area full-screen modal, fixed reachable CLOSE,
   wrapping EN/JA instructions/controls and RESET VIEW. Appearance remains local
   in-memory state; only genuine garment material slots receive a color control.
5. **Visibility ownership:** exactly one context while open and foreground; no
   eagerly mounted renderer. Cancel obsolete loads with a generation token and
   dispose late resources. Unmount on close/background; foreground mounts a fresh
   visible scene only. Test repeated opens and interrupted loads.
6. **Resource ownership:** dispose geometries, materials, textures and explicitly
   owned caches; do not assume a removed scene or React error boundary frees GPU
   resources or catches a native crash. Avoid double-disposing shared cached data.

Static inspection should use demand rendering, invalidating on camera/appearance
changes. No idle spin, continuous animation or expensive postprocessing is needed.
[Fiber on-demand rendering](https://r3f.docs.pmnd.rs/advanced/scaling-performance).

Initial proposed asset budgets: a single prepared GLB ≤10 MB, roughly ≤50k triangles,
few material/draw batches, 1k textures where possible and no texture above 2k
without a measured reason. These are starting budgets, **not** measured performance.
A decoded 2048² RGBA texture alone occupies 16 MiB before mipmaps; compressed file
size is not GPU memory. Measure first frame/load time, JS responsiveness, peak
memory, repeated-open growth, frame timing during gestures and thermal behavior on
the agreed older iPhone. OpenGL ES longevity, GL method coverage, textures and
native context loss remain risks. Browser software graphics cannot certify them.

Later skeletal animation/muscle masks/appearance must be separate asset contracts.
Reusable animation needs a deliberate skeleton/retarget convention. Anatomical
overlays need authored meshes; neither morph capability nor anatomical accuracy
can be inferred from a generic skinned human. No such later work starts here.

## Verification

- `npm test`: **541 passed, 0 failed** (532 existing + 9 camera experiments).
- `node --require ./tests/register.cjs --test tests/avs-camera.test.cjs`:
  **9 passed, 0 failed** after formatting.
- `npm run typecheck`: passed. `npm run lint`: passed, no warnings/errors.
- `env -u NO_COLOR EXPO_OFFLINE=1 CI=1 npx expo export --platform all --max-workers 1 --output-dir /tmp/ascend-avs-baseline-export`:
  passed; iOS/Android Hermes bundles and 13 static web routes. This export contains
  **no AVS renderer or model** and does not validate 3D bundling/native graphics.
- All **24 production browser scripts passed**, exit 0: audit, cards, Career,
  Coach, Growth, input, localization polish, localization, Match cinematic (all 14
  scenarios), Match history/integration/resolution/rewards, overlays, presentation,
  records, workout rewards, Seasons, sessions, Shop purchase fix, Shop UX comparison,
  Shop UX, Shop and Shop expansion. No assertions or existing test files changed.
- Development `browser-growth-debug` passed, exit 0: exact decimal data,
  open/refresh zero writes, missing/corrupt/retry states, 320/390px and production
  entry absence. Total: **25 browser scripts**; this is existing-app regression,
  not AVS graphics verification.
- Browser checks used isolated storage and `/tmp/ascend-shop-ux-qa` external
  Playwright/browser binaries. Scripts were copied unchanged to
  `/tmp/ascend-avs-browser/tests` with source symlinks so scripts that write docs
  screenshots write to /tmp instead of replacing tracked Phase 5B images.
  `NODE_PATH` and `PLAYWRIGHT_BROWSERS_PATH` point to that QA installation;
  `ASCEND_QA_URL` used port 8126's production export, or Metro port 8127 for Debug
  with `ASCEND_QA_PROD_URL` set to 8126. Both are local test servers.
- Browser scripts retain mobile widths, enlarged-text and reduced-motion checks;
  visually inspected the existing Japanese SHOP screenshot at 320px. There is no
  AVS screenshot or native Dynamic Type/gesture measurement. Successful scripts
  reported no browser page exceptions.
- `git diff --check`: passed. New files also checked for whitespace; tracked source,
  asset, package/lockfile and app/TypeScript configuration comparisons against HEAD
  have no difference. No test-generated image overwrote a tracked artifact.

Development Metro retained the existing SVG `accessible={false}` non-boolean DOM
attribute warning and printed empty async `fetchThenEvalJs` stack entries. A
separate console capture identified the SVG warning with no page exception; the
unchanged Debug assertions passed. No unrelated rendering code was changed to
suppress it. Final typecheck/lint/export reported no new warnings.

The nine new tests cover immutable initial state, portrait/landscape sphere framing,
invalid bounds/FOV/aspect, repeated rotation, invalid control input, zoom extremes,
reciprocal zoom, presets and reset. No tests claim actual GPU, rendering recovery,
open/close gestures or native context disposal. No AVS UI integration tests exist
because the integration gate was deliberately not crossed.

## Native execution plan — not performed

**This checkout has no 3D Athlete Preview button.** Do not follow a supposed viewer
test by opening PLAYER now. Existing-app smoke checks can use `cd my-app` then
`npx expo start --go --lan`, preserving real data; that verifies only existing UI.

After approval, prepare a separate Expo SDK 58 experiment with the candidate
dependencies above and the accepted licensed GLB. Install Expo modules with
`npx expo install expo-gl expo-asset expo-file-system`; pin the verified Fiber/Three
versions and save a lockfile in that isolated project. Do not silently run these
installation commands in ASCEND. Merge its own Metro asset configuration and
verify airplane-mode bundling before production integration.

For a compatible physical SDK 58 Expo Go: run `npx expo start --go --lan` **inside
that future isolated project**, same Wi-Fi. Verify on-device Hermes, not old remote
Chrome JS execution (Expo GL requires synchronous native calls). A native debugger
attached to on-device Hermes is different from running JS remotely.

If Expo Go proves insufficient, the future isolated project can use
`npx expo install expo-dev-client`, then `npx expo run:ios --device` or
`npx expo run:android --device`, and `npx expo start --dev-client --lan`.
Prerequisites: compatible Xcode/macOS, CocoaPods and provisioned iPhone for local
iOS; Android SDK/JDK/device tooling for Android. Recheck actual generated native
requirements. These commands generate/build native projects and are **not executed**
here. No signing credentials, EAS configuration or production build setting changed.

### iPhone acceptance checklist, after the gates are met

1. Test the isolated project first: actual full-body model, correct materials,
   neutral stance, lighting and offline load; record iPhone/iOS/Expo Go versions.
2. Rotate in both directions, pinch within limits, use presets/zoom buttons and
   RESET; verify small-screen full-body framing and no clipping.
3. Repeat open/close, leave during loading, background/foreground and retry after
   a controlled renderer failure. Observe memory/context count, heat and gestures.
4. Check EN/JA, Dynamic Type, VoiceOver controls, Reduce Motion and safe areas.
5. Only after these pass, add the approved PLAYER entry. Confirm existing card,
   ratings, tier, Growth Debug and scroll position remain usable.
6. Return to SHOP/TRAIN/HOME/CAREER; compare real values and persisted bytes.
   Never fabricate real training or reset data for this test.

### Android acceptance checklist

Use compatible Expo Go with `npx expo start --go --lan` in the future isolated
project, or the development-build path above if needed. Test on a physical Android
device: same model/materials, gestures/accessibility alternatives, back action,
foreground/background/context recreation, offline assets and repeated openings.
Record OS/GPU/runtime and memory/frame measurements independently of iPhone/Web.

No physical iPhone, Android, simulator, Hermes execution or GPU benchmark was
performed in this phase. A JS exception fallback cannot guarantee recovery from
native driver/process failure.

## Files and next decision

Added only:

- `experiments/avs/camera.ts`.
- `tests/avs-camera.test.cjs`.
- `docs/PHASE6A_AVS_PROTOTYPE_VERIFICATION.md` (this report).

All tracked production code, assets, package manifests/lockfile and configuration
remain byte-identical to baseline; no saved user data was accessed. Existing
schemas, wallet, PR/Growth/OVR, Match, Season, Career, card and Shop rules are intact.

Recommended next approval: **prepare one MakeHuman CC0 athlete with individually
verified neutral apparel and run a separately scoped Expo GL/Fiber physical-device
spike before PLAYER integration**. Rocketbox Sports_Male_01 is a possible faster
conversion alternative if its appearance is accepted. Neither approval waives
license provenance or native safety gates. No model download/integration or native
dependency installation is queued automatically after this report.

Do not begin Phase 6B until the actual 6A athlete viewer and native gates pass.
Possible later 6B planning is limited to choosing a rig/appearance contract after
that evidence; no morphing, progression binding, SHOP clothing or Career cinematic
implementation is authorized by this delivery.
