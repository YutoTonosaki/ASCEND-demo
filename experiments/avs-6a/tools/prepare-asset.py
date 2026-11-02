"""Deterministic fixed-pose GLB from verified CC0 mesh/targets/pose data.

Own stdlib-only converter, not MakeHuman program code. No Blender is required.
The clothing is newly derived compression apparel, not a community garment.
No runtime skeleton/morph/animation is exported or claimed.
"""
import hashlib
import json
import math
from pathlib import Path
import struct

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'asset-source' / 'makehuman'


def add(a, b): return [a[j] + b[j] for j in range(3)]
def sub(a, b): return [a[j] - b[j] for j in range(3)]
def mul(a, s): return [x * s for x in a]
def cross(a, b): return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]
def unit(a): return mul(a, 1 / (math.sqrt(sum(x*x for x in a)) or 1))


def prepare():
    provenance = json.loads((ROOT / 'asset-source/provenance.json').read_text())
    for item in provenance['files']:
        if hashlib.sha256((SOURCE / item['file']).read_bytes()).hexdigest() != item['sha256']:
            raise ValueError('Source checksum mismatch: ' + item['file'])
    vertices, faces, group = [], [], None
    for line in (SOURCE / 'base.obj').read_text().splitlines():
        p = line.split()
        if not p: continue
        if p[0] == 'v': vertices.append(list(map(float, p[1:4])))
        elif p[0] == 'g': group = p[1]
        elif p[0] == 'f' and group == 'body':
            face = [int(x.split('/')[0])-1 for x in p[1:]]
            faces.extend([[face[0], face[i], face[i+1]] for i in range(1, len(face)-1)])
    # A fixed moderate athletic adult prototype; these are authoring weights,
    # never Player ratings, biometric values or an interactive morph control.
    for file, amount in [('caucasian-male-young.target', 1),
                         ('universal-male-young-averagemuscle-averageweight.target', .65),
                         ('universal-male-young-maxmuscle-averageweight.target', .35)]:
        for line in (SOURCE / file).read_text().splitlines():
            p = line.split()
            if p and not p[0].startswith('#'):
                i = int(p[0]); vertices[i] = add(vertices[i], mul(list(map(float, p[1:])), amount))
    skeleton = json.loads((SOURCE / 'default.mhskel').read_text())
    weights = json.loads((SOURCE / 'default_weights.mhw').read_text())
    assert skeleton['license'] == weights['license'] == 'CC0'
    original = [v[:] for v in vertices]
    arm_weights = [0.] * len(vertices)
    for side in ['L', 'R']:
        root = 'upperarm01.' + side
        bone = skeleton['bones'][root]
        def joint(name):
            ids = skeleton['joints'][name]
            return [sum(original[i][j] for i in ids)/len(ids) for j in range(3)]
        head, tail = joint(bone['head']), joint(bone['tail'])
        direction = sub(tail, head)
        target = math.radians(-80 if head[0] > 0 else -100)
        angle = target - math.atan2(direction[1], direction[0])
        descendants = {root}
        while True:
            expanded = descendants | {k for k, b in skeleton['bones'].items() if b['parent'] in descendants}
            if expanded == descendants: break
            descendants = expanded
        influence = [0.] * len(vertices)
        for name in descendants:
            for i, weight in weights['weights'].get(name, []): influence[i] += weight
        for i, weight in enumerate(influence):
            weight = min(1., weight)
            arm_weights[i] += weight
            v = sub(original[i], head)
            rotated = [math.cos(angle)*v[0]-math.sin(angle)*v[1], math.sin(angle)*v[0]+math.cos(angle)*v[1], v[2]]
            vertices[i] = add(vertices[i], mul(sub(add(head, rotated), original[i]), weight))
    body_ids = set(i for f in faces for i in f)
    low = min(vertices[i][1] for i in body_ids)
    high = max(vertices[i][1] for i in body_ids)
    scale = 1.8 / (high - low)
    # Body center on X/Z, feet at Y=0, facing +Z. Nominal art scale, not user height.
    zcenter = (min(vertices[i][2] for i in body_ids)+max(vertices[i][2] for i in body_ids))/2
    vertices = [[v[0]*scale, (v[1]-low)*scale, (v[2]-zcenter)*scale] for v in vertices]
    normals = [[0., 0., 0.] for _ in vertices]
    for a, b, c in faces:
        normal = cross(sub(vertices[b], vertices[a]), sub(vertices[c], vertices[a]))
        for i in [a,b,c]: normals[i] = add(normals[i], normal)
    normals = [unit(n) for n in normals]
    # Separate real meshes offset from body, with an intentionally simple
    # compression-garment cut. No third-party apparel or textures are included.
    original_low = min(original[i][1] for i in body_ids)
    original_height = max(original[i][1] for i in body_ids)-original_low
    def garment(low_y, high_y, arm_limit):
        # Clip triangles at exact interpolated cut lines rather than selecting
        # whole faces by centroid, which produces visibly serrated hems.
        points, directions, triangles, lookup = [], [], [], {}
        def clip(poly, scalar, bound, sign):
            out = []
            for n, current in enumerate(poly):
                previous = poly[n-1]
                a, b = sign*(previous[scalar]-bound), sign*(current[scalar]-bound)
                if (a >= 0) != (b >= 0):
                    t = a/(a-b)
                    out.append([previous[j]+t*(current[j]-previous[j]) for j in range(8)])
                if b >= 0: out.append(current)
            return out
        for face in faces:
            poly = [vertices[i]+normals[i]+[(original[i][1]-original_low)/original_height, arm_weights[i]] for i in face]
            for scalar, bound, sign in [(6,low_y,1),(6,high_y,-1),(7,arm_limit,-1)]:
                if poly: poly = clip(poly,scalar,bound,sign)
            for n in range(1,len(poly)-1):
                trio = [poly[0],poly[n],poly[n+1]]
                area = cross(sub(trio[1][:3],trio[0][:3]),sub(trio[2][:3],trio[0][:3]))
                if sum(x*x for x in area)<1e-18: continue
                ids = []
                for record in trio:
                    key = tuple(round(x,8) for x in record[:6])
                    if key not in lookup:
                        lookup[key] = len(points);points.append(record[:3]);directions.append(unit(record[3:6]))
                    ids.append(lookup[key])
                triangles.append(ids)
        return points,directions,triangles
    cuts = {'training-top': garment(.525,.835,.15), 'training-shorts': garment(.385,.55,.05)}

    binary = bytearray()
    doc = {'asset': {'version': '2.0', 'generator': 'ASCEND isolated CC0 fixed-pose converter',
                     'copyright': 'MakeHuman CC0-1.0; derived apparel: ASCEND CC0-1.0'},
           'scene': 0, 'scenes': [{'nodes': []}], 'nodes': [], 'meshes': [],
           'materials': [], 'accessors': [], 'bufferViews': [], 'buffers': []}

    def accessor(data, kind, component, target):
        while len(binary) % 4: binary.extend(b'\x00')
        start = len(binary)
        if kind == 'VEC3':
            for v in data: binary.extend(struct.pack('<3f', *v))
        else:
            for i in data: binary.extend(struct.pack('<H', i))
        view = len(doc['bufferViews'])
        doc['bufferViews'].append({'buffer': 0, 'byteOffset': start, 'byteLength': len(binary)-start, 'target': target})
        value = {'bufferView': view, 'componentType': component, 'count': len(data), 'type': kind}
        if kind == 'VEC3':
            value['min'] = [min(v[j] for v in data) for j in range(3)]
            value['max'] = [max(v[j] for v in data) for j in range(3)]
        index = len(doc['accessors']); doc['accessors'].append(value)
        return index

    def mesh(name, triangles, color, offset=0, source_vertices=None, source_normals=None):
        source_vertices = vertices if source_vertices is None else source_vertices
        source_normals = normals if source_normals is None else source_normals
        ids = sorted(set(i for f in triangles for i in f)); index = {v:i for i,v in enumerate(ids)}
        points = [add(source_vertices[i], mul(source_normals[i], offset)) for i in ids]
        position = accessor(points, 'VEC3', 5126, 34962)
        normal = accessor([source_normals[i] for i in ids], 'VEC3', 5126, 34962)
        indices = accessor([index[i] for f in triangles for i in f], 'SCALAR', 5123, 34963)
        mat = len(doc['materials'])
        doc['materials'].append({'name': name, 'doubleSided': bool(offset),
                                 'pbrMetallicRoughness': {'baseColorFactor': color, 'metallicFactor': 0, 'roughnessFactor': .78}})
        doc['scenes'][0]['nodes'].append(len(doc['nodes']))
        doc['nodes'].append({'name': name, 'mesh': len(doc['meshes'])})
        doc['meshes'].append({'name': name, 'primitives': [{'attributes': {'POSITION': position, 'NORMAL': normal}, 'indices': indices, 'material': mat}]})
    mesh('athlete-body', faces, [.57,.34,.23,1])
    mesh('training-top', cuts['training-top'][2], [.025,.20,.23,1], .006, *cuts['training-top'][:2])
    mesh('training-shorts', cuts['training-shorts'][2], [.012,.027,.045,1], .009, *cuts['training-shorts'][:2])
    doc['buffers'] = [{'byteLength': len(binary)}]
    encoded = json.dumps(doc, separators=(',', ':'), sort_keys=True).encode()
    encoded += b' ' * ((-len(encoded)) % 4)
    binary += b'\x00' * ((-len(binary)) % 4)
    glb = struct.pack('<3I', 0x46546c67, 2, 12+8+len(encoded)+8+len(binary))
    glb += struct.pack('<2I', len(encoded), 0x4e4f534a)+encoded
    glb += struct.pack('<2I', len(binary), 0x004e4942)+binary
    (ROOT / 'assets/athlete.glb').write_bytes(glb)
    manifest = {'version': 1, 'file': 'athlete.glb', 'sha256': hashlib.sha256(glb).hexdigest(),
                'license': 'CC0-1.0', 'sourceRevision': provenance['revision'], 'bytes': len(glb),
                'triangles': len(faces)+sum(len(v[2]) for v in cuts.values()), 'meshes': 3,
                'textures': 0, 'animations': 0, 'runtimeSkeleton': False, 'height': 1.8,
                'up': '+Y', 'forward': '+Z', 'pose': 'baked arms near sides',
                'apparel': ['original derived compression top', 'original derived compression shorts']}
    (ROOT / 'assets/manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    print(json.dumps(manifest, indent=2))


if __name__ == '__main__': prepare()
