# Phase 6B.1 — 3D Body Growth Feasibility & Architecture

Date: 2026-11-03 (America/Vancouver).
Recommendation: **CONDITIONAL GO for the architecture; NO-GO for a regional-growth
viewer using the current asset as-is. Asset authoring is the blocking prerequisite.**

The user confirms Phase 6A.5 physical iPhone acceptance: real model, controls,
open/close/background recovery and existing data all work. This supersedes the
previous timeout report's acceptance state; it is user-reported evidence, not a new
agent device test. Baseline rendering does not establish deformed-model quality
or native morph performance. Production ASCEND and the working Lab are unchanged.
Phase 6B.2 is NOT started.

## 1. Actual model and pipeline audit

Read AGENTS.md and its required SDK reference before writing. Inspected binary GLB
JSON/BIN, hierarchy/accessors/indices/materials, source OBJ/targets/rig/weights,
converter, installed Three/Fiber paths, AVS lifecycle/camera and Growth interfaces.
No external asset is selected, downloaded or integrated; no dependency is installed.

A reproducible read-only inspector and seven evidence tests are isolated under
`experiments/avs-growth-6b1/audit/`. `evidence.json` is machine evidence, not a new
asset or a deformation prototype. All paths below are repository-relative.

Production `my-app/assets/avs/athlete.glb` equals the Lab's
`experiments/avs-6a/assets/athlete.glb` byte for byte:

- 563,184 bytes; SHA-256
  `4b655504291c7389994b8d3e420744405a21fbb71fde2e20f318880aee849cfc`.
- Three sibling nodes in one scene, no bone hierarchy or transform animation.
- No `skins`, node skin bindings, JOINTS/WEIGHTS attributes, inverse bind matrices,
  primitive morph `targets`, morph weights or runtime animation clips.
- Every primitive has only Float32 POSITION/NORMAL and UInt16 indices. No UVs,
  tangents, vertex colors, six-region masks or clothing correspondence attributes.
- Nominal Y-up 1.8 model units, facing +Z; arm pose is baked into positions.
  This is art scale, not a user measurement.

| Mesh / material | Vertices | Triangles | Index boundary edges |
| --------------- | -------: | --------: | -------------------: |
| athlete-body    |   13,380 |    26,756 |                    0 |
| training-top    |    1,503 |     2,736 |                  270 |
| training-shorts |      748 |     1,323 |                  175 |
| Total           |   15,631 |    30,815 |                    — |

Positions/normals are finite, indices in range; exact zero-area triangles and
edges used by >2 triangles were not detected. These index-incidence checks do
**not** certify anatomical topology, vertex manifoldness, self-intersection freedom
or deformed garment fit. Open garment boundaries are expected cuts, not proof of a
fault. The body is one mesh/material, not six anatomically segmented meshes.

Materials are constant-color metallic/roughness PBR (metallic 0, roughness .78),
with no images/textures. Garments are double-sided single surfaces, not simulated
fabric or volumes. The body material is single-sided. There is no anatomical
muscle mesh hidden under the clothing.

### What the source does and does not preserve

`experiments/avs-6a/tools/prepare-asset.py:prepare`, nested `garment` and `mesh`:

1. Reads body-group OBJ faces and applies the adult source shape.
2. Bakes .65 average + .35 maximum-muscle authoring weights. Average-muscle target
   has **0 displacement rows**; the global maximum-muscle target has **6,825**.
   These are existing authoring data, not Growth ratings or six regional targets.
3. Uses the original CC0 rig (163 bones) and skin-weight file (139 weight groups)
   to rotate arm descendants, then exports only the resulting positions/normals.
4. Remaps body vertex indices and clips triangles into top/shorts. Apparel uses
   interpolated cut vertices and normal offsets .006/.009 art units.
5. Writes three static meshes. Source vertex IDs, barycentric cut correspondence,
   bone weights, rig, rest/bind transforms and morph channels are not exported.

Having source bones does not make the GLB rigged. Bone groups describe joint
influence, not verified pectoral/deltoid/upper-back muscle masks; `breast.L/R` is
not evidence of a pectoral growth target. Rebuilding different global muscle blends
is possible offline, but does not create independent six-region controls. Garment
clipping/remapping can change correspondence; independently regenerated files
must not be treated as compatible morph buffers merely because they look related.
Do not bind original rest skeleton matrices directly to already posed vertices.

