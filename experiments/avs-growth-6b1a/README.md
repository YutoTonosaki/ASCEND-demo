# Upper-arm authoring investigation — blocked at the art gate

No morph, GLB, Blender file, renderer or gameplay mapping is produced here.
The available global muscle target and joint weights do not establish a defensible
upper-arm muscle boundary. See the detailed handoff in
`my-app/docs/PHASE6B_1A_ARM_MORPH_AUTHORING_REPORT.md`.

Run from the repository root, without installing packages:

```sh
python3 -B experiments/avs-growth-6b1a/audit/source_audit.py
python3 -B -m unittest discover -s experiments/avs-growth-6b1a/audit -p 'test_*.py' -v
```

The audit writes JSON to stdout only. `audit/evidence.json` is its saved output,
including the sorted MakeHuman source IDs for the existing body vertex order.
It is reference data, **not** a muscle mask or morph. Checksums are pinned; a
changed converter/source/asset requires explicit review before replay.

The audit compiles only the reviewed converter's neutral preparation prefix through
normal generation, with the garment/export/write statements excluded. It never
calls the original complete `prepare()` or imports ASCEND runtime/repositories.
No original asset is regenerated. The generated neutral positions, normals and
indices are compared as Float32/UInt16 bytes against the accepted GLB.

The tests verify evidence/correspondence and read isolation. They do not verify a
nonexistent target's symmetry, regional isolation, garment fit or anatomy.
Phase 6B.1A asset authoring remains incomplete; Phase 6B.2 is not ready.
