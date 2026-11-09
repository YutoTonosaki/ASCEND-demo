"""Synthetic triangle glTF I/O capability test; NOT an athlete morph asset."""
import bpy
import json
from pathlib import Path
import struct

HERE = Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
mesh = bpy.data.meshes.new('API_TEST_TRIANGLE')
mesh.from_pydata([(0, 0, 0), (1, 0, 0), (0, 1, 0)], [], [(0, 1, 2)])
mesh.update()
obj = bpy.data.objects.new('API_TEST_TRIANGLE', mesh)
bpy.context.collection.objects.link(obj)
bpy.context.view_layer.objects.active = obj
obj.select_set(True)
obj.shape_key_add(name='Basis')
key = obj.shape_key_add(name='TEST_ONLY_triangle')
key.data[2].co.z = .1
key.value = 0
destination = HERE / 'validation/api-test-triangle.glb'
bpy.ops.export_scene.gltf(filepath=str(destination), export_format='GLB',
                          use_selection=True, export_animations=False,
                          export_skins=False, export_morph=True,
                          export_morph_normal=True)
raw = destination.read_bytes()
length = struct.unpack_from('<I', raw, 12)[0]
doc = json.loads(raw[20:20 + length])
exported = doc['meshes'][0]
assert exported['extras']['targetNames'] == ['TEST_ONLY_triangle']
assert exported['weights'] == [0]
assert len(exported['primitives'][0]['targets']) == 1
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(destination))
loaded = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
assert len(loaded.data.vertices) == 3
assert loaded.data.shape_keys.key_blocks.get('TEST_ONLY_triangle') is not None
result = {'blender': bpy.app.version_string,
          'buildHash': bpy.app.build_hash.decode(), 'pythonApi': True,
          'gltfExport': True, 'gltfImport': True, 'morphRoundtrip': True,
          'fixture': 'synthetic triangle only; no athlete sculpt'}
(HERE / 'validation/api-smoke.json').write_text(json.dumps(result, indent=2) + '\n')
print('BLENDER_API_SMOKE_PASS', json.dumps(result))
