/** Dispose only resources owned by this load; no global useLoader cache. */
export function disposeModel(root) {
  const geometries = new Set(),
    materials = new Set(),
    textures = new Set();
  root.traverse((node) => {
    if (node.geometry) geometries.add(node.geometry);
    if (node.material)
      for (const m of Array.isArray(node.material)
        ? node.material
        : [node.material])
        materials.add(m);
  });
  for (const material of materials)
    for (const value of Object.values(material))
      if (value?.isTexture) textures.add(value);
  for (const t of textures) t.dispose();
  for (const m of materials) m.dispose();
  for (const g of geometries) g.dispose();
}
