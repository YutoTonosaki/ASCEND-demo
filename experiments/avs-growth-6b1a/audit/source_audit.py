"""Read-only source correspondence audit. Never generates a model or morph.

Replays only the reviewed neutral preparation prefix of the pinned converter.
Its garment/export/write code is excluded from the compiled AST entirely.
Output is JSON on stdout; redirection, if desired, belongs to the caller.
"""
import ast
import hashlib
import json
from pathlib import Path
import struct

ROOT = Path(__file__).resolve().parents[3]
LAB = ROOT / 'experiments/avs-6a'
CONVERTER_SHA = '1f4d06c08db15f2826d0d562c9d35c7040173b1b3060fecad87ec074eb6c7711'
ASSET_SHA = '4b655504291c7389994b8d3e420744405a21fbb71fde2e20f318880aee849cfc'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def neutral_reference():
    path = LAB / 'tools/prepare-asset.py'
    data = path.read_bytes()
    if sha(data) != CONVERTER_SHA:
        raise ValueError('Converter changed; review neutral prefix before replay')
    tree = ast.parse(data, filename=str(path))
    setup = []
    for node in tree.body:
        if isinstance(node, ast.If):
            continue  # Never include __main__/prepare invocation.
        if isinstance(node, ast.FunctionDef) and node.name == 'prepare':
            prefix = []
            for statement in node.body:
                if (isinstance(statement, ast.Assign)
                        and any(isinstance(t, ast.Name) and t.id == 'original_low'
                                for t in statement.targets)):
                    break  # Before clothing creation and all export/file writes.
                prefix.append(statement)
            else:
                raise ValueError('Reviewed prefix boundary missing')
            node.body = prefix + [ast.Return(value=ast.Call(
                func=ast.Name(id='locals', ctx=ast.Load()), args=[], keywords=[]))]
        setup.append(node)
    code = ast.fix_missing_locations(ast.Module(body=setup, type_ignores=[]))
    namespace = {'__file__': str(path), '__name__': 'read_only_neutral_reference'}
    exec(compile(code, str(path), 'exec'), namespace)
    return namespace['prepare']()


def inspect():
    reference = neutral_reference()  # Includes all eight pinned source hash checks.
    raw = (LAB / 'assets/athlete.glb').read_bytes()
    if sha(raw) != ASSET_SHA:
        raise ValueError('Accepted baseline asset changed')
    if raw != (ROOT / 'my-app/assets/avs/athlete.glb').read_bytes():
        raise ValueError('Production and Lab baselines differ')
    magic, version, length = struct.unpack_from('<3I', raw)
    if (magic, version, length) != (0x46546c67, 2, len(raw)):
        raise ValueError('Invalid GLB header')
    json_length, kind = struct.unpack_from('<2I', raw, 12)
    if kind != 0x4e4f534a:
        raise ValueError('Missing JSON chunk')
    doc = json.loads(raw[20:20 + json_length])
    binary_length, kind = struct.unpack_from('<2I', raw, 20 + json_length)
    binary = raw[28 + json_length:]
    if kind != 0x004e4942 or len(binary) != binary_length:
        raise ValueError('Invalid BIN chunk')

    def buffer(index):
        accessor = doc['accessors'][index]
        view = doc['bufferViews'][accessor['bufferView']]
        if accessor.get('sparse') or view.get('byteStride') or view['buffer'] != 0:
            raise ValueError('Unsupported reference accessor')
        start = view.get('byteOffset', 0) + accessor.get('byteOffset', 0)
        size = {5126: 4, 5123: 2}[accessor['componentType']]
        components = {'VEC3': 3, 'SCALAR': 1}[accessor['type']]
        return binary[start:start + accessor['count'] * size * components]

    ids = sorted(reference['body_ids'])
    remap = {original: exported for exported, original in enumerate(ids)}
    primitive = next(m for m in doc['meshes'] if m['name'] == 'athlete-body')['primitives'][0]
    position = b''.join(struct.pack('<3f', *reference['vertices'][i]) for i in ids)
    normal = b''.join(struct.pack('<3f', *reference['normals'][i]) for i in ids)
    indices = b''.join(struct.pack('<H', remap[i]) for f in reference['faces'] for i in f)
    equal = {
        'positionBytes': position == buffer(primitive['attributes']['POSITION']),
        'normalBytes': normal == buffer(primitive['attributes']['NORMAL']),
        'indexBytes': indices == buffer(primitive['indices']),
    }
    if not all(equal.values()):
        raise ValueError('Neutral source-to-GLB correspondence failed')
    source = LAB / 'asset-source/makehuman'
    target = set()
    for line in (source / 'universal-male-young-maxmuscle-averageweight.target').read_text().splitlines():
        p = line.split()
        if p and not p[0].startswith('#') and any(float(x) != 0 for x in p[1:]):
            target.add(int(p[0]))
    weights = json.loads((source / 'default_weights.mhw').read_text())
    names = ['upperarm01.L', 'upperarm02.L', 'upperarm01.R', 'upperarm02.R']
    support = {i for name in names for i, weight in weights['weights'][name] if weight > 0}
    body = set(ids)
    provenance = json.loads((LAB / 'asset-source/provenance.json').read_text())
    return {
        'schema': 1,
        'purpose': 'neutral correspondence only; no authored regional morph',
        'baselineSha256': ASSET_SHA, 'baselineBytes': len(raw),
        'converterSha256': CONVERTER_SHA,
        'sourceRevision': provenance['revision'],
        'verifiedSourceFiles': provenance['files'],
        'sourceVertices': len(reference['vertices']), 'bodyVertices': len(ids),
        'bodyTriangles': len(reference['faces']), 'exactNeutralCorrespondence': equal,
        'bodySourceIdOrder': ids,
        'globalTargetNonzeroVertices': len(target),
        'globalTargetNonzeroBodyVertices': len(target & body),
        'boneSupportReference': {
            'warning': 'Joint influence only, NOT an anatomical region or approved mask',
            'groups': names, 'bodyVertices': len(support & body),
            'changedInside': len(target & body & support),
            'changedOutside': len((target & body) - support),
        },
        'morphAuthored': False, 'garmentClearanceValidated': False,
        'decision': 'NO-GO for asset export pending regional sculpt and garment review',
    }


if __name__ == '__main__':
    print(json.dumps(inspect(), indent=2, sort_keys=True))
