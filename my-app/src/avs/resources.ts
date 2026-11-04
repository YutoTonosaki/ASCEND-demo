import type { Object3D, BufferGeometry, Material, Texture } from "three";
/** Own each model load; do not dispose shared caches or other scenes. */
export function disposeModel(root: Object3D) {
  const geometries = new Set<BufferGeometry>(),
    materials = new Set<Material>(),
    textures = new Set<Texture>();
  root.traverse((node) => {
    const mesh = node as Object3D & {
      geometry?: BufferGeometry;
      material?: Material | Material[];
    };
    if (mesh.geometry) geometries.add(mesh.geometry);
    if (mesh.material)
      for (const material of Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material])
        materials.add(material);
  });
  for (const material of materials)
    for (const value of Object.values(material))
      if (value?.isTexture) textures.add(value);
  for (const texture of textures) texture.dispose();
  for (const material of materials) material.dispose();
  for (const geometry of geometries) geometry.dispose();
}
