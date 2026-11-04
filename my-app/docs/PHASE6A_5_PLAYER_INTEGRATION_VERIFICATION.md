# Phase 6A.5 — Safe AVS Integration into PLAYER

Date: 2026-11-03 (America/Vancouver).
Status: **integrated iPhone acceptance FAILED** (user-reported viewer timeout).
The local checks below describe the initial integration, not native success.
See [native timeout investigation](PHASE6A_5_NATIVE_TIMEOUT_FIX.md) for the diagnostic build and current limitations.

## Compatibility audit and decision

Audit completed before production edits. Read AGENTS.md and its exact SDK 57
reference, actual SDK 58 GL documentation, installed packages, Lab runtime fix,
Metro defaults, root Providers, PLAYER/Card, safe-area modal and asset pipeline.

| Package/runtime   | ASCEND before integration | Physically verified isolated Lab | Integrated ASCEND     |
| ----------------- | ------------------------- | -------------------------------- | --------------------- |
| Expo              | 58.0.19                   | 58.0.21                          | 58.0.19, unchanged    |
| React Native      | 0.88.0                    | 0.88.1                           | 0.88.0, unchanged     |
| React / React DOM | 19.3.0                    | 19.3.0                           | 19.3.0, unchanged     |
| Hermes revision   | hermes-v260318099.0.2     | hermes-v260318099.0.5            | .0.2, unchanged       |
| expo-gl           | absent                    | 58.0.3                           | 58.0.3                |
| expo-asset        | 58.0.18 transitive        | 58.0.19                          | 58.0.18, now explicit |
| expo-file-system  | 58.0.11 transitive        | 58.0.13                          | 58.0.11, now explicit |
| Three             | absent                    | 0.186.1                          | 0.186.1               |
| React Three Fiber | absent                    | 9.8.2                            | 9.8.2                 |
| @types/three      | absent                    | 0.186.0                          | 0.186.0 (development) |

Decision: feasible without SDK/runtime migration. Installed Expo 58.0.19's own
bundledNativeModules.json recommends GL ~58.0.3, Asset ~58.0.18 and FileSystem
~58.0.11. Fiber's actual peer ranges accept React >=19 <19.4, RN >=0.78, Three

> =0.156 and these Expo packages. Added exact audited versions, retaining all
> existing locked package versions. Expo GL is included in Expo Go for iOS/Android;
> no custom native module, plugin or app.json change. This establishes compatibility
> for an integration attempt, **not proof of native runtime success**. The two Hermes
> patches are different and integrated execution still needs the user's device.

