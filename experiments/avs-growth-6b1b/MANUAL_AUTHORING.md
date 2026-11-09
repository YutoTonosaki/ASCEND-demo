# Neutral handoff — anatomical selection gate remains open

This project is not an approved upper-arm sculpt. No athlete development target
has been generated. The `TEST_ONLY_triangle` GLB in validation is only an API test.

## Open the handoff (after the build has succeeded)

From the repository root:

```sh
experiments/avs-growth-6b1b/.tools/Blender.app/Contents/MacOS/Blender \
  --factory-startup experiments/avs-growth-6b1b/blend/neutral-handoff.blend
```

Do not run this command as an instruction to alter macOS security settings. The
binary must have passed the recorded signature/Gatekeeper checks first.

## What the scene contains

- Exact neutral body, top and shorts as separate objects, with original PBR values.
- One `Basis` per object; no authored development key.
- `baseline_index` on each mesh, `makehuman_source_id` on body, and original normals
  in a `baseline_normal` point attribute. Do not delete/reorder these attributes.
- Body vertex groups prefixed `REF_joint_influence_`, copied from licensed source
  weights through the verified ID map. These are **not** muscle masks or approved
  selections. A heatmap in evidence shows their support only.
- Blender coordinates `(x,-z,y)` from glTF `(x,y,z)`; reverse `(x,z,-y)`.
  Default geometry export/import behavior is not the authoritative neutral buffer.

## Manual review and authoring operations

1. Save a separate working copy. Select `athlete-body`, open Object Data → Vertex
   Groups. Inspect upperarm01/02 L/R influence groups individually in Weight Paint
   and Edit Mode. Compare lowerarm01 references; observe influence spill into joints.
   Do not rename a REF group to imply reviewed biceps/triceps anatomy. Use Home
   (Frame All) and front/side/back viewport views to frame the reconstructed model.
2. An anatomy-capable reviewer must select actual upper-arm biceps/triceps volume
   zones, deltoid/elbow transition bands and protected landmarks. Create new groups
   prefixed `REVIEW_` for the proposal. Record source IDs, weights, references and
   approval rationale in `validation/region-review.json`; the reviewer must supply
   their name/date and clearly distinguish proposal from approval. No review JSON
   with invented approval is shipped here.
3. Mark protected face, torso, hands, forearms, legs and shoulder/elbow/wrist anchor
   references. Verify mirrored pairing topologically; a geometric near-neighbor or
   identical bone name is not sufficient. Review transitions front/side/back and
   obliquely before committing a mask. If no credible region can be selected, stop.
4. Only after approval: with Basis unchanged, add one relative Shape Key using the
   `+` control and name it `upper_arm_development`. Set range 0–1, relative to Basis.
   Sculpt a modest endpoint in that key. Disable Dynamic Topology/remeshing; do not
   merge, subdivide, decimate, apply geometry-changing modifiers or alter indices.
   Keep protected vertex positions unchanged and preserve limb axes/length anchors.
   A plausible endpoint requires actual inspection of biceps/triceps contour; do
   not use whole-arm scaling or a restricted global-muscle-target multiplication.
5. Review left/right **deltas** and baseline asymmetry separately. Approve numerical
   tolerances with rationale (6B.1A proposed 1e-5 art units for mirrored residual,
   not an already met anatomical rule). Review normals and triangle orientation.
6. Show top/shorts while sampling 0/.25/.5/.75/1 and sweeping 101 values. Use a
   wireframe/transparent inspection mode only to reveal contacts, never conceal
   them in evidence. Resolve armhole interference with a matched top corrective
   at the same channel index, preserving its own 1,503-vertex topology. Record
   baseline contacts separately. No whole-garment inflation or changed camera is
   an acceptable fix. Unresolved visible penetration blocks export.
7. Export approved endpoint coordinates by saved IDs and subtract the authoritative
   external neutral, not another Blender roundtrip. Generate consistent normal
   deltas with a pinned algorithm; retain neutral/index bytes. Verify complete
   target accessors and glTF semantics before a new GLB is eligible for preview.
8. Capture neutral/.5/1/restored0 with locked camera/light/scale, full front/side/back
   and shoulder/elbow closeups. Record both objective checks and separate anatomy/
   garment review. Never label automatic geometry as artist-approved without review.

## Required acceptance artifacts still missing

Approved region mask/pairing/anchors; actual sculpted endpoint and normal deltas;
garment clearance/corrective evidence; deterministic morph writer and direct binary
validation; fixed-view morph comparison; native iPhone morph testing. This handoff
does not authorize Phase 6B.2 or any production integration.
