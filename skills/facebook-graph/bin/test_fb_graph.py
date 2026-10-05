#!/usr/bin/env python3
"""Live tests for the Facebook Graph connector.

Tests that pass TODAY on the public_profile grant:
  - identity read (/me) returns id + name
  - permission self-check parses and shows public_profile granted
  - page paths raise typed FbPermissionError naming the missing scope
    (an honest, expected outcome -- NOT a failure)

Scope-gated tests: when the scopes ever land, the same page-path tests
exercise the real calls instead of asserting the typed error. No test
fabricates access.

Run: python3 test_fb_graph.py
Exit 0 = all green. Any other exit = real regression.
"""
import sys
import unittest

sys.path.insert(0, "/opt/hatch/skills/facebook-graph/bin")
from fb_graph import (
    FbGraphClient,
    FbPermissionError,
    REQUIRED_SCOPES,
)

client = FbGraphClient()


def has_scope(scope):
    return scope in client.granted_scopes()["granted"]


class TestIdentityToday(unittest.TestCase):
    def test_me_returns_id_and_name(self):
        me = client.me()
        self.assertTrue(me.get("id"), "expected a user id from /me")
        self.assertTrue(me.get("name"), "expected a name from /me")

    def test_permission_selfcheck_parses(self):
        scopes = client.granted_scopes()
        self.assertIn("public_profile", scopes["granted"])


class TestPagePathsScopeGated(unittest.TestCase):
    """Each page path: real call when the scope exists, typed honest
    error when it does not. Both outcomes are PASS."""

    def _assert_honest(self, key, fn):
        required = REQUIRED_SCOPES[key]
        if all(has_scope(s) for s in required):
            result = fn()  # scopes landed: exercise the real path
            self.assertIsNotNone(result)
        else:
            with self.assertRaises(FbPermissionError) as ctx:
                fn()
            self.assertIn(ctx.exception.required_scope, required)

    def test_pages(self):
        self._assert_honest("pages", client.pages)

    def test_page_posts(self):
        pages = []
        if has_scope("pages_show_list"):
            pages = client.pages()
        pid = pages[0]["id"] if pages else "me"
        self._assert_honest("page_posts", lambda: client.page_posts(pid))

    def test_page_insights(self):
        pages = []
        if has_scope("pages_show_list"):
            pages = client.pages()
        pid = pages[0]["id"] if pages else "me"
        self._assert_honest(
            "page_insights", lambda: client.page_insights(pid, ["page_impressions"]))

    def test_missing_scope_names_the_scope(self):
        if has_scope("pages_show_list"):
            self.skipTest("scope landed; nothing missing to name")
        try:
            client.pages()
        except FbPermissionError as e:
            self.assertEqual(e.required_scope, "pages_show_list")
            self.assertIn("pages_show_list", e.missing_scopes)
        else:
            self.fail("expected FbPermissionError for pages() without the scope")


if __name__ == "__main__":
    unittest.main(verbosity=2)
