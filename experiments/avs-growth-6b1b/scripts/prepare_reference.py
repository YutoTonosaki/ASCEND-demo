"""Extract exact accepted buffers; no deformation and no production writes."""
import hashlib
import importlib.util
import json
from pathlib import Path
import struct

HERE = Path(__file__).resolve().parents[1]
ROOT = HERE.parents[1]
EXPECTED = '4b655504291c7389994b8d3e420744405a21fbb71fde2e20f318880aee849cfc'


def extract():
    raw = (ROOT / 'my-app/assets/avs/athlete.glb').read_bytes()
    assert hashlib.sha256(raw).hexdigest() == EXPECTED
    length = struct.unpack_from('<I', raw, 12)[0]
    doc = json.loads(raw[20:20 + length])
    binary = raw[28 + length:]
    audit_path = ROOT / 'experiments/avs-growth-6b1a/audit/source_audit.py'
    spec = importlib.util.spec_from_file_location('source_audit', audit_path)
    audit = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(audit)
    evidence = audit.inspect()
    source_ids = evidence['bodySourceIdOrder']
    source_weights = json.loads((ROOT / 'experiments/avs-6a/asset-source/makehuman/default_weights.mhw').read_text())

    def read(index):
        a = doc['accessors'][index]
        view = doc['bufferViews'][a['bufferView']]
        assert 'sparse' not in a and 'byteStride' not in view
        fmt = {5126: 'f', 5123: 'H'}[a['componentType']]
        count = {'VEC3': 3, 'SCALAR': 1}[a['type']]
        offset = view.get('byteOffset', 0) + a.get('byteOffset', 0)
        data = binary[offset:offset + a['count'] * count * struct.calcsize(fmt)]
        values = list(struct.iter_unpack('<' + fmt * count, data))
        return [list(v) for v in values], hashlib.sha256(data).hexdigest()

    meshes = []
    for mesh in doc['meshes']:
        p = mesh['primitives'][0]
        position, ph = read(p['attributes']['POSITION'])
        normal, nh = read(p['attributes']['NORMAL'])
        indices, ih = read(p['indices'])
        indices = [v[0] for v in indices]
        groups = {}
        if mesh['name'] == 'athlete-body':
            lookup = {source: export for export, source in enumerate(source_ids)}
            for side in ['L', 'R']:
                for part in ['upperarm01', 'upperarm02', 'lowerarm01']:
                    name = part + '.' + side
                    groups['REF_joint_influence_' + name] = [
                        [lookup[i], w] for i, w in source_weights['weights'][name] if i in lookup and w > 0]
        meshes.append({'name': mesh['name'], 'positions': position, 'normals': normal,
                       'indices': indices, 'material': doc['materials'][p['material']],
                       'hashes': {'position': ph, 'normal': nh, 'indices': ih},
                       'sourceIds': source_ids if mesh['name'] == 'athlete-body' else None,
                       'referenceGroups': groups})
    return {'version': 1, 'baselineSha256': EXPECTED,
            'coordinateTransform': 'glTF (x,y,z) -> Blender (x,-z,y); inverse (x,z,-y)',
            'regionApproved': False, 'meshes': meshes}


if __name__ == '__main__':
    reference = extract()
    destination = HERE / 'references'
    destination.mkdir(exist_ok=True)
    (destination / 'neutral.json').write_text(json.dumps(reference, separators=(',', ':'), sort_keys=True) + '\n')
    (destination / 'accepted-neutral.glb').write_bytes((ROOT / 'my-app/assets/avs/athlete.glb').read_bytes())
    print(json.dumps({'baselineSha256': EXPECTED, 'meshes': [
        {'name': m['name'], 'vertices': len(m['positions']), 'hashes': m['hashes']}
        for m in reference['meshes']]}, indent=2))