References: [required SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/),
[SDK 58 GL](https://docs.expo.dev/versions/v58.0.0/sdk/gl-view/),
[Metro resolver API](https://metrobundler.dev/docs/configuration/#resolverequest).
Installed source/lockfiles, not today's latest package versions, determine this audit.

## Integration and lazy boundary

The original PlayerCard remains unchanged and primary. One localized action directly
below it opens AthleteViewer in the existing full-screen SafeAreaModal. There is
no tab, root Provider, navigation route or persisted viewer state. It is available
when the existing Player/Card is available. Leaving PLAYER closes the surface.

The lightweight viewer shell imports only React Native, existing localization/UI,
pure camera/lifecycle helpers and an inert platform loader. The loader calls dynamic import('./Scene.native') or Scene.web only in the mounted
viewer's effect, catches rejected imports and suppresses publication after close. No
Three/Fiber/Expo GL module, Canvas, GLB module or asset request is evaluated merely
by opening ASCEND/PLAYER. Metro includes deferred modules in the build; this is
execution laziness; web may additionally split modules. No smaller native download
or native network code splitting is promised.

Metro extends Expo defaults only with the glb asset extension and exact root
`three` resolution to installed `three.module.js`. All other requests delegate to
context.resolveRequest. The Lab's proven fix is retained because Three 0.186.1's
Node-only CJS wrapper calls process.emitWarning at line 12, which RN's minimal
process does not provide. Native Fiber's CJS importer otherwise reaches that
wrapper. No global process shim, node_modules patch or broad package-export change.
One canonical Three ESM entry is used by root importers on every platform.

The demand-rendered scene owns each asynchronous GLTF load; it never uses a shared
loader cache. Late loads after close/background dispose without publication.
Geometry/material/texture disposal deduplicates shared references. Canvas unmounts
on close/background/error, then reloads on foreground. Imported JavaScript modules
remain cached after first opening; unloading a Canvas/model is not a claim to
unload library code or immediately force native garbage collection. Loading has a 30-second
deadline. Fixed CLOSE, compact wrapping 44-point camera buttons and scrollable
controls capped at 38% of the surface leave the athlete primary; large text can
scroll without losing CLOSE. No animation, sound or motion-dependent information.
Horizontal drag, rebased pinch, presets, rotation, zoom limits and reset retain
Lab semantics. EN/JA labels use ASCEND's existing locale, not a second setting.

## Asset and license

Production location: `assets/avs/athlete.glb` plus manifest and ASSET-LICENSE.md.
Byte-identical to the physically tested Lab asset: 563,184 bytes, 30,815 triangles,
3 meshes, zero textures, animations, runtime bones or morph targets. SHA-256:
`4b655504291c7389994b8d3e420744405a21fbb71fde2e20f318880aee849cfc`.

The original MakeHuman CC0 source files, exact revision and per-file SHA provenance,
converter, source license declarations and validation report remain unmodified in
`experiments/avs-6a`. Apparel is the same original CC0 derived top/shorts; no
community asset is added. Production verification validates original provenance
and geometry, then checks the production copy/manifest. No source geometry change.
It is a fixed-pose prototype with prototype clothing, independent of SHOP/equipment,
OVR and Growth. No animation, morphing or anatomy feature is implied.

## Isolation and failure containment

AVS imports no gameplay Provider/repository and writes no gameplay/settings record.
Root provider order, Card component, SHOP/equipment, PR/Growth/OVR, Coins, Match,
Career/Season and presentation consumption implementations remain untouched.
An import failure, render exception or model rejection presents localized RETRY and
CLOSE; the original error object/stack is logged only in development. No production
diagnostic panel, fake-error button, reset or app restart control. Native process
crashes cannot be contained by a React boundary; no complete crash isolation claim.
GPU/driver, native AppState, actual insets and native memory behavior require device
testing. Expo Asset may use its ordinary asset cache; this is not gameplay storage.

## Files

- package.json / package-lock.json: exact AVS dependencies, matching type definitions.
- metro.config.cjs / tools/three-resolution.cjs: default-preserving ESM/GLB handling.
- src/avs/: typed scene, platform loaders, compact modal viewer, camera, lifecycle/gesture memory,
  owned-resource cleanup, development-only console diagnostics and asset declaration.
- assets/avs/: unchanged model, manifest and license/provenance pointer.
- src/app/(tabs)/player.tsx: localized entry and transient viewer visibility.
- src/localization/locales/en.ts / ja.ts: semantic avs.\* labels.
- tools/verify-avs.cjs: source/model/copy integrity check.
- tests/avs-integrated-camera.test.cjs, avs-integration.test.cjs, browser-avs.cjs.
- README and this report. The isolated Lab remains unchanged.

## Verification

- Full `npm test`: **566 passed, 0 failed** (541 existing + 25 AVS integration tests).
- Focused AVS suite: **25 passed, 0 failed**.
- `npm run typecheck`: passed. `npm run lint`: passed without warnings/errors.
- `npm run asset:verify`: passed; original source hashes and production copy match.
- Lockfile comparison: zero version changes to pre-existing package entries;
  `npm ls` confirms one deduplicated Three and unchanged React/Expo/RN.
- Initial typecheck found distinct native/web Canvas style types and RN 0.88's
  removed absoluteFillObject export. Shared Canvas props now declare only the
  actual common contract, and overlay positioning uses explicit supported styles.
  React Compiler lint rejected synchronous effect publication/ref capture in
  responder creation. Imports now publish asynchronously with close cancellation;
  a tested imperative CameraGestures object owns gesture memory. No lint rule is
  disabled, package downgraded or global shim introduced.
- Final Expo export: passed iOS/Android Hermes and web, 13 static routes, output
  `/tmp/ascend-avs-integration-export`. Both native maps include Three ESM/core and
  Scene.native, exclude three.cjs; bundled GLB hash matches. Native HBC is about
  4.9 MB per platform; web's deferred Scene chunk is about 1.1 MB. These are build
  sizes, not memory/load-time/FPS measurements.
- `EXPO_OFFLINE=1 npx expo install --check`: up to date against the installed SDK
  snapshot. CLI warns offline validation is unreliable; this is not live package
  registry/native compatibility certification.
- `browser-avs`: initial 390/320px pass on the final export, actual rendered athlete,
  pixel-changing presets/drag/zoom and exact reset, two-finger pinch without page
  zoom, three reopen cycles, background Canvas removal/recovery, real GLB request
  rejection/retry, zero gameplay Storage writes, byte-identical persisted data and
  unchanged Card text. No Three evaluation/model request/Canvas before explicit
  opening. EN/JA and 1.5x font/line-height approximation pass without sideways
  overflow/page exceptions. Both Japanese screenshots visually inspected.
- Existing related production browser regressions: **13 passed, all exit 0**:
  browser-shop, browser-shop-purchase-fix, browser-shop-ux, browser-shop-expansion,
  browser-rewards, browser-growth, browser-cards, browser-presentation,
  browser-match-resolution, browser-match-rewards, browser-seasons, browser-career
  and browser-localization. No existing assertions/files were weakened or changed.
  Other legacy browser scripts, including development Metro Growth Debug, were not
  rerun for this integration. Their existing unit regressions remain in the full
  suite. No native/iPhone/simulator execution was performed.
- Final `browser-avs` rerun also passed a blocked deferred Scene JavaScript chunk:
  localized RETRY/CLOSE, no Canvas, return to the unchanged Card and identical
  storage. This supplements the pure loader rejection tests and the real GLB
  failure/retry flow. No development diagnostics panel is exposed.
- `git diff --check`: passed. The isolated Lab, root providers/navigation, original
  Card, gameplay calculations/repositories and persisted schemas remain unchanged.
  The browser runner uses external Playwright under `/tmp/avs-finish-qa` with
  NODE_PATH/PLAYWRIGHT_BROWSERS_PATH pointing there and ASCEND_QA_URL pointing at
  the served final export. No QA dependency is installed in ASCEND.
- No integrated native PASS is claimed.
- The first export overlapped creation of gestures.ts and its static Metro file map
  missed that newly added file. Rerunning after source changes stopped succeeded.
  Browser/server initially required native process/localhost permissions outside
  the sandbox; authorized reruns used the same output and isolated fixture data.
  No product assertion, dependency version or validation was weakened.

## Exact iPhone acceptance steps

1. Keep existing phone data. Stop the old **Lab** Metro process in its own terminal.
   Do not uninstall/reset Expo Go or clear ASCEND storage.
2. Start the production project (not experiments/avs-6a):

   ```sh
   cd /Users/tonosaki/Desktop/PF/ASCEND/my-app
   AVS_DIAGNOSTICS=1 npx expo start --go --lan --clear --port 8141
   ```

   Use the same Wi-Fi and compatible SDK 58 Expo Go; open this terminal's QR code.
   `--clear` clears Metro's transform cache, not saved phone gameplay data.

3. Confirm normal launch and all five tabs. Compare prior OVR/body ratings/tier,
   Card cosmetics, Coins/purchases, history, Club, Season and Match data.
4. PLAYER → VIEW 3D ATHLETE / 3Dアスリートを見る. Check full real athlete, drag,
   pinch, front/side/back, rotate buttons, zoom and reset. No SHOP clothes binding.
5. CLOSE returns to the same Player/Card. Repeat open/close several times, then
   background/foreground while open: clean reload, working controls, no freeze.
6. Switch EN/JA normally. Check small screen, large Dynamic Type, VoiceOver button
   labels, fixed CLOSE, scrolling and safe-area clearance. Do not create workouts,
   purchases or rewards solely to test this visualization.
7. Reload/restart; normal startup remains responsive, viewer stays closed and all
   existing data is unchanged. If failing, send expanded red-screen stack, device/
   iOS/Expo Go version, whether before/after opening, and Metro [AVS]/[AVS-RESOLVE]
   lines including original error stack. Do not reset data to troubleshoot.

The user verified these interactions **in the isolated Lab only**. Integrated ASCEND
on iPhone is not yet verified and this phase is not accepted complete until the
user confirms it. Phase 6B is NOT started; no morphing, workout animations, Muscle
Vision, SHOP-to-avatar bindings or 3D Match/Career presentation is implemented.
