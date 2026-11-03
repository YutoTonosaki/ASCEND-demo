# Phase 6A — Native runtime blocker investigation

Date: 2026-11-02. Status: locally reproduced import defect corrected; **iPhone retest required**.
All edits are inside `experiments/avs-6a`. No production ASCEND file, dependency,
configuration, navigation, data or schema was changed. No packages were upgraded
or downgraded. The real GLB, licensed sources, camera math and resource ownership
are unchanged. PLAYER integration and Phase 6B remain unimplemented.

## Observed environment

Installed package manifests: Expo 58.0.21, RN 0.88.1, React/React DOM 19.3.0,
Expo GL 58.0.3, Three 0.186.1, Fiber 9.8.2, Expo Asset 58.0.19, FileSystem 58.0.13.
RN `.hermesv1version` is hermes-v260318099.0.5; installed hermes-compiler is
260318099.0.5, HBC version 99. These describe the checkout, not the phone's Expo Go
binary. Record the actual Expo Go/iOS/device versions during retest.

## Exact locally identified call

Installed `node_modules/three/build/three.cjs:12:9` unconditionally executes:

```js
process.emitWarning(/* CommonJS deprecation message */, /* options */);
```

Only afterward does line 17 re-export `./three.module.js`. Three's package exports
map `require` to that CJS entry and `import` to the ESM entry. Fiber's native CJS
entry requires `three` at module scope. Previously the eager chain was:

`index.js → App.jsx → Scene.native.jsx → Fiber native CJS → require('three')`

RN's `Libraries/Core/setUpGlobals.js:35–41` establishes a minimal process/env;
it does not supply Node's `process.emitWarning`. Executing the **actual installed
CJS file**, unchanged, in a Node VM with that minimal process shape reproduces:

```
TypeError: process.emitWarning is not a function
    at three/build/three.cjs:12:9
```

The re-export is never reached. This happens at **module initialization**, before
Canvas, native GL context creation, or GLB loading. Web's ESM path explains why
browser success did not exercise this Node-only wrapper. This is not an asset,
camera, insufficient-memory or generic 'Hermes cannot render 3D' diagnosis.

**Evidence limit:** this is a confirmed local defect on the audited native import
path. The original phone trace contains only loader frames; it cannot establish
that this is the only phone failure. We have not executed the fixed app on iPhone.
If it still fails, use the exact stage/stack procedure below rather than assuming
a second cause. The local hermesc binary explicitly does not support `-exec`;
its successful compilation is not a native runtime reproduction.

## Smallest supported correction and containment

1. `tools/three-resolution.cjs` maps only the root `three` specifier to the installed
   `build/three.module.js`, for all importers/platforms. Metro transpiles ESM for
   CJS consumers too. Addons and every other request delegate to the original
   resolver. This avoids duplicate Three instances. There is no global process
   shim, no no-op emitWarning patch and no node_modules modification.
