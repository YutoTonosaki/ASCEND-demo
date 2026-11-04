# Phase 6A.5 — Native Viewer Timeout Investigation

Date: 2026-11-03 (America/Vancouver).
Status: **native root cause NOT established; instrumented retest required**.
The integrated iPhone acceptance failed. No physical native fix/PASS is claimed.

## Confirmed evidence and limits

The reported stack ends at the 30-second deadline in viewer.tsx. That stack proves
only that the old loading flag did not become false; it does not identify import,
GL, asset, parsing or layout as the cause. The same asset rendered in the user's
isolated Lab, but this does not prove compatibility of the integrated native runtime.
No simulator/iPhone/Hermes runtime was executed in this investigation. Node tests, browser rendering
and Hermes exports cannot reproduce that physical execution environment.

Inspected the actual installed Native Fiber Canvas implementation, renderer setup,
SafeAreaProvider/Modal, integrated and Lab entry/load/scene/lifecycle code and Metro.
There is no evidence justifying a dependency or Metro change. None is made. The
working Lab is unmodified. All prior uncommitted integration work is preserved.

| Actual dependency | ASCEND                | Working isolated Lab  |
| ----------------- | --------------------- | --------------------- |
| Expo              | 58.0.19               | 58.0.21               |
| React Native      | 0.88.0                | 0.88.1                |
| React             | 19.3.0                | 19.3.0                |
| Hermes revision   | hermes-v260318099.0.2 | hermes-v260318099.0.5 |
| Expo GL           | 58.0.3                | 58.0.3                |
| Expo Asset        | 58.0.18               | 58.0.19               |
| Expo FileSystem   | 58.0.11               | 58.0.13               |
| Three             | 0.186.1               | 0.186.1               |
| Fiber             | 9.8.2                 | 9.8.2                 |

The narrow Three ESM resolver remains identical in behavior; no process shim or
node_modules patch. ASCEND uses a lazy asynchronous Scene import, while the Lab's
explicit OPEN handler uses a synchronous staged require. ASCEND presents in a
SafeAreaModal and uses Router focus cleanup; the Lab renders in its root surface.
Those are **comparison points/hypotheses**, not established causes. Both use the
same GLB bytes, demand Canvas, native Fiber entry and owned GLTFLoader loads.

## Readiness findings and bounded changes

Before this investigation, only model bounds publication (`onReady`) cleared
loading. It ran after GLTFLoader returned, before React committed the primitive
or a model frame was drawn. It did not prove rendering success. The effect-based
30-second timer normally cleared when loading became false; an already queued
callback had no independent terminal-state check. No evidence proves either issue
caused the reported native timeout.

- `ViewerScene` owns a separate `ViewerLoad` lease for each mount/retry/foreground
  load. Import callbacks are generation checked; timeout/failure/close prevents late
  publication. Cleanup cancels the timer. Effect replay starts a new generation;
  old callbacks/cleanup cannot close or fail the new generation.
- The deadline remains **30,000 ms**. A loading lease can become ready only once.
  A queued deadline after success is ignored even before React state cleanup.
- Model bounds still initialize the existing camera; they no longer mark success.
  A reversible observer uses the first model mesh's Three `onAfterRender`, checks
  model membership in the scene and waits for the existing renderer's render call
  to return. Native Fiber's installed onCreated wraps that render call with
  `endFrameEXP()`. Thus the native submission call must return too. Ground-only,
  old/failed frames, scheduling, parse completion and exceptions cannot signal ready.
  This proves the API path returned, not that a human saw correct pixels on iPhone.
- Observer cleanup restores only its own hooks. The original renderer, arguments,
  return values, camera controls and geometry ownership remain intact. Render
  exceptions are not swallowed or converted into success.
- No speculative SDK update, require/import substitution, forced GL context,
  artificial success, longer deadline or alternate asset is introduced.

## Stage diagnostics

