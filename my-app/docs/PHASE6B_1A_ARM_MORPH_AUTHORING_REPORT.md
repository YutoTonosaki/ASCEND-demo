# Phase 6B.1A — Regional Arm Morph Asset Authoring

Date: 2026-11-04 (America/Vancouver).

## Decision and actual deliverable

**NO-GO for generating an upper-arm morph from the currently available authoring
inputs. CONDITIONAL GO for a manually authored shape-key workflow after the inputs
below are supplied. Phase 6B.1A asset authoring is NOT complete; Phase 6B.2 is NOT
ready and has not started.**

The reusable neutral geometry has been established more precisely than in 6B.1:
replaying the reviewed source preparation yields byte-identical body positions,
normals and triangle indices. Topology preservation is therefore feasible. The
blocking issue is a reviewed regional sculpt/selection and its clothing fit, not
the ability to write a GLB or expose a slider. No anatomical target, derivative GLB,
`.blend`, preview or comparison screenshots have been fabricated.

The user reports successful physical iPhone acceptance of the existing 6A.5 viewer.
That remains baseline evidence only, not morph quality or native morph performance.
Production code, dependencies, configurations, assets and the accepted Lab remain
unchanged. No external model or dependency was downloaded/installed.

## Inspection and exact source references

Read `my-app/AGENTS.md`, its required versioned Expo reference, the full 6B.1 report
and audit evidence, source licenses/provenance, converter, source mesh/targets/rig,
and existing viewer loading, camera, resource ownership and readiness contracts.
Paths below are repository-relative.

| Source | Finding / use |
| --- | --- |
| `experiments/avs-6a/tools/prepare-asset.py:24`, `prepare()` | Hash-checks source data, builds the established adult shape, bakes arm pose, normalizes height and generates normals. |
| Same file:53–75 | Arm rotation uses the upperarm root and descendant skin weights. These are deformation influences, not biceps/triceps anatomy annotations. |
| Same file:76–89 | Body source IDs, art-space normalization and normals; replay stops here. |
| Same file:92, nested `garment()`; line 122 | Clips body triangles using source height and arm influence. Top cuts .525–.835 / influence .15; shorts .385–.55 / .05. Interpolated cut vertices have their own indices. |
| Same file:146, nested `mesh()` | Sorted used source IDs are remapped to compact indices. Garment normal offsets are .006/.009 model units. |
| Same file:170 | Original asset write; **not executed** by this investigation. |
| `experiments/avs-6a/asset-source/provenance.json` | Eight pinned source files and their individual upstream URLs/checksums. |
| `experiments/avs-6a/ASSET-LICENSE.md` | Component-level rights, original apparel and application-code distinction. |
| `my-app/src/avs/create-scene.tsx`, `viewer-scene.tsx`, `readiness.ts`, `resources.ts`, `camera.ts` | Existing owned model loading, real-frame readiness, cleanup and bounded full-body camera remain unchanged. No morph binding currently exists. |

Both baseline assets (`my-app/assets/avs/athlete.glb` and
`experiments/avs-6a/assets/athlete.glb`) are identical, 563,184 bytes, SHA-256:

`4b655504291c7389994b8d3e420744405a21fbb71fde2e20f318880aee849cfc`.

Converter SHA-256:
`1f4d06c08db15f2826d0d562c9d35c7040173b1b3060fecad87ec074eb6c7711`.

The GLB is three static sibling meshes, no skeleton, skinning attributes, morph
targets, animation, UVs or textures. Body: 13,380 vertices / 26,756 triangles;
top: 1,503 / 2,736; shorts: 748 / 1,323. Material normals and positions are finite,
indices valid. Nominal height 1.8 is an art unit, not a biometric measurement.
No per-vertex biceps/triceps boundary or cloth-to-body binding is embedded.

## Rights and available tools

The pinned official MakeHuman revision is
`a8bc2d54ff0ac92e78ff71431b1023eda42bf482`. The OBJ header and each of the three
target headers explicitly dedicate those assets to CC0. The rig and weights each
declare CC0. `LICENSE.ASSETS.md` retains the legal text. All eight provenance hashes
were checked again. The average-muscle target has no displacement rows; its CC0
header is still relevant. These asset rights allow commercial modification and
redistribution without mandatory attribution; provenance should be retained.

The top, shorts and constant-color materials are original ASCEND CC0 derivatives,
not community clothing. No new texture, garment, animation or external reference
asset was added. MakeHuman application code is AGPL and is not used/copied. Source
rig/weights are licensed asset data. A future sculptor's authored contribution and
any reference images must receive their own recorded rights check; existing CC0
provenance is not permission for arbitrary community assets.

