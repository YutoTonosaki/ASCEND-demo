"""Evidence tests only. No anatomical/morph tests are represented as passing."""
import hashlib
import json
from pathlib import Path
import unittest
from unittest.mock import patch

from source_audit import ROOT, inspect


class SourceAudit(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Any accidental model/source write during audit is an immediate failure.
        with patch.object(Path, 'write_bytes', side_effect=AssertionError('write')):
            with patch.object(Path, 'write_text', side_effect=AssertionError('write')):
                cls.evidence = inspect()

    def test_exact_neutral_positions_normals_indices(self):
        self.assertTrue(all(self.evidence['exactNeutralCorrespondence'].values()))

    def test_correspondence_is_bijective(self):
        ids = self.evidence['bodySourceIdOrder']
        self.assertEqual(len(ids), 13380)
        self.assertEqual(ids, sorted(set(ids)))
        self.assertLess(max(ids), self.evidence['sourceVertices'])

    def test_global_target_is_not_upper_arm_target(self):
        self.assertEqual(self.evidence['globalTargetNonzeroVertices'], 6825)
        self.assertEqual(self.evidence['globalTargetNonzeroBodyVertices'], 3911)
        self.assertEqual(self.evidence['boneSupportReference']['changedOutside'], 2710)

    def test_all_source_hashes_verified(self):
        self.assertEqual(len(self.evidence['verifiedSourceFiles']), 8)
        for record in self.evidence['verifiedSourceFiles']:
            raw = (ROOT / 'experiments/avs-6a/asset-source/makehuman' / record['file']).read_bytes()
            self.assertEqual(hashlib.sha256(raw).hexdigest(), record['sha256'])

    def test_deterministic_read_only_audit(self):
        with patch.object(Path, 'open', autospec=True, wraps=Path.open) as opened:
            # Inspect actual mode arguments rather than relying on output absence.
            opened.side_effect = lambda path, *a, **kw: original_open(path, *a, **kw)
            second = inspect()
            for call in opened.call_args_list:
                mode = call.args[1] if len(call.args) > 1 else call.kwargs.get('mode', 'r')
                self.assertFalse(any(c in mode for c in 'wax+'))
        self.assertEqual(self.evidence, second)

    def test_no_fabricated_asset_or_clearance(self):
        self.assertFalse(self.evidence['morphAuthored'])
        self.assertFalse(self.evidence['garmentClearanceValidated'])
        self.assertFalse(list((ROOT / 'experiments/avs-growth-6b1a').rglob('*.glb')))

    def test_committed_evidence_matches_replay(self):
        saved = json.loads(Path(__file__).with_name('evidence.json').read_text())
        self.assertEqual(saved, self.evidence)


original_open = Path.open

if __name__ == '__main__':
    unittest.main()