2. `metro.config.cjs` installs that narrow resolver using Metro's supported
   `resolveRequest` hook. `AVS_DIAGNOSTICS=1` logs each resolved path.
   [Metro resolver API](https://metrobundler.dev/docs/configuration/#resolverequest).
3. `App.jsx` no longer eagerly imports Scene. The platform loader is inert until
   OPEN ATHLETE VIEWER. Import errors are caught into the existing retry/close UI,
   without creating a Canvas. The supported Expo named bootstrap import is retained.
4. `src/diagnostics.js` holds at most 120 entries in memory, prints AVS-DIAG markers
   and captures original exception stacks. There are no storage/network writes.
   EN/JA DIAGNOSTICS and SHARE DIAGNOSTICS allow selectable/copyable output.
5. Native loader records Three, GL, Asset, legacy FileSystem, Fiber and Scene import
   boundaries and relevant export/API types. Scene records `canvas/created`, asset
   resolution/parse and failure. Rendering errors retain their original stacks.

No unsupported API is fabricated. If Expo/RN bootstrap fails before our first entry
marker, the lab cannot catch that earlier failure; provide the complete red screen
and stack. A React boundary also cannot recover an OS/native-driver process crash.

## Retest on iPhone — do not reset any data

Stop only the previous **lab** Metro process (Ctrl+C in that terminal). Do not
uninstall Expo Go, erase caches/data in Expo Go, reset ASCEND or use `expo prebuild`.
From a separate terminal:

```sh
cd /Users/tonosaki/Desktop/PF/ASCEND/experiments/avs-6a
AVS_DIAGNOSTICS=1 npx expo start --go --lan --clear --port 8131
```

`--clear` clears Metro's transform cache only, not Expo Go/ASCEND user data.
Use SDK 58-compatible Expo Go on the same Wi-Fi and scan **this lab's** QR.

1. Confirm ASCEND AVS Lab's home screen appears **before opening the viewer**.
   Expected: `entry Hermes=true`, `startup/App:ok`, root registration, `shell/mounted`.
   No `import/fiber-native` / `canvas/created` / `asset/parse` should occur yet.
2. Open DIAGNOSTICS. Then OPEN ATHLETE VIEWER. Check the sequence:
   `import/three:ok` → GL/Asset/FS imports → `import/fiber-native:ok` → Scene import
   → `viewer/mount-requested` → `canvas/created` → asset resolve/parse OK.
   Asset/model creation is asynchronous; this is milestone order, not frame timing.
3. Check full body, drag, pinch, presets, zoom/reset, EN/JA, CLOSE/reopen and
   background/foreground. Inspect large Dynamic Type, VoiceOver and safe areas.
4. Confirm the ordinary ASCEND project remains separate and unchanged. No PLAYER
   entry exists. Do not manufacture workouts or change saved data for the retest.

If it fails, send **all** of the following:

- iPhone model, iOS version, exact Expo Go version, whether the home screen opened,
  and whether the crash happened before or after OPEN ATHLETE VIEWER.
- Terminal lines from `[AVS-RESOLVE]` and `[AVS-DIAG] entry` through the failure,
  including every `:ERROR` stack (not only `metroRequire` frames).
- If the shell works: open DIAGNOSTICS, use SHARE DIAGNOSTICS to copy its complete
  JSON into this chat. It contains runtime/stage/error information, not workout data.
- A screenshot of the **entire** error and expanded stack. Include bundle URL and
  line/column if shown. If no AVS-DIAG entry appears, say that explicitly; it places
  the failure before our lab entry and avoids blaming Canvas/GLB without evidence.

Use the development Metro session so symbolication/source locations remain useful.
Do not switch to old remote Chrome JS execution; the target is on-device Hermes.

## Verification

- `npm test`: **27 passed, 0 failed**, exit 0 (22 existing + 5 native/import tests).
- `npm run typecheck` / `npm run lint`: passed, exit 0.
- `npm run asset:verify`: passed; GLB SHA-256 remains
  `4b655504291c7389994b8d3e420744405a21fbb71fde2e20f318880aee849cfc`.
- `AVS_DIAGNOSTICS=1 EXPO_OFFLINE=1 CI=1 npx expo export --platform all --source-maps --max-workers 1 --output-dir /tmp/avs-native-final-export`:
  passed for Web, Android and iOS. Every logged root Three resolution selects ESM.
  Both native source maps contain `three.module.js`/`three.core.js` and **exclude
  `three.cjs`**. Native Hermes compilation succeeds; no native execution is implied.
- `tests/browser-viewer.cjs`: passed on the final export, exit 0. Added assertions
  verify no Scene import before OPEN and successful diagnostic asset milestone.
  Existing 390/320px rendering, front/side/back, exact reset, drag/pinch/zoom,
  EN/JA/enlarged text, background/remount, retry, unsupported WebGL2/CLOSE, zero
  Storage writes and no page exceptions remain intact. External tools:
  NODE_PATH=/tmp/avs-finish-qa/node_modules,
  PLAYWRIGHT_BROWSERS_PATH=/tmp/avs-finish-qa/browsers, port 8136.
- `git diff --check`: passed. All tracked changes/new files are lab-local;
  no package/lockfile or model changes. No production files modified.

The five new tests cover the actual installed CJS startup exception before its
re-export, canonical ESM resolution/delegation, deferred import structure,
original-error/bounded diagnostics, and native-loader failure attribution before
any Canvas/asset call. The root React/Expo bootstrap keeps its original supported
named import; if it fails before `entry`, the diagnostic log cannot describe it.

No physical iPhone, simulator, native GL/Hermes app execution or performance test
was performed. No claim that the user's device crash is resolved is made. The
local binary's attempted `-exec` reported that it is unsupported; it was not
counted as a runtime test. Three's Node CJS deprecation is avoided by supported ESM
resolution, not suppressed with a fake Node API.

## Files

Changed: index.js, App.jsx, metro.config.cjs, src/create-scene.jsx, src/strings.ts.
Added: src/diagnostics.js, src/load-renderer.native.js, src/load-renderer.web.js,
tools/three-resolution.cjs, tests/native-runtime.test.cjs and this report.
README retest guidance links here. No production files are part of this change.

This delivery corrects the reproduced import defect and provides native diagnostic
containment. It is **not confirmation that the crash is fixed on your iPhone**.
