# ASCEND AVS Lab — isolated Phase 6A experiment

This is a separate Expo SDK 58 app. It has its own package/lockfile, slug, entry,
assets and Metro configuration. It does not import ASCEND, read its repositories,
persist settings, buy/equip cosmetics, or expose a PLAYER entry.

## Run on a physical iPhone with Expo Go

1. Use an Expo Go version that supports **SDK 58**. Do not uninstall Expo Go or clear
   its data to perform this test. Keep the iPhone and Mac on the
   same Wi-Fi. Do not reset ASCEND data or install this over a production binary.
2. In Terminal:

   ```sh
   cd /Users/tonosaki/Desktop/PF/ASCEND/experiments/avs-6a
   npm ci --ignore-scripts
   npm start -- --port 8131
   ```

3. Scan **this terminal's QR code** using the iPhone Camera and open Expo Go.
   The project is **ASCEND AVS Lab**, not ASCEND's normal five-tab app. PLAYER has
   no preview entry yet. No native prebuild, EAS/signing change or Xcode is needed
   for this Expo Go attempt.
4. Tap **OPEN ATHLETE VIEWER**. Confirm a full-body, genuinely three-dimensional
   human with a teal compression top and dark shorts appears after loading.
5. Drag horizontally, pinch, use FRONT/SIDE/BACK and zoom buttons, then RESET VIEW.
   Buttons provide non-gesture alternatives. Check English/日本語 immediately.
6. CLOSE and reopen several times. Background/foreground while open and while
   loading. The renderer should unmount in background and reload on foreground.
7. Use SIMULATE LOAD ERROR / 読込エラーをテスト, then RETRY / 再試行. This lab-only
   fault control alters no files or saved data. CLOSE remains outside scrolling.
8. Check a small screen, large Dynamic Type, VoiceOver, Reduce Motion, safe areas,
   overheating/freezes and reachable controls. Report device/iOS/Expo Go versions,
   whether the model/materials load, and any gesture/lifecycle failures.
9. Exit the lab and open your ordinary ASCEND project separately. Check normal
   PLAYER, SHOP, HOME, TRAIN and CAREER values and navigation.

Expo Go support is documented for Expo GL, but **native rendering has not been
verified by this implementation**. An incompatible Expo Go version is a runtime
prerequisite problem, not permission to upgrade ASCEND. Keep JavaScript on-device
in Hermes; old remote Chrome JS execution cannot supply Expo GL's synchronous calls.
If the lab fails natively, close it and report the error; do not integrate it into
PLAYER or start Phase 6B.

For Android, use a compatible physical Expo Go device and the same QR/server;
verify the same controls, hardware back/navigation and lifecycle independently.
Android native rendering is also unverified. No custom build was required by the
chosen package architecture or produced here. If one becomes necessary, first
establish its prerequisites in this isolated project; do not modify production
signing/configuration. The current Mac has Xcode 15.4, below installed RN's minimum.

## Checks

```sh
npm test
npm run typecheck
npm run lint
npm run asset:verify
npm run asset:build
env -u NO_COLOR EXPO_OFFLINE=1 CI=1 npm run export -- --max-workers 1 --output-dir /tmp/avs-lab-export
```

The source converter uses Python 3 standard library only. See
[ASSET-LICENSE.md](ASSET-LICENSE.md) for every included asset component, exact
source revision, CC0 evidence and limitations. The model is fixed-pose and untextured;
its simple fitted apparel is prototype art. It does not support runtime body morphs
or exercise animations. Camera/lighting/rendering are replaceable without Player data.

Web: `npm run web -- --port 8131`, or serve the exported directory. WebGL2 is
required. Browser tests use external Playwright, not a new application dependency:

```sh
NODE_PATH=/tmp/avs-finish-qa/node_modules \
PLAYWRIGHT_BROWSERS_PATH=/tmp/avs-finish-qa/browsers \
AVS_QA_URL=http://127.0.0.1:8130 node tests/browser-viewer.cjs
```

The browser test defaults screenshots to /tmp; set AVS_QA_SCREENSHOTS to change it.
WebGL screenshots and Hermes bundles do not prove physical iPhone rendering,
touch, native memory cleanup or performance. No FPS guarantee is made.

## Implementation boundaries

- `src/camera.ts`: pure bounded camera math; `src/lifecycle.ts`: load ownership,
  visibility gating and touch-count rebasing.
- `Scene.native.jsx` imports Fiber native; `Scene.web.jsx` uses the web renderer.
  `create-scene.jsx` owns one uncached loaded model and its materials/geometries.
- Static demand rendering, no idle animation/shadows/postprocessing. Closing,
  backgrounding or failing removes Canvas. Late async models are disposed.
- `App.jsx` owns ephemeral language/camera/open state, a rendering boundary,
  30-second loading deadline, safe areas and accessible controls.
- Native FileSystem/Asset may use its ordinary **asset cache**. No gameplay or
  settings storage is read or written. No AsyncStorage dependency is installed.
- GLB has no external runtime URLs. Expo Go still needs Metro for its development
  JavaScript/initial assets; a cold offline packaged launch has not been verified.
- Production ASCEND is untouched. Physical iPhone acceptance is the gate for any
  later PLAYER integration. No Phase 6B, SHOP 3D clothing or progression binding.
