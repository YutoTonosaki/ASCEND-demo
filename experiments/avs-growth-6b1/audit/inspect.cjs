// Read-only evidence tool. No model writing, deformation or gameplay dependency.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const ROOT = path.resolve(__dirname, "../../..");
function inspect(bytes) {
  if (
    bytes.length < 28 ||
    bytes.readUInt32LE(0) !== 0x46546c67 ||
    bytes.readUInt32LE(4) !== 2 ||
    bytes.readUInt32LE(8) !== bytes.length
  )
    throw Error("Invalid GLB header");
  const length = bytes.readUInt32LE(12);
  if (bytes.readUInt32LE(16) !== 0x4e4f534a || 20 + length + 8 > bytes.length)
    throw Error("Invalid JSON chunk");
  const gltf = JSON.parse(bytes.subarray(20, 20 + length).toString());
  const start = 20 + length;
  if (bytes.readUInt32LE(start + 4) !== 0x004e4942)
    throw Error("Missing BIN chunk");
  const binLength = bytes.readUInt32LE(start);
  if (start + 8 + binLength !== bytes.length) throw Error("Invalid BIN length");
  const bin = bytes.subarray(start + 8);
  function values(index) {
    const a = gltf.accessors[index],
      v = gltf.bufferViews[a.bufferView];
    if (a.sparse || v.buffer !== 0) throw Error("Unsupported audit accessor");
    const size = { 5123: 2, 5126: 4 }[a.componentType],
      components = { SCALAR: 1, VEC3: 3 }[a.type];
    if (!size || !components) throw Error("Unsupported audit component");
    const offset = (v.byteOffset || 0) + (a.byteOffset || 0),
      stride = v.byteStride || size * components;
    if (offset + (a.count - 1) * stride + size * components > bin.length)
      throw Error("Accessor outside BIN");
    return Array.from({ length: a.count }, (_, i) =>
      Array.from({ length: components }, (_, j) =>
        a.componentType === 5126
          ? bin.readFloatLE(offset + i * stride + j * size)
          : bin.readUInt16LE(offset + i * stride + j * size),
      ),
    );
  }
  const meshes = gltf.meshes.map((mesh) => ({
    name: mesh.name,
    primitives: mesh.primitives.map((p) => {
      const points = values(p.attributes.POSITION),
        normals = values(p.attributes.NORMAL),
        ids = values(p.indices).flat();
      if (
        points.some((p) => p.some((n) => !Number.isFinite(n))) ||
        normals.some((p) => p.some((n) => !Number.isFinite(n)))
      )
        throw Error("Non-finite geometry");
      if (ids.some((i) => i >= points.length) || ids.length % 3)
        throw Error("Invalid indices");
      const edges = new Map();
      let degenerates = 0;
      for (let i = 0; i < ids.length; i += 3) {
        const [a, b, c] = ids.slice(i, i + 3),
          u = points[b].map((n, j) => n - points[a][j]),
          v = points[c].map((n, j) => n - points[a][j]);
        const cross = [
          u[1] * v[2] - u[2] * v[1],
          u[2] * v[0] - u[0] * v[2],
          u[0] * v[1] - u[1] * v[0],
        ];
        if (cross.every((x) => x === 0)) degenerates++;
        for (const [x, y] of [
          [a, b],
          [b, c],
          [c, a],
        ]) {
          const key = x < y ? `${x},${y}` : `${y},${x}`;
          edges.set(key, (edges.get(key) || 0) + 1);
        }
      }
      return {
        attributes: Object.keys(p.attributes).sort(),
        vertices: points.length,
        triangles: ids.length / 3,
        morphTargets: (p.targets || []).length,
        material: gltf.materials[p.material].name,
        materialSettings: gltf.materials[p.material],
        bounds: {
          min: [0, 1, 2].map((j) => Math.min(...points.map((p) => p[j]))),
          max: [0, 1, 2].map((j) => Math.max(...points.map((p) => p[j]))),
        },
        boundaryEdges: [...edges.values()].filter((n) => n === 1).length,
        nonManifoldEdges: [...edges.values()].filter((n) => n > 2).length,
        exactlyDegenerateTriangles: degenerates,
      };
    }),
  }));
  return {
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    bytes: bytes.length,
    nodes: gltf.nodes,
    sceneRoots: gltf.scenes[gltf.scene].nodes,
    skinCount: (gltf.skins || []).length,
    animationCount: (gltf.animations || []).length,
    hasExternalBuffers: gltf.buffers.some((b) => !!b.uri),
    textureCount: (gltf.textures || []).length,
    meshes,
  };
}
function audit() {
  const main = fs.readFileSync(
      path.join(ROOT, "my-app/assets/avs/athlete.glb"),
    ),
    lab = fs.readFileSync(
      path.join(ROOT, "experiments/avs-6a/assets/athlete.glb"),
    );
  if (!main.equals(lab)) throw Error("Production/Lab model mismatch");
  const report = inspect(main),
    source = path.join(ROOT, "experiments/avs-6a/asset-source/makehuman");
  const rig = JSON.parse(fs.readFileSync(path.join(source, "default.mhskel"))),
    weights = JSON.parse(
      fs.readFileSync(path.join(source, "default_weights.mhw")),
    );
  report.source = {
    boneCount: Object.keys(rig.bones).length,
    weightGroupCount: Object.keys(weights.weights).length,
    targets: Object.fromEntries(
      [
        "universal-male-young-averagemuscle-averageweight.target",
        "universal-male-young-maxmuscle-averageweight.target",
      ].map((file) => [
        file,
        fs
          .readFileSync(path.join(source, file), "utf8")
          .split("\n")
          .filter((l) => l.trim() && !l.trim().startsWith("#")).length,
      ]),
    ),
  };
  return report;
}
module.exports = { inspect, audit };
if (require.main === module)
  process.stdout.write(JSON.stringify(audit(), null, 2) + "\n");
