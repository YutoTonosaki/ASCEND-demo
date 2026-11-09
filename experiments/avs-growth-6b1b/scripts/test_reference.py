"""Run after the Blender handoff has been built and reopened."""
import hashlib
import json
import math
from pathlib import Path
import struct
import unittest

from prepare_reference import HERE, ROOT, EXPECTED, extract


class HandoffTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.reference = json.loads((HERE / 'references/neutral.json').read_text())

    def test_deterministic_reference_extraction(self):
        self.assertEqual(extract(), self.reference)

    def test_baseline_and_production_bytes(self):
        local = (HERE / 'references/accepted-neutral.glb').read_bytes()
        self.assertEqual(hashlib.sha256(local).hexdigest(), EXPECTED)
        self.assertEqual(local, (ROOT / 'my-app/assets/avs/athlete.glb').read_bytes())
        self.assertEqual(local, (ROOT / 'experiments/avs-6a/assets/athlete.glb').read_bytes())

    def test_buffer_hashes_and_indices(self):
        for mesh in self.reference['meshes']:
            for name in ['position', 'normal']:
                values = mesh['positions' if name == 'position' else 'normals']
                self.assertTrue(all(math.isfinite(x) for row in values for x in row))
                packed = b''.join(struct.pack('<3f', *v) for v in values)
                self.assertEqual(hashlib.sha256(packed).hexdigest(), mesh['hashes'][name])
            self.assertTrue(all(0 <= i < len(mesh['positions']) for i in mesh['indices']))
            self.assertEqual(hashlib.sha256(b''.join(struct.pack('<H', i) for i in mesh['indices'])).hexdigest(), mesh['hashes']['indices'])

    def test_coordinate_conversion_roundtrip(self):
        for mesh in self.reference['meshes']:
            original = b''.join(struct.pack('<3f', *v) for v in mesh['positions'])
            converted = [(x, -z, y) for x, y, z in mesh['positions']]
            restored = b''.join(struct.pack('<3f', x, z, -y) for x, y, z in converted)
            self.assertEqual(original, restored)

    def test_unique_body_correspondence(self):
        body = self.reference['meshes'][0]
        self.assertEqual(body['name'], 'athlete-body')
        self.assertEqual(len(body['sourceIds']), 13380)
        self.assertEqual(len(set(body['sourceIds'])), 13380)
        self.assertFalse(self.reference['regionApproved'])
        self.assertTrue(all(n.startswith('REF_joint_influence_') for n in body['referenceGroups']))

    def test_actual_blender_build_and_reopen(self):
        build = json.loads((HERE / 'validation/neutral-build.json').read_text())
        reopened = json.loads((HERE / 'validation/neutral-reopen.json').read_text())
        self.assertEqual(build['meshes'], reopened)
        self.assertEqual(len(reopened), 3)
        self.assertFalse(build['morphAuthored'])
        self.assertTrue(all(m['positionRoundtrip'] and m['basisExact'] and m['indexOrder'] and m['baselineNormalAttributeExact'] for m in reopened))

    def test_real_api_smoke_and_named_test_fixture(self):
        result = json.loads((HERE / 'validation/api-smoke.json').read_text())
        self.assertTrue(result['pythonApi'] and result['gltfExport'] and result['gltfImport'] and result['morphRoundtrip'])
        raw = (HERE / 'validation/api-test-triangle.glb').read_bytes()
        self.assertEqual(struct.unpack_from('<3I', raw), (0x46546c67, 2, len(raw)))
        size = struct.unpack_from('<I', raw, 12)[0]
        doc = json.loads(raw[20:20 + size])
        self.assertEqual(doc['meshes'][0]['extras']['targetNames'], ['TEST_ONLY_triangle'])
        self.assertEqual(doc['meshes'][0]['weights'], [0])

    def test_no_exported_athlete_morph_claim(self):
        self.assertFalse(list((HERE / 'exports').glob('*.glb')))


if __name__ == '__main__':
    unittest.main()