Python 3.11.3 and Node 22.15.0 are available. Blender is absent from PATH and the
checked `/Applications/Blender*.app`, `/opt/homebrew/bin/blender` and
`/usr/local/bin/blender` locations. Python `bpy`, `numpy`, `scipy` and `trimesh` are
absent. This does not claim an exhaustive whole-disk tool search. The existing
stdlib converter/auditor can preserve indices and write binary geometry, but cannot
establish credible muscle anatomy or approve cloth clearance by itself. Installing
Blender alone would not provide the missing reviewed sculpt/region definition.

## New measured feasibility evidence

`experiments/avs-growth-6b1a/audit/source_audit.py` verifies the pinned converter,
extracts its reviewed preparation prefix into a separate AST, and excludes all
garment/export/write code. It does not invoke the original full `prepare()`.
The prefix verifies all eight source hashes and computes the existing neutral
shape/pose/normals. No new muscle blend or regional deformation is generated.

The original OBJ has 19,158 vertices, of which 13,380 belong to the exported body.
The audit stores their sorted source IDs in `audit/evidence.json`. Repacking the
neutral reference gives **exact Float32 POSITION, NORMAL and UInt16 index byte
equality** with the accepted body primitive. This establishes current body vertex
order and a reusable source-ID bridge; it does not establish garment correspondence.

| Measurement | Count |
| --- | ---: |
| Global max-muscle target nonzero source vertices | 6,825 |
| Nonzero source vertices within exported body | 3,911 |
| Body vertices with positive weight in upperarm01/02 L/R union | 1,263 |
| Changed body vertices inside that joint-influence union | 1,201 |
| Changed body vertices outside that union | 2,710 |

The four-group union is a **supporting reference only**, not an approved upper-arm
ROI, biceps/triceps segmentation or a valid growth mask. These numbers prove the
global target is not confined even to that proxy. Multiplying its deltas by those
weights would be a procedural approximation with unreviewed joint boundaries.
It would not satisfy the requested art gate.

The source rig has 163 bones and 139 weight groups. Left/right upperarm01/02 groups
provide useful location hints, but do not prove symmetric vertex correspondence,
muscle origins/insertions, volume quality, limb-length preservation or clean elbow
transitions. No authored mirror pairing/muscle mask was found among the supplied
files. Symmetry has therefore not been certified. Biceps and triceps volumes need
explicit sculpting and review. No coordinate-box mask or entire-arm scale is used.

## Clothing gate

The sleeveless top is clipped/remapped independently and has 270 index-boundary
edges; the shorts have 175. Their single surfaces are double-sided. Existing
normal offsets are construction choices, not clearance guarantees. Upper-arm and
shoulder changes can affect armhole clearance even without directly moving garment
vertices. Neutral appearance cannot approve the developed shape.

No developed endpoint exists, so body/top intersections, armhole gaps and shoulder
continuity are **unvalidated blockers**, not observed defects or passing checks.
There is no justified need yet to deform shorts, but unchanged shorts still require
a clearance check. Regenerating clipped apparel independently at each amount could
change topology and must not be substituted for a matching corrective target.

## Concrete Blender-compatible authoring handoff

