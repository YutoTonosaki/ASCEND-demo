# Blender authoring workspace — neutral handoff ready, sculpt approval missing

The user approved project-local Blender 4.5.15 Intel installation. SHA-256,
codesign and Gatekeeper verification passed. Headless Python/glTF tests, neutral
reconstruction and saved `.blend` reopen checks passed. No athlete development
morph or experimental athlete GLB has been authored. See
`my-app/docs/PHASE6B_1B_BLENDER_ARM_MORPH_REPORT.md` and `MANUAL_AUTHORING.md`.

Layout:

```
.tools/       local official Blender.app (untracked)
scripts/      setup, correspondence, validation and evidence scripts
references/   immutable baseline arrays and source-ID mapping
blend/        editable neutral and reviewed shape-key projects
exports/      approved experimental GLBs only
validation/   measured geometry/provenance results
evidence/     fixed-view selection and shape comparisons
```

`references/accepted-neutral.glb` is an unchanged baseline copy.
`validation/api-test-triangle.glb` is a three-vertex API fixture, not an athlete
growth asset. `exports/` intentionally has no GLB. The reference images' red
heatmap is explicitly UNREVIEWED joint influence, not an anatomical muscle mask.

Run from the repository root after installation:

```sh
python3 -B experiments/avs-growth-6b1b/scripts/prepare_reference.py
experiments/avs-growth-6b1b/.tools/Blender.app/Contents/MacOS/Blender \
  --background --factory-startup --python-exit-code 1 \
  --python experiments/avs-growth-6b1b/scripts/api_smoke.py
experiments/avs-growth-6b1b/.tools/Blender.app/Contents/MacOS/Blender \
  --background --factory-startup --python-exit-code 1 \
  --python experiments/avs-growth-6b1b/scripts/build_neutral.py
experiments/avs-growth-6b1b/.tools/Blender.app/Contents/MacOS/Blender \
  --background --factory-startup experiments/avs-growth-6b1b/blend/neutral-handoff.blend \
  --python-exit-code 1 --python experiments/avs-growth-6b1b/scripts/build_neutral.py \
  -- --verify-only
experiments/avs-growth-6b1b/.tools/Blender.app/Contents/MacOS/Blender \
  --background --factory-startup experiments/avs-growth-6b1b/blend/neutral-handoff.blend \
  --python-exit-code 1 --python experiments/avs-growth-6b1b/scripts/render_reference.py
python3 -B -m unittest discover -s experiments/avs-growth-6b1b/scripts -p 'test_*.py' -v
```

Use `BLENDER_USER_CONFIG` pointing to `.tools/user-config` if isolating editor
preferences. Blender must execute in the normal macOS process environment: this
agent's default sandbox crashed in Metal capability detection before Python, while
the approved ordinary execution succeeded. No security protections were disabled.

Do not rebuild over a manually sculpted working project; `build_neutral.py` writes
`blend/neutral-handoff.blend`. Save artist work separately. Original ASCEND assets
and accepted AVS viewer are unchanged. The next gate is actual anatomical region
review/sculpting and garment validation, not Phase 6B.2.
