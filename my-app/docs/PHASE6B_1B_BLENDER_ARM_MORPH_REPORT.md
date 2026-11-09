# Phase 6B.1B — Blender Setup & First Arm Morph Authoring

Date: 2026-11-04 (America/Vancouver).
Decision: **CONDITIONAL GO for the verified authoring environment and editable neutral handoff. No approved anatomical morph; Phase 6B.1B is NOT a full GO. Phase 6B.2 is NOT ready and has not started.**

## What changed from 6B.1A

The user explicitly approved the official Blender 4.5.15 Intel DMG download,
checksum/signature verification and project-local installation. This phase now
provides a working Blender Python/glTF environment, an actual editable `.blend`,
verified neutral reconstruction including separate garments, reference influence
groups, rendered inspection images and reproducible scripts. These are tangible
authoring capabilities; the remaining blocker is the approved upper-arm region
and sculpt, not software installation or vertex correspondence.

No `upper_arm_development` athlete target, developed endpoint, corrective garment
or experimental athlete GLB is claimed. The requested fallback is delivered as an
editable neutral handoff with explicitly unreviewed reference groups and manual
sculpt/review instructions. No global muscle target is clipped into a fake regional
morph. Production ASCEND and accepted assets are unchanged.

## 1. Environment, rights and installation

Read `my-app/AGENTS.md`, its required SDK 57 reference, the complete 6B.1/6B.1A
reports, their audit evidence, asset provenance/licenses and original converter
before setup. The actual app's SDK/dependencies were not changed.

