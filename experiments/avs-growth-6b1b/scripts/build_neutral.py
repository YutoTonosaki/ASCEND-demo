"""Run in approved Blender. Exact neutral handoff, not an authored morph.

The REF groups and heatmap are joint influences for manual review only.
No upper_arm_development key is created before the anatomical selection gate.
"""
import bpy
import hashlib
import json
from pathlib import Path
import struct

HERE = Path(__file__).resolve().parents[1]
reference = json.loads((HERE / 'references/neutral.json').read_text())


def hash_vec(values):
    return hashlib.sha256(b''.join(struct.pack('<3f', *v) for v in values)).hexdigest()


def verify():
    results = []
    for source in reference['meshes']:
        obj = bpy.data.objects[source['name']]
        mesh = obj.data
        assert len(mesh.vertices) == len(source['positions'])
        assert [a.value for a in mesh.attributes['baseline_index'].data] == list(range(len(mesh.vertices)))
        if source['sourceIds'] is not None:
            assert [a.value for a in mesh.attributes['makehuman_source_id'].data] == source['sourceIds']
        points = [[v.co.x, v.co.z, -v.co.y] for v in mesh.vertices]
        assert hash_vec(points) == source['hashes']['position']
        index = [i for polygon in mesh.polygons for i in polygon.vertices]
        assert index == source['indices']
        assert not obj.modifiers
        assert len(mesh.shape_keys.key_blocks) == 1
        assert mesh.shape_keys.key_blocks[0].name == 'Basis'
        for vertex, basis in zip(mesh.vertices, mesh.shape_keys.key_blocks[0].data):
            assert vertex.co == basis.co
        stored_normals = [[a.vector.x, a.vector.z, -a.vector.y]
                          for a in mesh.attributes['baseline_normal'].data]
        assert hash_vec(stored_normals) == source['hashes']['normal']
        assert len(mesh.materials) == 1
        material = mesh.materials[0]
        values = source['material']['pbrMetallicRoughness']
        pbr = material.node_tree.nodes.get('Principled BSDF')
        assert all(abs(a - b) < 1e-6 for a, b in zip(
            pbr.inputs['Base Color'].default_value, values['baseColorFactor']))
        assert abs(pbr.inputs['Metallic'].default_value - values['metallicFactor']) < 1e-6
        assert abs(pbr.inputs['Roughness'].default_value - values['roughnessFactor']) < 1e-6
        assert material.use_backface_culling == (not source['material'].get('doubleSided', False))
        results.append({'mesh': obj.name, 'vertices': len(points), 'triangles': len(index) // 3,
                        'positionRoundtrip': True, 'indexOrder': True, 'basisExact': True,
                        'baselineNormalAttributeExact': True, 'regionApproved': False})
    return results


def build():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for source in reference['meshes']:
        mesh = bpy.data.meshes.new(source['name'])
        coords = [(x, -z, y) for x, y, z in source['positions']]
        faces = [source['indices'][i:i + 3] for i in range(0, len(source['indices']), 3)]
        mesh.from_pydata(coords, [], faces)
        mesh.update()
        obj = bpy.data.objects.new(source['name'], mesh)
        bpy.context.collection.objects.link(obj)
        attr = mesh.attributes.new('baseline_index', 'INT', 'POINT')
        attr.data.foreach_set('value', list(range(len(coords))))
        if source['sourceIds'] is not None:
            attr = mesh.attributes.new('makehuman_source_id', 'INT', 'POINT')
            attr.data.foreach_set('value', source['sourceIds'])
        attr = mesh.attributes.new('baseline_normal', 'FLOAT_VECTOR', 'POINT')
        attr.data.foreach_set('vector', [v for x, y, z in source['normals'] for v in (x, -z, y)])
        for polygon in mesh.polygons:
            polygon.use_smooth = True
        mesh.normals_split_custom_set_from_vertices([(x, -z, y) for x, y, z in source['normals']])
        obj.shape_key_add(name='Basis')
        for name, pairs in source['referenceGroups'].items():
            group = obj.vertex_groups.new(name=name)
            for index, weight in pairs:
                group.add([index], weight, 'REPLACE')
        obj['authoring_status'] = 'NEUTRAL ONLY — joint influence references are NOT approved anatomical masks'
        obj['baseline_sha256'] = reference['baselineSha256']
        obj['coordinate_transform'] = reference['coordinateTransform']
        material = bpy.data.materials.new(source['name'])
        material.use_nodes = True
        pbr = material.node_tree.nodes.get('Principled BSDF')
        values = source['material']['pbrMetallicRoughness']
        material.diffuse_color = values['baseColorFactor']
        pbr.inputs['Base Color'].default_value = values['baseColorFactor']
        pbr.inputs['Metallic'].default_value = values['metallicFactor']
        pbr.inputs['Roughness'].default_value = values['roughnessFactor']
        material.use_backface_culling = not source['material'].get('doubleSided', False)
        mesh.materials.append(material)
    bpy.context.view_layer.objects.active = bpy.data.objects['athlete-body']
    bpy.data.objects['athlete-body'].select_set(True)
    note = bpy.data.texts.new('START_HERE_NOT_AN_APPROVED_MORPH')
    note.write('Neutral handoff only. REF_joint_influence groups are source rig hints, not muscle masks.\n'
               'Review biceps/triceps, deltoid/elbow transition and protected landmarks before adding\n'
               'upper_arm_development. No sculpt or garment fit is approved. See repository report.\n')
    bpy.context.scene['regionApproved'] = False
    bpy.context.scene['morphAuthored'] = False
    results = verify()
    bpy.ops.wm.save_as_mainfile(filepath=str(HERE / 'blend/neutral-handoff.blend'))
    (HERE / 'validation/neutral-build.json').write_text(json.dumps({
        'blender': bpy.app.version_string, 'meshes': results, 'morphAuthored': False}, indent=2) + '\n')


if __name__ == '__main__':
    import sys
    if '--verify-only' in sys.argv:
        results = verify()
        (HERE / 'validation/neutral-reopen.json').write_text(json.dumps(results, indent=2) + '\n')
        print('NEUTRAL_REOPEN_VERIFIED', json.dumps(results))
    else:
        build()