## 2. Four approaches compared

This table is an engineering assessment from the audited data and format/runtime
capabilities, not anatomical validation.

| Approach                         | Anatomical/regional quality                                                                                                                                                                          | Clothing and animation                                                                                                                              | Mobile / asset cost                                                                                                             | Verdict                                                                                                                       |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| A. Authored morph targets        | Artist-approved local volume, continuity and proportions; six channels plus optional corrective combinations. Quality depends on authored endpoints, not interpolation alone.                        | Matching target semantics/deltas on garments; rigged mesh can later combine shape and skeletal animation, with pose/shape correctives where needed. | GPU path; adds delta arrays, morph textures and shader work. Preserve vertex order and bound active targets.                    | Recommended primary architecture after authoring. Current GLB has no targets.                                                 |
| B. Bone scaling                  | Low-cost broad proportions, but bone influence is not a muscle-volume map. Scaling around joints can change limb lengths, shoulder sockets, elbow/knee shape and motion.                             | Can keep shared-weight garments roughly aligned, but bind-pose/scale/shear and animation interactions require corrective art.                       | Small transform data; skinning cost and bone palettes still matter.                                                             | Not the primary muscle-growth method. Current runtime has no bones. Future stable animation rig should retain lengths.        |
| C. Procedural vertex deformation | Smooth bounded fields can be reversible, but need authored/validated region masks and local anatomical frames. Coordinate boxes or height thresholds cannot establish muscle identity or safe seams. | Body and garments need the same validated deformation/correspondence; recompute normals/bounds. Post-skin fields are harder to animate safely.      | CPU O(vertices) plus buffer uploads per edit, or custom GPU shader with extra validation/maintenance. No need for an idle loop. | Viable authoring/research tool later. No supported six-region mask/binding exists now, so no guessed vertex bulging is built. |
| D. Discrete authored variants    | Good curated silhouettes at each endpoint; abrupt swaps without compatible interpolation.                                                                                                            | Every clothing/style/rig combination must fit each variant. Same rig/topology helps reuse; does not follow automatically.                           | Several full assets and load/cache peaks. Global stages are simple; independently combining six regions becomes costly.         | Useful LOD/style/reference option, not the scalable main six-channel system.                                                  |

For D, binary choices for six independent regions can require up to 64 combined
shapes if represented exclusively as whole-body variants. This is a combinatorial
illustration, not a claim all variants must be shipped. Global weak/strong variants
alone cannot demonstrate independent region control.