Development console only; no production debug panel or storage key. `[AVS]` entries
include elapsed time, per-attempt run ID and last stage on failure. Original stacks
are retained. Expected handled failures use `RECOVERABLE` console.log output so
Expo LogBox does not turn an optional timeout into a blocking red error overlay.
Unexpected React render-boundary errors retain console.error; global Expo/React
error handlers, warnings and fatal native behavior are not disabled.

Expected milestones (effect/module/layout callbacks can interleave; use elapsed times rather than assuming a strict printed order):

1. `player/open-pressed`, `viewer/mounted` (AppState, platform, RN, Hermes presence).
2. `modal/onShow`, `viewport/layout` with actual width/height.
3. `attempt/start`, `import/Scene:request`.
4. `module/Scene.native:dependencies-initialized`, then `import/Scene:resolved`.
5. `scene/mounted`, `canvas/host-layout` with actual dimensions.
6. `canvas/onCreated`: Fiber size, real GL drawing-buffer dimensions, native
   endFrameEXP capability. This is after GL context creation/configuration.
7. `contents/effect-start`, `asset/resolve:before/ok` with actual asset URI/localUri.
8. `asset/parse:before/ok`, `model/bounds`, `model/publish`.
9. `model/committed-camera-applied`.
10. `frame/model-render-returned`, `viewer/ready-after-frame`, `viewer/frame-ready`.

Cleanup records contents/scene unmount and model disposal. Background records
AppState and closes the old attempt; foreground starts another lease. Model cleanup
still releases late resources without publishing them. Imports completing after
close/timeout record `import/Scene:late-ignored`.

Important diagnostic limits: native Canvas owns its internal GLView and onLayout.
Its public onCreated is reached _after_ raw GLView context creation and root
configuration. Positive host layout with no onCreated narrows the issue to that
interval; it cannot distinguish those internal callbacks alone. Likewise static
module imports initialize dependencies before Scene's module body. No module-body
marker narrows the stall to import/dependency initialization; it does not identify
which dependency. We deliberately do not patch vendors or invent finer evidence.

## Files

- `src/avs/readiness.ts`: injected deadline/generation lease and reversible frame observer.
- `src/avs/viewer-scene.tsx`: scoped lazy import/publication and frame readiness.
- `src/avs/viewer.tsx`: diagnostic modal/layout/lifecycle events, model vs frame state.
- `src/avs/create-scene.tsx`: asset/scene/frame diagnostics and measurable flex host.
- `src/avs/Scene.native.tsx`, `Scene.web.tsx`: dependency-completed marker.
- `src/avs/diagnostics.ts`, `scene-types.ts`: trace and split readiness contract.
- PLAYER action: diagnostic press marker only.
- `tests/avs-timeout.test.cjs`, `tests/browser-avs.cjs`: focused checks/nonzero Canvas.
- Initial integration report status corrected; this report added.

No package/Metro/configuration, GLB/license/source converter, Lab, gameplay formula,
repository, Player Card, Provider order, SHOP/equipment or saved-data schema changes
are made by this investigation.

## Verification

- Full `npm test`: **578 passed, 0 failed** (566 existing + 12 focused timeout tests).
  The native-style frame test injects a renderer/endFrameEXP contract; it is not
  execution of native Expo GL. Tests cover cancellation after ready, queued stale
  timeout, failed import/model, retry, close, background/effect replay, thrown render,
  same-frame model witness, hook cleanup and diagnostic levels/stacks.
- Typecheck and lint: passed. Asset verification: passed; GLB/provenance unchanged.
- Final iOS/Android/web export: passed, 13 static routes in
  `/tmp/ascend-avs-timeout-export`. Both native source maps confirm canonical Three
  ESM/native Scene and no unsafe Three CJS wrapper; bundled GLB SHA matches.
- Final `browser-avs`: passed 390px and 320px, actual model frame readiness,
  pixel-changing controls/gestures and reset, reopen/background recovery, nonzero
  modal Canvas, load failure/retry, deferred import failure containment, EN/JA,
  enlarged text, reduced motion, exact saved bytes/Card content and zero viewer
  gameplay writes. No page exceptions in the final passing run. The 320px enlarged
  Japanese screenshot was visually inspected.