This is a proposed procedure, **not an executed Blender session or created asset**.
Use a pinned Blender release (for example 4.5 LTS) with its bundled glTF exporter;
record exact versions and script hashes. Relative shape keys are appropriate for
the intended bounded channel. [Blender shape-key workflow](https://docs.blender.org/manual/en/4.5/animation/shape_keys/workflow.html).

1. Copy the immutable accepted GLB into a new authoring work folder. Record its
   checksum and provenance. Build Blender meshes directly from its position/index
   arrays with an explicit source-ID attribute, including a separate garment index
   space. Track the Y-up → Blender coordinate transform and its inverse. Do not
   assume a normal GLB import/export roundtrip preserves vertex order/normals.
   Preserve the original baseline arrays outside Blender as the export authority.
2. Create `Basis` from the exact neutral body and one relative shape key named
   `upper_arm_development`, neutral value 0, intended range 0–1. Freeze topology:
   no remesh, decimation, subdivision, vertex merge, retopology, changed faces or
   geometry-changing modifier application. Keep a checksum of the baseline buffers.
3. An anatomy-capable character artist must mark both upper arms, biceps/triceps
   volume zones, smooth transition bands, protected deltoid boundary and elbow
   landmarks. Record selections as source IDs and reviewed weights; separately
   record shoulder/elbow/wrist anchors and limb centerline references. Bone weights
   may guide inspection but must not supply automatic approval. Review the brief
   before sculpting. No final Growth-to-size calibration is authorized here.
4. Sculpt a modest athletic endpoint with volume on the upper arm, preserving limb
   endpoints, lengths and unrelated shape. Use move/smooth tools without dynamic
   topology. Review front/side/back silhouettes and oblique views at elbow/shoulder.
   Establish left/right vertex pairing from topology and geometric correspondence,
   manually resolve ambiguous/midline cases, and mirror **deltas**, accounting for
   any baseline asymmetry. Record the pairing and residuals; do not force unrelated
   baseline asymmetry to change. An initial numerical review tolerance of 1e-5
   model units for mirrored delta residual is a proposed gate, not a measured pass.
5. Check the sleeveless top at 0, .25, .5, .75 and 1 plus a sweep of 101 evenly
   spaced amounts. Inspect armhole/shoulder seams close up. Use triangle-intersection
   and signed-clearance diagnostics with documented treatment of the single-sided
   garment surface/boundary; report baseline contacts separately from new contacts.
   Resolve visible intersections with an authored top corrective using the **same
   channel**, neutral topology and its own vertex IDs. Do not add arbitrary large
   offsets, hide body polygons or change camera/scale to conceal defects. If the
   neutral top is already unsuitable, record that as a separate authoring blocker.
6. Extract the artist-approved endpoint via source IDs; subtract the immutable
   baseline once to produce relative POSITION deltas. For NORMAL deltas, define
   and pin a deterministic area-weighted triangle-normal calculation and subtract
   the neutral normals. Do not cumulatively modify buffers. Maintain exact zero
   position deltas outside the reviewed body ROI (including transition band).
   Normal changes on one-ring neighbors may be expected from adjacent triangle
   changes; explicitly record that shading boundary rather than pretending every
   normal outside the position mask must remain zero.
7. Export only into this experiment. Prefer a deterministic writer that retains
   original neutral/index bytes and appends authored target accessors. Set
   `targets[0]` to POSITION/NORMAL deltas, `extras.targetNames` to the one semantic
   name, and default mesh weights to `[0]`. Matching garment targets require the
   same channel index; an unchanged mesh may remain without targets. Do not add a
   runtime rig to this fixed-pose spike. If using Blender's exporter as an
   intermediate, enable morphs/normals and disable animation/skin export when no
   rig exists, quantization, packing and compression. Inspect and remap by verified
   IDs afterward; never assume default exporter ordering preserves the original.
   [Blender 4.5 export API](https://docs.blender.org/api/4.5/bpy.ops.export_scene.html).
8. Validate the resulting binary directly and with Khronos glTF Validator. Compare
   neutral POSITION/NORMAL/index bytes, accessor counts, finite deltas, normal
   lengths, target naming/order and no external dependencies. Generate twice and
   compare SHA-256. Test `base + amount * delta` at 0/.5/1 and repeated 1→0 cycles;
   zero must restore exact baseline buffers. Check no new inverted/degenerate
   triangles, baseline-relative self-intersections, fixed overall height, protected
   anchors/centerline distances and conservative bounds. Bounding boxes alone
   cannot prove limb length preservation or anatomy.
9. Capture fixed-camera, fixed-lighting front/side/back and shoulder/elbow close-up
   evidence at 0/.5/1/restored0, with body+clothing, wireframe and inspection views.
   Include objective clearance/geometry reports and an artist's named review of
   continuity and plausible volume. Numerical gates cannot approve anatomy alone.
   Only after approval should an isolated demand-render preview be built using
   the existing single Three/Fiber stack, with no production/gameplay imports.

### Minimum handoff required to resume

- Pinned Blender/tool version available, plus an anatomy-capable sculpt/review step.
- `upper-arm.blend` with immutable Basis and approved endpoint, topology unchanged.
- Approved body source-ID ROI/transition mask, protected anchors, left/right pairing
  and documented symmetry/length/bounds tolerances with review rationale.
- Position/normal deltas in original body order, and top corrective deltas if needed;
  garment-fit report across the sampled range even if no corrective is necessary.
- Component authorship/license record, references provenance, scripts/settings and
  hash manifest. No unverified community content may enter the derivative.
- Deterministic experimental GLB plus validation output and the fixed-view evidence
  above. An anatomy review and real iPhone morph test remain separate gates.

No new rigged external model is selected. Fixed-pose shape keys can use this mesh;
future animation will additionally require valid rest/bind transforms, compatible
skinning and pose/shape corrective review. Original source skeleton bind matrices
cannot simply be attached to these already posed vertices.

## Performance estimate and runtime boundary

One dense body POSITION+NORMAL Float32 target adds 13,380 × 3 × 4 × 2 = **321,120
bytes** raw payload before metadata/compression. A top corrective adds **36,072
bytes**; shorts, if actually required, **17,952 bytes**. Actual GLB size is unknown
because no target is exported. Sparse on-disk data may reduce payload but does not
guarantee lower decoded/GPU allocation.

The installed Three morph path packs attribute data into RGBA Float32 textures.
Nominal body POSITION+NORMAL storage is **428,160 bytes per target**, plus texture
padding; top adds 48,096 bytes, shorts 23,936. Source arrays, packed CPU arrays,
GPU copies and loader transients add peak overhead. A one-target runtime means
bounded extra vertex work, not a measured frame-rate guarantee. Shader compilation,
texture-array support/limits, normal blending, reopen disposal and iPhone memory
must be measured with the real approved asset.

Preserve demand rendering, lazy imports, real-model-frame readiness, lease/generation
checks, late resource disposal and close/background recovery. Apply weights to
per-instance meshes, not a shared mutable cached neutral. A slider only invalidates
when the amount changes; no continuous idle loop is needed. Keep the existing
single Three ESM resolution. No new native package is justified by this audit.

## Files and verification

Created only:

- `experiments/avs-growth-6b1a/README.md`
- `experiments/avs-growth-6b1a/audit/source_audit.py`
- `experiments/avs-growth-6b1a/audit/test_source_audit.py`
- `experiments/avs-growth-6b1a/audit/evidence.json`
- This report.

Executed checks (all exit 0):

| Command / check | Actual result |
| --- | --- |
| `python3 -B -m unittest discover -s experiments/avs-growth-6b1a/audit -p 'test_*.py' -v` | **7 passed**: exact neutral bytes, unique sorted correspondence, global target scope, all source hashes, deterministic read-only replay, no invented asset/clearance and saved evidence equality. |
| Re-run `source_audit.py` with `PYTHONHASHSEED=1` and `42`, compare stdout using `cmp` | Byte-identical evidence in both processes. This tests the audit, not nonexistent morph generation. |
| `node --test experiments/avs-growth-6b1/audit/audit.test.cjs` | **7 passed**, existing baseline structure/isolation evidence retained. |
| `cd my-app && npm test` | **578 passed, 0 failed**; existing gameplay, persistence, AVS and lifecycle unit regressions. New isolated Python tests are separate, not counted in 578. |
| `cd my-app && npm run typecheck` | Passed. |
| `cd my-app && npm run lint` | Passed, no lint errors/warnings. |
| `cd my-app && npm run asset:verify` | Passed; accepted 563,184-byte GLB/hash/provenance unchanged. |
| SHA-256 comparison of 231 protected files captured before changes | No change to captured production source/assets/root config/dependencies, accepted Lab source/assets or previous 6B.1 workspace. |
| `git diff --check` | Passed. New files also checked for whitespace errors; no tracked production edits. |

Evidence tests do not import gameplay or access live AsyncStorage; the read-only
auditor's file opens were checked for write modes. No device/user storage was
accessed. No application migration, repository call, new package or settings write
was introduced. Existing unrelated untracked `experiments/avs-growth-6b1/` is retained.

**Not executed / not applicable at this gate:** target generation/export, finite
morph deltas, target naming/count/order, zero-influence restoration, developed
symmetry/region isolation, unchanged limb lengths under deformation, clothing
clearance, anatomical review, visual comparison, morph browser rendering and native
iPhone performance. There is no target to test. They are required resumption gates,
not passing tests. Baseline byte equality is not a substitute for these tests.

Expo export and browser suites were not rerun for this source-audit-only change:
no application source/configuration or runtime asset changed and no experimental
renderer exists. The prior 6B.1 report retains its separately dated baseline export
and browser evidence; those results are not presented as new runs here.

No new asset or viewer exists, so native launch instructions are not applicable. Do not reset real
data, alter the device clock, fabricate workout evidence or replace the accepted
athlete to test this blocked authoring investigation.

The asset gate must pass before an isolated morph renderer and iPhone checklist
can be meaningful. Phase 6B.2 remains blocked by approved regional art, garment
fit, deterministic export/visual validation and subsequent native prototype checks.
