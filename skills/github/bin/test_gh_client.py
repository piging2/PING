#!/usr/bin/env python3
"""Live read-only tests for gh_client.py against the current custom.github grant.

No writes, no mutations, no fixture data. A failing test here is an honest
signal that the grant changed or GitHub moved, not a bug to paper over.
"""
import sys
import unittest

sys.path.insert(0, "/home/hatch/workspace/skills/github/bin")
from gh_client import (
    GhApiError,
    GhNotFoundError,
    GitHubClient,
)

client = GitHubClient()


class TestGrant(unittest.TestCase):
    def test_status_identity(self):
        s = client.status()
        self.assertEqual(s["login"], "piging2")
        self.assertIsInstance(s["id"], int)
        core = s["rate_limit_core"]
        self.assertGreater(core["remaining"], 0)
        self.assertGreaterEqual(core["reset_in_sec"], 0)

    def test_me_matches_status(self):
        self.assertEqual(client.me()["login"], client.status()["login"])

    def test_repos_visible(self):
        repos = client.repos()
        names = {r["full_name"] for r in repos}
        # Public + private repos visible to the grant today.
        self.assertIn("piging2/PING", names)
        self.assertIn("piging2/fyd", names)

    def test_repo_detail(self):
        r = client.repo("piging2", "PING")
        self.assertEqual(r["full_name"], "piging2/PING")
        self.assertFalse(r["private"])

    def test_404_is_typed(self):
        with self.assertRaises(GhNotFoundError) as ctx:
            client.get("/repos/piging2/this-repo-does-not-exist-xyz")
        self.assertEqual(ctx.exception.http_status, 404)

    def test_typed_errors_are_gh_api_errors(self):
        self.assertTrue(issubclass(GhNotFoundError, GhApiError))


if __name__ == "__main__":
    unittest.main(verbosity=2)