Machine: macOS 14.8.9 (23J631), Intel x86_64, Intel UHD Graphics 617. No existing
Blender/Python bpy installation was found in the checked locations. Official
requirements identify 4.5 LTS as the last macOS Intel line. The official stable
4.5.15 x64 package was selected, not a beta or Apple-Silicon build.
[Official requirements](https://www.blender.org/download/requirements/),
[official release index](https://download.blender.org/release/Blender4.5/).

- Official DMG: `https://download.blender.org/release/Blender4.5/blender-4.5.15-macos-x64.dmg`.
- Official checksum: `https://download.blender.org/release/Blender4.5/blender-4.5.15.sha256`.
- Download destination: `/tmp/ascend-blender-4.5.15/`.
- DMG size: 340,111,721 bytes.
- Exact SHA-256 matched the official manifest:
  `3801a97619292a012ede0e855ee705ae872a680474845297b777254f7f21ed78`.
- Read-only DMG mount verified, application copied with `ditto`, then DMG unmounted.
- Installation only at `experiments/avs-growth-6b1b/.tools/Blender.app` (Git ignored).
- Source and copied app passed `codesign --verify --deep --strict` and
  `spctl --assess --type execute`: **accepted, Notarized Developer ID**.
- No quarantine removal, re-signing, security bypass, PATH changes, Homebrew,
  system Applications install or npm dependency change.
- Runtime verified: **Blender 4.5.15 LTS**, build **5afeabba6097**.

`validation/installation.json`, `official-checksums.sha256`, `codesign.txt` and
`gatekeeper.txt` retain installation evidence. The first restricted-environment
signature check reported an invalid-signature/subsystem error; ordinary macOS
verification of the unmodified source and installed app succeeded. The earlier
sandbox result is not treated as a genuine tampered-package finding.

All eight pinned MakeHuman source hashes were rechecked. Existing body/targets,
rig/weights and original ASCEND apparel/materials retain their previously verified
CC0 rights; no community content was added. The exact source revision and component
rights are copied into `references/upstream-provenance.json` and
`references/ASSET-LICENSE.md`. Blender is an authoring application, not code added
to ASCEND. Any future sculpt contribution/references still need recorded rights.

## 2. Actual Python and glTF capability

The default agent sandbox crashed before Python in Metal capability detection.
The saved backtrace passes through `supports_barycentric_whitelist`,
`MTLBackend::metal_is_supported`, GPU backend detection and `WM_init`.
`validation/sandbox-startup-crash.txt` preserves this evidence. No claim is made
about the exact low-level driver call causing the crash.

The same signed executable and script succeeded in the normal macOS process
context, with factory startup and a project-local `BLENDER_USER_CONFIG`. No Blender
code, library, shader, security setting or dependency was changed to obtain success.
This establishes a working ordinary execution route; the restricted sandbox is not
a supported Blender launch route here.

`api_smoke.py` actually constructs a three-vertex triangle with Basis plus
`TEST_ONLY_triangle`, exports it, directly inspects target name/count/zero weight,
then imports it and verifies the key exists. Python, glTF import/export and this
simple shape-key roundtrip passed. This **synthetic API fixture is not an athlete
morph**. It lives in `validation/api-test-triangle.glb`, not `exports/`.

Khronos glTF Validator was not available: the old temporary directory exists but
its module files are empty/missing; `require` failed with MODULE_NOT_FOUND. No
validator package was installed. Direct fixture inspection and actual Blender I/O
passed, but a Khronos Validator pass is **not** claimed. An eventual athlete morph
must still receive proper format validation.

## 3. Exact neutral reconstruction and persisted handoff

`prepare_reference.py` reads the accepted GLB's raw accessors, extracts immutable
reference arrays/materials and reuses the checked 6B.1A source-ID bridge. It neither
runs the full original asset writer nor changes the accepted asset. Baseline SHA:
`4b655504291c7389994b8d3e420744405a21fbb71fde2e20f318880aee849cfc`.

`build_neutral.py` constructs Blender meshes directly, avoiding assumptions about
normal glTF import reindexing. Coordinate conversion is glTF `(x,y,z)` → Blender
`(x,-z,y)`, inverse `(x,z,-y)`. It preserves:

- Three separate objects and original triangle vertex order.
- `baseline_index` per mesh and `makehuman_source_id` for the 13,380 body vertices.
- Original normals in a point attribute plus custom shading-normal assignment.
- Original material base color, roughness, metallic and backface-culling semantics.
- One exact neutral `Basis` per object; no geometry-changing modifiers or rig.

The script saves `blend/neutral-handoff.blend` (about 3.1 MiB). A **separate Blender
process** reopened it and reran the checks. All three meshes passed before and after
save. Restored positions repack to byte-identical Float32 baseline POSITION data;
triangle ordering matches original indices exactly; the externally stored baseline
NORMAL arrays roundtrip byte-identically through the retained attribute. Basis
coordinates equal mesh coordinates. This is not a claim that Blender's evaluated
corner shading normals or a default exporter would preserve original NORMAL bytes;
the external authoritative buffers remain necessary for an eventual target writer.

| Mesh | Vertices | Triangles | Neutral/Basis/order checks |
| --- | ---: | ---: | --- |
| athlete-body | 13,380 | 26,756 | Passed |
| training-top | 1,503 | 2,736 | Passed |
| training-shorts | 748 | 1,323 | Passed |

The external accepted-neutral GLB, arrays and provenance remain in `references/`
outside Blender; hashes are in `validation/reference-hashes.json`. The original
production and Lab GLBs are unchanged and identical to that reference.

## 4. Region-selection gate and actual visual evidence

The Blender body contains six `REF_joint_influence_*` groups: upperarm01/02 and
lowerarm01 for left/right, copied through the source-ID mapping. They support
inspectable Weight Paint/Edit Mode review. The reference renders show the clamped
sum of the four upperarm groups, not a proposed anatomical mask approved for use.

The red reference includes the shoulder cap and approaches the elbow. That is
expected for joint influences and visibly demonstrates why it cannot be declared
biceps/triceps anatomy. No approved biceps/triceps surface selection, protected
transition mask, mirror pairing, limb anchor contract or sculpt endpoint exists.
The supplied global muscle target remains global. No mathematical scaling/inflation
has been substituted for a localized muscle sculpt.

**Stop at the region-selection gate.** A neutral editable handoff is feasible and
created; an anatomically credible automatically authored endpoint is not established
from these inputs. No empty/deceptively named athlete development key is shipped.

Five actual CPU Cycles renders (12 samples, fixed lights and model scale) were
created and visually inspected:

- `evidence/neutral-front.png`: unchanged neutral body and garments.
- `evidence/UNREVIEWED-joint-support-front.png`.
- `evidence/UNREVIEWED-joint-support-side.png`.
- `evidence/UNREVIEWED-joint-support-back.png`.
- `evidence/UNREVIEWED-joint-support-closeup.png`: shoulder/armhole/elbow context.

These show neutral geometry and unreviewed rig influence only. They are not
0/.5/1 growth comparisons or artist approval. CPU noise is visible at this small
sample budget; no measurement of iPhone performance follows from these renders.
The render script changes only an in-memory inspection material and does not save
that heatmap over the neutral `.blend`.

## 5. Manual operations and clothing gate

`experiments/avs-growth-6b1b/MANUAL_AUTHORING.md` supplies concrete Blender steps:
frame the model, inspect reference weights individually, create separate REVIEW
proposal groups, identify biceps/triceps and transition bands with an anatomy-capable
review, preserve source IDs/protected anchors and approve symmetry tolerances.
Only after that review should `upper_arm_development` be added relative to Basis
and sculpted with stable topology and a modest endpoint.

An actual reviewer must record their name/date, boundary reasoning, source IDs,
protected anchors and acceptance tolerances; no invented approval record is created.
At that stage manual sculpting must preserve shoulder/elbow continuity, forearms,
hands/torso/legs, limb lengths and overall height. Reviewed delta mirroring must
account for baseline asymmetry.

The sleeveless top and shorts are reconstructed as separate meshes. Baseline views
make their cut/fit inspectable; there is no developed shape against which clearance
can be validated. Armholes, shoulder transitions, penetration and gaps under growth
remain **untested**, not accepted. A matching top corrective, if necessary, must
retain its own topology and semantic channel, with no arbitrary inflation or camera
trick. Review baseline contacts separately and sweep intermediate values before
approving a morph export. Cloth-to-body deformation correspondence is not inferred
from body source IDs. Shorts also require a check even if unchanged.

## 6. Reproduce / open

From `/Users/tonosaki/Desktop/PF/ASCEND`:

```sh
experiments/avs-growth-6b1b/.tools/Blender.app/Contents/MacOS/Blender \
  --factory-startup experiments/avs-growth-6b1b/blend/neutral-handoff.blend
```

This opens the neutral editing project in the normal macOS desktop environment.
Use Home/Frame All, then front/side/back views. Save manual work under a new filename
before sculpting; the setup script deliberately rebuilds the neutral handoff.
Interactive editor use has not itself been driven/tested by the agent.

The workspace README contains exact commands for reference extraction, the real
Blender API smoke test, neutral build, saved-file verification, CPU reference
rendering and focused tests. All headless Blender invocations use
`--python-exit-code 1` so Python assertion failures produce a failing process.
No production application must be running and no real device data is involved.

## 7. Executed verification

- Official checksum, mounted-DMG validation, source/copied-app codesign and
  Gatekeeper: passed. DMG safely unmounted after copy/verification.
- Blender Python/glTF API smoke: passed, exit 0, actual export and import.
- Neutral build and independent `.blend` reopen verification: passed, exit 0.
- CPU reference rendering: five images, exit 0; all visually inspected.
- Focused `python3 -B -m unittest discover -s experiments/avs-growth-6b1b/scripts -p 'test_*.py' -v`:
  **8 passed, 0 failed**. Deterministic reference extraction, baseline bytes,
  finite buffers/index hashes, reversible coordinates, unique source correspondence,
  actual build/reopen evidence, actual API fixture and no athlete morph export.
- Existing `cd my-app && npm test`: **578 passed, 0 failed**, exit 0.
- Existing `npm run typecheck`, `npm run lint`, `npm run asset:verify`: passed,
  exit 0. No type/lint warnings; original asset hash retained.
- Final SHA-256 comparison of **235 protected production/accepted-Lab/prior-audit
  files**: **zero changed**, saved in `validation/production-immutability.json`.
- `git diff --check`: passed. Python syntax/new-file whitespace checks passed;
  the local Blender binary is confirmed ignored by Git. `artifact-hashes.json`
  inventories the delivered experimental files, not a promise of byte-identical
  Blender project/render output across machines.

Not executed/claimed: actual athlete morph finite deltas, target naming/order,
neutral restoration under morph influence, anatomical region isolation, developed
symmetry/limb lengths, garment intersections, deterministic athlete morph export,
Khronos validation, native morph rendering or iPhone testing. No such athlete target
exists. Neutral tests and the synthetic triangle are not substitutes.

No Expo export/browser regression rerun was needed for this authoring-only workspace:
no application code, runtime asset, dependency or configuration changed. Prior
runtime reports remain separately dated evidence, not new runs here. The first
sandbox Blender crash is retained alongside the successful ordinary-process logs;
it is not hidden by the later pass.

## 8. Created/updated files and next gate

- `.tools/Blender.app`: approved local tool, ignored by Git.
- `scripts/prepare_reference.py`, `api_smoke.py`, `build_neutral.py`,
  `render_reference.py`, `test_reference.py`.
- `references/`: immutable neutral copy/arrays plus component rights/provenance.
- `blend/neutral-handoff.blend`: actual neutral editing project.
- `validation/`: install/checksum/signature evidence, API fixture/logs, reconstruction,
  reopen/test evidence, reference hashes and initial sandbox crash.
- `evidence/`: five unreviewed reference images.
- Updated workspace README, added manual authoring handoff and this report.
- `exports/` has no athlete GLB.

**CONDITIONAL GO** means the environment and neutral handoff are ready for actual
regional selection and sculpt review. Full GO still requires an approved local
upper-arm endpoint, matched garment fit, deterministic valid morph GLB and genuine
fixed-view comparison evidence. Phase 6B.2 additionally requires a separately
verified isolated morph viewer/native acceptance before production consideration.
No Growth/OVR/Player Card/SHOP/Rewards/Career/Match/Season/persistence/viewer logic or
production model has changed. No six-region system or Phase 6B.2 was started.
