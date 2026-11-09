const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const { audit, inspect } = require("./inspect.cjs");
test("verified production and Lab bytes have the same CC0 asset hash", () => {
  const a = audit();
  assert.equal(
    a.sha256,
    "4b655504291c7389994b8d3e420744405a21fbb71fde2e20f318880aee849cfc",
  );
  assert.equal(a.bytes, 563184);
});
test("actual runtime asset has static sibling meshes, no skeleton, animation, skin weights or morphs", () => {
  const a = audit();
  assert.equal(a.skinCount, 0);
  assert.equal(a.animationCount, 0);
  assert.deepEqual(a.sceneRoots, [0, 1, 2]);
  assert.ok(a.nodes.every((n) => !n.children && !("skin" in n)));
  assert.equal(a.meshes.length, 3);
  for (const m of a.meshes)
    for (const p of m.primitives) {
      assert.deepEqual(p.attributes, ["NORMAL", "POSITION"]);
      assert.equal(p.morphTargets, 0);
    }
});
test("finite indexed geometry is locally complete and preserves baseline counts", () => {
  const a = audit();
  assert.equal(a.hasExternalBuffers, false);
  assert.equal(a.textureCount, 0);
  assert.deepEqual(
    a.meshes.map((m) => m.primitives[0].vertices),
    [13380, 1503, 748],
  );
  assert.equal(
    a.meshes.flatMap((m) => m.primitives).reduce((s, p) => s + p.triangles, 0),
    30815,
  );
  for (const m of a.meshes)
    for (const p of m.primitives) assert.equal(p.exactlyDegenerateTriangles, 0);
});
test("authoring rig/global target exists only as upstream evidence, not runtime six-region controls", () => {
  const a = audit();
  assert.equal(a.source.boneCount, 163);
  assert.equal(a.source.weightGroupCount, 139);
  assert.deepEqual(Object.values(a.source.targets), [0, 6825]);
});
test("audit is repeatable and does not mutate its input buffer", () => {
  const b = fs.readFileSync(
    path.resolve(__dirname, "../../avs-6a/assets/athlete.glb"),
  );
  const before = Buffer.from(b);
  assert.deepEqual(inspect(b), inspect(b));
  assert.deepEqual(b, before);
});
test("truncated or invalid model evidence fails instead of inventing a rig", () => {
  assert.throws(() => inspect(Buffer.alloc(30)), /header/);
});

test("audit invokes no filesystem mutation or gameplay module", () => {
  const source = fs.readFileSync(path.join(__dirname, "inspect.cjs"), "utf8");
  assert.doesNotMatch(
    source,
    /writeFile|appendFile|unlink|mkdir|rename|useGrowth|player-repository|AsyncStorage|localStorage/,
  );
  const original = fs.writeFileSync;
  fs.writeFileSync = () => assert.fail("audit must be read only");
  try {
    audit();
  } finally {
    fs.writeFileSync = original;
  }
});
