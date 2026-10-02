#!/usr/bin/env python3
"""Fixture tests for the harvest dedup pipeline.

Proves:
  1. Aliases ("ATProto/Lexicons"), protocol labels (ActivityPub, Nostr), and
     case/variant repo references collapse into one candidate row each.
  2. GrowthBook, GrapesJS, ActivityPub, Nostr never appear as separate
     candidate rows.
  3. Conflicting pinned SHAs fail closed (DedupConflict), no silent choice.
  4. Conflicting license records fail closed (DedupConflict).
  5. Missing SHAs stay UNVERIFIED instead of being invented.
"""

import unittest
from dedup import dedupe, normalize_repo_key, DedupConflict, UNVERIFIED


def rec(repo, sha="e" * 40, lic="MIT", mechanisms=None, aliases=None):
    return {
        "name": repo,
        "repo": repo,
        "pinned_sha": sha,
        "license": lic,
        "mechanisms": mechanisms or [],
        "aliases": aliases or [],
        "decision": "BACKLOG",
    }


class TestNormalize(unittest.TestCase):
    def test_variants(self):
        for v in [
            "unclecode/crawl4ai",
            "UNCLECODE/Crawl4AI",
            "https://github.com/unclecode/crawl4ai",
            "http://github.com/unclecode/crawl4ai/",
            "github.com/unclecode/crawl4ai.git",
            "https://github.com/unclecode/crawl4ai.git",
        ]:
            self.assertEqual(normalize_repo_key(v), "unclecode/crawl4ai", v)

    def test_bad_ref(self):
        with self.assertRaises(ValueError):
            normalize_repo_key("not-a-repo")
        with self.assertRaises(ValueError):
            normalize_repo_key("too/many/slashes")


class TestCollapse(unittest.TestCase):
    def test_atproto_lexicons_alias(self):
        rows = [
            rec("bluesky-social/atproto", mechanisms=["Lexicon compatibility laws"]),
            rec("BlueSky-Social/ATProto", aliases=["ATProto Lexicons"], mechanisms=["protocol SDK patterns"]),
        ]
        unique, notes = dedupe(rows)
        self.assertEqual(len(unique), 1)
        u = unique[0]
        self.assertEqual(u["canonical_repo"], "bluesky-social/atproto")
        self.assertIn("Lexicon compatibility laws", u["mechanisms"])
        self.assertIn("protocol SDK patterns", u["mechanisms"])
        self.assertIn("ATProto Lexicons", u["aliases"])

    def test_granary_protocol_labels(self):
        rows = [
            rec("snarfed/granary", mechanisms=["ActivityPub translation (mechanism, not a candidate)"]),
            rec("https://github.com/snarfed/granary", mechanisms=["Nostr translation (mechanism, not a candidate)"]),
        ]
        unique, _ = dedupe(rows)
        self.assertEqual(len(unique), 1)
        names = [r["name"] for r in unique]
        self.assertNotIn("GrowthBook", names)
        self.assertNotIn("GrapesJS", names)
        self.assertNotIn("ActivityPub", names)
        self.assertNotIn("Nostr", names)

    def test_no_shadow_candidates(self):
        # GrowthBook / GrapesJS / ActivityPub / Nostr must never be rows.
        rows = [rec("snarfed/granary"), rec("temporalio/temporal")]
        unique, _ = dedupe(rows)
        keys = {r["canonical_repo"] for r in unique}
        for shadow in ["growthbook", "grapesjs", "activitypub", "nostr"]:
            self.assertFalse(any(shadow in k for k in keys))


class TestFailClosed(unittest.TestCase):
    def test_sha_conflict(self):
        rows = [rec("owner/repo", sha="a" * 40), rec("OWNER/repo", sha="b" * 40)]
        with self.assertRaises(DedupConflict):
            dedupe(rows)

    def test_license_conflict(self):
        rows = [rec("owner/repo", lic="MIT"), rec("owner/repo", lic="AGPL-3.0")]
        with self.assertRaises(DedupConflict):
            dedupe(rows)

    def test_unverified_sha_not_invented(self):
        rows = [rec("owner/repo", sha=None, lic="MIT")]
        unique, _ = dedupe(rows)
        self.assertEqual(unique[0]["pinned_sha"], UNVERIFIED)


class TestRegistry(unittest.TestCase):
    def test_canonical_registry(self):
        import json
        from pathlib import Path
        payload = json.loads(Path(__file__).resolve().parent.joinpath("candidates.json").read_text())
        unique, _ = dedupe(payload["candidates"])
        self.assertEqual(len(unique), len(payload["candidates"]))
        keys = [r["canonical_repo"] for r in unique]
        self.assertEqual(len(set(keys)), len(keys))
        for r in unique:
            self.assertEqual(len(r["pinned_sha"]), 40)
            self.assertNotEqual(r["license"], UNVERIFIED)


if __name__ == "__main__":
    unittest.main(verbosity=2)
