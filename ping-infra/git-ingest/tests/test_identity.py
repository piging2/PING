"""Identity tests: same SHA = same identity, no exceptions."""
import sys
import os
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from git_ingest import identity


class TestIdentity(unittest.TestCase):
    def test_same_inputs_same_id(self):
        a = identity.occurrence_id("octo", "hello", "abc123", "commit")
        b = identity.occurrence_id("Octo", "HELLO", "abc123", "commit")
        self.assertEqual(a, b, "repo key must be case-insensitive")

    def test_different_sha_different_id(self):
        a = identity.occurrence_id("o", "r", "sha1", "commit")
        b = identity.occurrence_id("o", "r", "sha2", "commit")
        self.assertNotEqual(a, b)

    def test_observation_text_deterministic(self):
        c = {"sha": "abc", "commit": {"message": "fix\n\nbody",
               "author": {"name": "A", "date": "2026-01-01T00:00:00Z"}},
             "stats": {"additions": 3, "deletions": 1}, "files": [{"f": 1}]}
        t1 = identity.commit_observation_text("o", "r", c)
        t2 = identity.commit_observation_text("o", "r", c)
        self.assertEqual(t1, t2)
        self.assertIn("abc", t1)

    def test_missing_fields_become_unknown_not_invented(self):
        t = identity.commit_observation_text("o", "r", {})
        self.assertIn("unknown", t)
        self.assertNotIn("None", t)

    def test_hash_stable(self):
        self.assertEqual(identity.observation_hash("x"),
                         identity.observation_hash("x"))


if __name__ == "__main__":
    unittest.main()