Three's Mesh exposes morphTargetDictionary/influences only when geometry has morphs;
BufferGeometry stores morph attributes and relative deltas. glTF defines both morph
and skin data. These support A, but do not manufacture art or prove iPhone support.
[Mesh](https://threejs.org/docs/pages/Mesh.html),
[BufferGeometry](https://threejs.org/docs/pages/BufferGeometry.html),
[glTF morph targets / skins](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#meshes-morph-targets).

Installed code also confirms support in Three 0.186.1:
`examples/jsm/loaders/GLTFLoader.js:addMorphTargets`, `GLTFParser.loadMesh/loadSkin`,
`src/objects/Mesh.js:updateMorphTargets`,
`src/renderers/webgl/WebGLMorphtargets.js:update`. Existing Fiber 9.8.2 can expose
these Three objects; no additional native package is indicated for an eventual
morph spike. Expo GL/iPhone morph shader capability still needs device testing.

## 3. Recommended separation

Use **authored regional morphs plus a stable animation rig**, with replaceable
appearance assets and explicit garment support. For the next fixed-pose experiment,
a morph-equipped derivative is sufficient; a runtime skeleton is not mandatory
until exercising animation. It should not be assumed present or silently invented.

Proposed presentation-only flow (not implemented):

```
validated saved ratings + assessment statuses (read-only input)
    → versioned pure VisualParameterMapper
    → six normalized semantic controls
    → per-asset MorphBindingProfile + shape/corrective blend limits
    → body and supported garment influences applied together
    → existing isolated AVS renderer / camera / lifecycle
```

- Growth remains authoritative. `my-app/src/growth/domain.ts:overall` is unchanged;
  fractional `GrowthPlayer.ratings/status` remain in `types/growth.ts`.
- A future production adapter may read `useGrowth().data.player`. It must not call
  PlayerRepository.initialize/reconcile, Provider.retry, PR calculation or rewards.
  `PlayerRepository.load` returns detached validated values; avoid adding another
  repository reader when the already hydrated context suffices.
- The pure mapper takes plain inputs, no repository imports, callbacks, IDs used
  as transactions, clock, randomness or writes. Rendering never writes back.
- Avatar appearance owns geometry/material/rig identity and a versioned binding
  manifest. Semantic Chest does not equal a hard-coded vertex range or bone name.
- Animation owns clips, skeleton compatibility/retargeting and pose. Shape channels
  must remain independent from action clips unless intentionally combined by a
  tested adapter. Style replacement supplies new art bindings for the same semantic
  visual controls; coefficients are not assumed universal between models.
- Clothing is a supported body/rig/shape-profile relationship, not generic parenting.
  Missing/invalid garment targets must block the experimental combination; never
  stretch only the body and call the resulting intersections acceptable.
- No visual state belongs in Player/Rewards/Shop/Career/Season or presentation-ledger
  schemas. Future calibration revisions may change appearance and need a deliberate
  content policy; they cannot recompute saved progression.

## 4. Six-region mapping proposal — not finalized

Use the existing canonical keys Chest, Back, Shoulders, Arms, Core, Legs. Inputs
are fractional values, not displayed integers or OVR. Labels may be localized;
keys and saved values do not change. Missing/uninitialized/corrupt inputs produce
an unavailable visual-growth state, not fabricated ratings.

| Channel   | Intended authored effect            | Protected areas / review                                              |
| --------- | ----------------------------------- | --------------------------------------------------------------------- |
| Chest     | Pectoral volume/contour             | Neck, sternum continuity, armpit, shoulder joint and top fit          |
| Back      | Upper-back width and thickness      | Spine continuity, scapular/shoulder movement, no whole torso scaling  |
| Shoulders | Deltoid cap                         | Clavicle/upper-arm transitions, sockets, no longer bones              |
| Arms      | Upper-arm volume                    | Elbow/wrist/hand size, biceps/triceps contour, no uniform arm stretch |
| Core      | Bounded trunk/abdominal development | Rib/pelvis joins; no inferred fat loss or promise of visible abs      |
| Legs      | Thigh/calf development              | Hip/knee/ankle transitions and shorts fit; preserve leg length        |

Candidate curve for later evaluation, **not committed product calibration**:

```
if status is provisional: p = 0 (neutral art, no inferred development)
otherwise require a finite rating in [0,99]
t = clamp((rating - L) / (U - L), 0, 1)
p = t*t*(3 - 2*t)
```

Illustrative L=45, U=99 uses the current neutral/provisional game starting point,
not physiology. Then 45→0, 60→~.189, 75→~.583, 90→~.926, 99→1; below 45 stays
neutral. The existing model is already moderately athletic: p=0 is its neutral
art, **not** a statement that the user has no muscle. This draft would intentionally
not shrink a provisional body after a lower first assessment. Other baseline anchors
must be evaluated against actual authored shapes and product intent before adoption.

The physical displacement at p=1 is determined by an approved **modest** shape, not
by multiplying the whole athlete's scale. Rating 99 never implies extreme size,
body-fat percentage, medical capacity or measured muscle mass. Separate per-region
anchors/curve choices may be necessary after visual calibration; no arbitrary
centimeter or circumference gains are assigned here.

Calibration gate: review baseline/mid/end at fixed camera and lighting, the same
rating increments, six isolated channels and combined extremes; quantify garment
clearance and unchanged joint/head/hand/foot/bone lengths. Test all-provisional,
first assessment, values 0/40/45/60/75/90/99, fractional boundaries and actual small
Growth increments. Determine whether normal fractional progress is perceptible over
an appropriate period without falsely promising a visible change every workout.
No mapping code or finalized thresholds are installed in either app in this phase.

## 5. Asset gate and why no deformation prototype was built

**STOP condition reached.** The current file is renderable but not deformation-ready.
Topology positions alone do not provide validated muscle fields. A rig is not a
prerequisite for all vertex edits; the blocker is missing approved regional shapes/
masks and garment correspondence, not a mathematical inability to move vertices.
All four approaches need new authoring or asset preparation to meet this brief.

No fake morph target, guessed anatomical mask, whole-model scaling trick, shader
illusion or static image substitute is created. There is no baseline/developed
visual comparison and no anatomical-growth screenshot. The machine audit is the
reproducible evidence; existing fixed-pose rendering is only a baseline regression.
A numeric-only parameter UI would not satisfy the requested anatomical prototype,
so no empty Expo project or pretend growth demo is added.

Minimum new authoring work before resuming an isolated visual prototype:

1. Preserve the current neutral body as immutable reference and retain source vertex
   correspondence. Author/review one genuine local upper-arm or pectoral endpoint
   first, with smooth shared-joint falloff and position/normal deltas at identical
   topology/order. No external asset selection is performed here.
2. For chest, supply a matching top target (and any dependent garment) or a reviewed
   conformal/barycentric authoring transfer and cleanup. For arms, preserve sleeveless
   armhole transitions. A body-only morph is not proof of clothed avatar readiness.
3. Export an approved experimental GLB with named morph channels, target ordering,
   baseline weights, bounds and explicit garment bindings. Preserve source rights
   per component. Existing MakeHuman source/ASCEND apparel are CC0 as inventoried;
   this is not permission for arbitrary community clothing.
4. For six regions/future workouts, add a validated neutral-rest rig, inverse binds,
   normalized mobile skin weights and matching garment rig. Restore/export from
   source before pose bake; do not attach original bind matrices to posed geometry.
   Require pose/shape combination review, motion retarget tests and corrective shapes
   if necessary. Face/finger rig complexity is an authoring/budget decision, not
   something to automatically copy into a mobile character.

After approved authoring, the smallest useful spike is one region with 0/.5/1 and
an adjustable amount, baseline toggle, locked framing/lighting, front/side/back,
wireframe/normal and garment/body inspection modes. Restore from immutable morph
baseline; invalidate only on input. No real Player, persistence or production import.
That spike has not been built or claimed in this phase.

## 6. Clothing, mobile cost and lifecycle

The current normal offsets are baseline construction choices, not collision
constraints. Clothing is a separately clipped/remapped mesh; matching vertex indices
or identical deformations cannot be assumed. Changing body vertices alone can poke
through .006/.009 offsets. Re-running cloth cuts for each new shape can change vertex
order/count and therefore is not automatically valid morph authoring. No fitted
clearance under deformation or animation has been certified.

For a fixed topology, six dense POSITION+NORMAL Float32 target sets over all 15,631
vertices would add **2,250,864 bytes (~2.15 MiB)** of raw delta payload before GLB
metadata/compression, without rigs/correctives. One target is 375,144 bytes. This is
an estimate, not a generated morph asset. Sparse authoring/export could affect disk
size; loader expansion, transient arrays and GPU data still need measurement.

Installed WebGLMorphtargets packs attributes into Float32 RGBA array textures.
POSITION+NORMAL nominal packed data is about **3,001,152 bytes (~2.86 MiB)** for
six targets over these meshes, before texture padding. For an illustrative 4096
max texture width it is ~3,184,704 bytes; this is not a measured iPhone capability.
CPU source arrays, packed arrays, GPU copies, shared/duplicate geometry and render
resources increase peak memory beyond raw GLB size. Query actual capabilities and
measure load/reopen peaks, active target limits, shader compile cost and thermal
behavior on device. Do not infer performance from the accepted fixed-pose viewer.

Future ownership should keep verified Phase 6A.5 lazy imports, mount-scoped load
leases/deadlines, frame-based readiness, close/background disposal and late-result
suppression. Keep immutable base/morph buffers and per-instance influence weights;
never mutate a shared GLTF cache. If procedural research is later authorized, derive
each frame from base+delta rather than cumulative edits; update normals/bounds and
validate every result. Morph weights and neutral restoration need not allocate a
new geometry per slider step. Bounds must conservatively contain developed shapes;
comparison uses the same camera so zoom cannot masquerade as growth. Renderer
invalidation happens on changes; no idle animation loop is necessary.

Use the existing single Three ESM resolver / Expo GL / Fiber stack in any later
approved experiment. No new native package is indicated by this audit, but that is
not a guarantee its morph/skin shader path works on all iPhones. Test the real asset,
GL errors, device memory/FPS/load times and background recovery before 6B.2.

## 7. Verification and reproducibility

- Read-only asset audit: **7 tests passed, 0 failed**. Known-byte identity, actual
  absent runtime rig/morph channels, geometry/index counts, finite attributes,
  source-vs-runtime evidence, deterministic immutable reads, invalid input and
  no filesystem mutation/gameplay imports are checked.
- Full existing ASCEND suite: **578 passed, 0 failed**.
- `npm run typecheck`, `npm run lint`, `npm run asset:verify`: passed.
- Expo all-platform export: passed iOS/Android Hermes bundles and 13 static web
  routes at `/tmp/ascend-avs-6b1-baseline-export`. No application code changed.
- Baseline `browser-avs`: passed 390/320px, actual fixed-pose model, controls,
  exact camera reset, close/reopen/background recovery, import/model failure
  containment, EN/JA, enlarged text/reduced motion and unchanged Card/storage.
  This checks the existing viewer only, not growth/morph rendering or native FPS.
  Other legacy browser suites and development Growth Debug were not rerun because
  no application code changed. Existing unit regressions were all run.
- Browser tooling is external `/tmp/avs-finish-qa`; NODE_PATH and
  PLAYWRIGHT_BROWSERS_PATH point there, ASCEND_QA_URL points to the locally served
  export on port 8144. No QA packages were added to either app.
- `node --check` on the isolated audit tool and `git diff --check`: passed.
- SHA-256 snapshot comparison covers production source/assets/config/dependencies
  and Lab source/assets; no protected file changed during this investigation.

No native deformation test exists because no deforming asset/prototype is produced. Parameter bounds, baseline restoration, region isolation,
geometry/morph continuity, garment intersections and animation compatibility cannot
be meaningfully verified on nonexistent targets. They are explicit deferred asset
acceptance tests, not reported as passing. No new mapping test framework is created.

```sh
# repository root — read-only audit, no model generation
node experiments/avs-growth-6b1/audit/inspect.cjs
node --test experiments/avs-growth-6b1/audit/audit.test.cjs
```

Files created only: this report; `experiments/avs-growth-6b1/README.md`,
`audit/inspect.cjs`, `audit/audit.test.cjs`, `audit/evidence.json`. Production source,
configuration/dependencies, GLBs, original Lab and all prior working changes remain
unchanged. User-reported 6A.5 acceptance is recorded here without rewriting the
previous investigation's historical results.

## 8. iPhone applicability and Phase 6B.2 prerequisites

There is **no 6B.1 viewer to launch**, no new Expo QR, and no physical-device growth
or performance PASS. Existing ASCEND can still be used normally without resetting
phone data; no additional real workouts or fabricated growth are needed for this audit.

Before a future prototype iPhone checklist becomes applicable: approve the authoring
brief and experimental derivative; verify component licenses, correspondence,
morph/skin export, garments and conservative bounds; build the isolated one-region
viewer with fake in-memory inputs; pass deterministic mapping/bounds/invalid-input,
zero-restore, isolated/coupled channels, combined extremes, finite/normal/triangle
orientation, asset bytes and zero-write tests. Browser evidence must show actual
local anatomical vertex changes at unchanged camera/lighting plus front/side/back,
amount, restoration, cleanup, failure/retry, small/large text and EN/JA controls.

Only then test that isolated viewer on physical iPhone: real mesh change, no garment
intersections/detachment at all sampled amounts/views, exact neutral return, native
controls/readiness/errors, repeated open/close, background recovery and measured
performance. Preserve real ASCEND data and keep that experiment outside PLAYER.

Final decision: **CONDITIONAL GO** for authored regional morphs with a stable
future animation rig and explicit garment profiles; **NO-GO for deformation from
the existing GLB as-is**. New regional art/correspondence is required. No external
asset is chosen, production model replaced, or Phase 6B.2 implemented.