- One intermediate combined browser attempt missed the Japanese entry after a
  reload. Diagnostic capture was added without weakening assertions; focused 320px
  and subsequent default 390/320px reruns both passed without product changes for
  that attempt. This does not explain the original iPhone timeout.
- Existing related browser regressions: **8 passed, all exit 0**: SHOP, Rewards,
  Growth, Cards, Match Resolution, Seasons, Career and Localization. Original
  assertions are preserved. Other legacy browser suites/development Growth Debug
  were not rerun in this investigation; all existing unit regressions were run.
- `git diff --check`: passed. Source hashes captured at investigation start confirm
  only the listed AVS files and PLAYER diagnostic press marker changed in existing
  source. Package/lockfile/Metro and every non-AVS gameplay source are unchanged
  from that starting working tree. Existing prior uncommitted integration changes
  were preserved, not attributed to this investigation.
- External QA tooling remains `/tmp/avs-finish-qa`, with NODE_PATH and
  PLAYWRIGHT_BROWSERS_PATH there and ASCEND_QA_URL to the final export server on
  localhost:8142. No QA dependency or runtime package was installed.
- No physical native execution is claimed.
- Initial checks caught a missing TypeScript `this` annotation and a Web-only error
  in newly added metadata (`Platform.constants` is absent in RN Web). Both were
  corrected without changing runtime dependencies. The initial browser failure was
  this metadata access, not proof of an observer or original iPhone failure.
- A temporary development Metro probe was stopped before completed UI verification;
  its cold-start HTTP attempts timed out. No successful native/dev-UI observation
  is inferred from those attempts.

## Exact iPhone retest and logs required

Keep all real data. Stop only the old ASCEND Metro process in its terminal. Do not
reset/uninstall Expo Go, clear app data, alter the clock or create test workouts.

```sh
cd /Users/tonosaki/Desktop/PF/ASCEND/my-app
AVS_DIAGNOSTICS=1 npx expo start --go --lan --clear --port 8141
```

`--clear` clears Metro transforms, not ASCEND data. Use the same Wi-Fi and this QR
in SDK-58-compatible Expo Go. This instrumented build is the integrated ASCEND app,
not the Lab. Confirm normal tabs/Card/OVR/Coins/equipment first.

If device logs are not forwarded to the Metro terminal, press `j` in Metro to
open React Native DevTools, select Console and enable Preserve log before opening
the viewer. Collect `[AVS]` entries there and bundling/resolver messages in Metro.
Use the Hermes inspector; do not switch JS execution to a browser remote runtime.

1. Open PLAYER → 3Dアスリートを見る once. Keep the terminal visible and wait up to
   30 seconds. Capture **all** `[AVS]` lines from `player/open-pressed` through
   ready or failure and closing; do not send only the final timeout stack.
2. If failed, RETRY once, then CLOSE. Send both attempt IDs, all stage/details and
   original stacks. Include Metro bundle/download errors and `[AVS-RESOLVE]` lines.
   Note whether the viewer, spinner, athlete or error text was visible.
3. Send iPhone model, iOS version, Expo Go version, whether foreground/background
   occurred and approximately how long each step took. If a red screen remains,
   include its complete expanded stack; do not dismiss it by resetting app data.
4. If ready, confirm actual model pixels and controls, repeat close/open and test
   background/foreground. Capture the ready/frame logs too. Check unchanged Card,
   Coins/equipment and history after close/restart, EN/JA and large text/VoiceOver.

Interpretation: no import completion → investigate native Metro/dependency interval;
zero/no layout → modal/layout interval; positive layout but no onCreated → GL/root
configuration interval; resolve without parse → asset/loader interval; parse/model
without frame → commit/render interval. These remain hypotheses until the actual
run's logs arrive. Subsequent changes must target that evidence; no guessed fallback
or dependency migration is applied here. Stop at Phase 6A.5; Phase 6B is NOT started.
