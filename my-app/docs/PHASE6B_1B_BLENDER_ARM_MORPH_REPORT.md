# Phase 6B.1B — Blender Setup & First Arm Morph Authoring

Date: 2026-11-04 (America/Vancouver).
Status: **WAITING FOR EXPLICIT INSTALLATION APPROVAL — authoring not started.**
No full GO/Blender readiness claim is made. Phase 6B.2 has not started.

## Current environment and installation gate

Read `AGENTS.md` and its required Expo reference, the 6B.1 and 6B.1A reports,
existing audit evidence, converter and component provenance before setup.

Measured environment:

- macOS 14.8.9, build 23J631; `uname -m`: `x86_64`.
- Intel UHD Graphics 617; system profiler reports Metal support. The exact Blender
  runtime/renderer capability is not verified by that label.
- No Blender executable on PATH or in the checked system/user Applications,
  `/usr/local/bin` and `/opt/homebrew/bin` locations. Python `bpy` is absent.
- All eight original MakeHuman source hashes still match pinned provenance.
- Existing GLB SHA-256 remains
  `4b655504291c7389994b8d3e420744405a21fbb71fde2e20f318880aee849cfc`.

The official Blender requirements identify **4.5 LTS as the last macOS Intel
release line**. Therefore do not use a current Apple-Silicon-only installer.
[Official requirements](https://www.blender.org/download/requirements/).

The official release index lists stable **4.5.15**, released October 22, 2026,
with `blender-4.5.15-macos-x64.dmg` (340,111,721 bytes, about 324 MiB) and a
matching SHA-256 manifest. This is the proposed pinned package, not yet fetched.
[Official release index](https://download.blender.org/release/Blender4.5/).

The user's specification explicitly requires: “Request explicit approval before
downloading, installing, or making system-wide changes.” The approval gate remains
required even for the proposed non-system installation. No Blender binary or
installer has been downloaded, mounted, copied or executed.

## Concrete proposed operation for approval

1. Download only the official package from
   `https://download.blender.org/release/Blender4.5/blender-4.5.15-macos-x64.dmg`
   and the same release's `blender-4.5.15.sha256` into
   `/tmp/ascend-blender-4.5.15/`.
2. Require an exact checksum match, then mount the DMG read-only.
3. Copy `Blender.app` into
   `/Users/tonosaki/Desktop/PF/ASCEND/experiments/avs-growth-6b1b/.tools/Blender.app`.
   This is a project-local tool, not an `/Applications` install, Homebrew change,
   production npm dependency or PATH modification. `.tools/` is ignored by Git.
4. Verify the application signature/Gatekeeper assessment. Do not remove quarantine,
   disable security checks or bypass a rejected signature. Unmount the DMG.
5. Run its actual executable with factory startup/background mode, recording
   `bpy.app.version_string`, binary/build information and glTF import/export
   operator availability. Run a small temporary mesh/shape-key roundtrip in the
   experiment before reconstructing the athlete. Do not infer Python API success
   from a downloaded file or `--version` alone.

This proposal requires no production file/data changes. Successful setup would
establish authoring capability only; it would not approve a muscle sculpt.

## Manual installation alternative

If the user prefers to install manually, obtain the **macOS Intel** 4.5.15 DMG
and checksum manifest from the official release index above. In Terminal:

```sh
shasum -a 256 /path/to/blender-4.5.15-macos-x64.dmg
```

Compare the entire digest with the matching filename's entry in the official
manifest. Open the verified DMG and copy Blender into the project-local `.tools`
destination above, or choose a user Applications location and report its actual
path. Respect macOS signature/security prompts; do not bypass a rejection.

After installation, the intended verification command is:

```sh
"/Users/tonosaki/Desktop/PF/ASCEND/experiments/avs-growth-6b1b/.tools/Blender.app/Contents/MacOS/Blender" \
  --background --factory-startup \
  --python-expr "import bpy; print(bpy.app.version_string); print(bpy.ops.import_scene.gltf.get_rna_type().identifier); print(bpy.ops.export_scene.gltf.get_rna_type().identifier)"
```

This command has **not** been executed because the executable is absent. An
editable project opening command cannot yet be supplied: no `.blend` exists.

## Ordered work remaining after approval

1. Verify executable, bundled Python and glTF operators as above.
2. Create scripts/references/blend/exports/validation/evidence directories. Extract
   exact neutral POSITION/NORMAL/index arrays, materials and immutable hashes for
   all three accepted GLB meshes. Reuse 6B.1A's source-ID mapping for the body.
   Reconstruct Blender meshes with explicit ID attributes and documented reversible
   coordinate conversion. Compare exported reference coordinates/order to the
   accepted Float32 arrays, not visual similarity. Add only neutral `Basis` first.
3. Produce inspectable candidate region views and supporting weight overlays,
   explicitly labeled **unreviewed**. Obtain/perform a defensible topology and
   anatomical review for biceps/triceps, deltoid/elbow transition bands and protected
   anchors. Skin influences alone cannot pass that gate. If it fails, deliver the
   editable neutral handoff and manual region/sculpt instructions rather than a
   falsely complete `upper_arm_development` channel.
4. Only after region approval, author a modest endpoint at identical topology/order;
   check symmetry, protected regions, length/height and normals. Test top armhole
   clearance and any required matching garment corrective at intermediate values.
5. Only after geometry and visual quality gates, export a deterministic named-target
   experimental GLB, validate its actual accessors/buffers and produce fixed-view
   0/.5/1/restored0 comparisons. No production import or replacement is authorized.

Human review must assess selected anatomical boundaries, plausible biceps/triceps
volume, smooth shoulder/elbow transitions and garment fit. A generated mathematical
field or a functioning Blender executable cannot substitute for that review. The
minimum region/source-ID/anchor/pairing and artifact contract remains in the 6B.1A
report; no new calibration or six-region mapping is introduced here.

## Actual results, files and limitations

Created this pending report plus isolated workspace README and `.gitignore` only.
Read-only environment/provenance checks succeeded. Production code, GLB, previous
experiments, dependencies and saved data were not changed.

Not run in this setup-gate turn: Blender Python/glTF tests, neutral reconstruction
in Blender, shape-key generation, morph geometry tests, garment collision tests,
deterministic morph export, rendered visual comparisons, full ASCEND unit/type/lint
suite, browser checks or native tests. No executable or authored morph exists and
no application code changed. Earlier reports' test results are not new runs here.

Recommendation: **approval pending** for the concrete setup above. Authoring and
the eventual GO/CONDITIONAL GO/NO-GO decision remain open. Do not start Phase 6B.2.
