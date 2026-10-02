"""Checkpoint tests: atomic writes, corrupt-safe loads, one-writer locks."""
import sys
import os
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from git_ingest.checkpoint import CheckpointStore, LockConflict


class TestCheckpoint(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store = CheckpointStore(os.path.join(self.tmp.name, "cp"))

    def tearDown(self):
        self.tmp.cleanup()

    def test_save_load_roundtrip(self):
        cp = self.store.fresh("o/r")
        cp["pages_done"] = 3
        self.store.save("o/r", cp)
        back = self.store.load("o/r")
        self.assertEqual(back["pages_done"], 3)
        self.assertEqual(back["schema"], "git-ingest-checkpoint:v1")

    def test_missing_checkpoint_is_none(self):
        self.assertIsNone(self.store.load("nope/none"))

    def test_corrupt_checkpoint_is_none_not_crash(self):
        path = os.path.join(self.tmp.name, "cp", "nope_none.json")
        with open(path, "w") as f:
            f.write("{not json")
        self.assertIsNone(self.store.load("nope/none"))

    def test_wrong_schema_is_none(self):
        path = os.path.join(self.tmp.name, "cp", "o_r.json")
        with open(path, "w") as f:
            f.write('{"schema": "something-else"}')
        self.assertIsNone(self.store.load("o/r"))

    def test_no_tmp_left_after_save(self):
        self.store.save("o/r", self.store.fresh("o/r"))
        leftovers = [f for f in os.listdir(os.path.join(self.tmp.name, "cp"))
                     if f.endswith(".tmp")]
        self.assertEqual(leftovers, [])

    def test_double_claim_conflicts(self):
        with self.store.claim("o/r"):
            with self.assertRaises(LockConflict):
                with self.store.claim("o/r"):
                    pass

    def test_lock_released_after_context(self):
        with self.store.claim("o/r"):
            pass
        with self.store.claim("o/r"):
            pass  # must not raise


if __name__ == "__main__":
    unittest.main()
