const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  crypto = require("node:crypto");
const root = path.join(__dirname, "..");
function verify() {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, "assets/manifest.json")),
  );
  const bytes = fs.readFileSync(path.join(root, "assets/athlete.glb"));
  assert.equal(
    crypto.createHash("sha256").update(bytes).digest("hex"),
    manifest.sha256,
  );
  assert.equal(bytes.readUInt32LE(0), 0x46546c67);
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  const jsonLength = bytes.readUInt32LE(12);
  assert.equal(bytes.readUInt32LE(16), 0x4e4f534a);
  const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
  const binStart = 20 + jsonLength;
  assert.equal(bytes.readUInt32LE(binStart + 4), 0x004e4942);
  const bin = bytes.subarray(binStart + 8);
  assert.ok(!gltf.images && !gltf.textures && !gltf.animations && !gltf.skins);
  assert.equal(gltf.meshes.length, manifest.meshes);
  assert.ok(manifest.triangles < 50000);
  assert.ok(bytes.length < 1_000_000);
  let triangles = 0;
  for (const mesh of gltf.meshes) {
    for (const p of mesh.primitives) {
      const position = gltf.accessors[p.attributes.POSITION],
        normal = gltf.accessors[p.attributes.NORMAL],
        indices = gltf.accessors[p.indices];
      assert.equal(position.count, normal.count);
      assert.ok(position.count > 0);
      assert.equal(indices.count % 3, 0);
      triangles += indices.count / 3;
      for (const a of [position, normal]) {
        const view = gltf.bufferViews[a.bufferView];
        assert.ok(view.byteOffset + view.byteLength <= bin.length);
        for (let i = 0; i < a.count * 3; i++)
          assert.ok(Number.isFinite(bin.readFloatLE(view.byteOffset + i * 4)));
      }
      const view = gltf.bufferViews[indices.bufferView];
      for (let i = 0; i < indices.count; i++)
        assert.ok(bin.readUInt16LE(view.byteOffset + i * 2) < position.count);
    }
  }
  assert.equal(triangles, manifest.triangles);
  const provenance = JSON.parse(
    fs.readFileSync(path.join(root, "asset-source/provenance.json")),
  );
  for (const f of provenance.files) {
    const source = fs.readFileSync(
      path.join(root, "asset-source/makehuman", f.file),
    );
    assert.equal(
      crypto.createHash("sha256").update(source).digest("hex"),
      f.sha256,
    );
  }
  return { manifest, gltf };
}
module.exports = { verify };
if (require.main === module)
  console.log(JSON.stringify(verify().manifest, null, 2));
