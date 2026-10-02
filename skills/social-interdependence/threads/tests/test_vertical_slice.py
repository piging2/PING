#!/usr/bin/env python3
"""Vertical-slice tests: authorized account -> discovery -> candidate ->
REAL guard eligibility -> durable intent -> scheduling -> fixture
execution -> read-after-write verification -> canonical evidence ->
relationship update.

Fixtures live ONLY at the adapter boundary (the JS executor + its reads).
Everything else is the real machinery.
"""
import json
import os
import re
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _harness import ScratchEnv, FRESH

SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DECISION_FIELDS = ["candidate_id", "actor", "target", "relationship",
                   "content", "platform", "action_candidates",
                   "identity_confidence", "relationship_context", "evidence",
                   "capabilities", "policy_result", "budget_result",
                   "materiality", "uncertainty", "saturation",
                   "outcome_history", "decision", "reason"]


class TestVerticalSlice(unittest.TestCase):
    def setUp(self):
        self.e = ScratchEnv()

    def tearDown(self):
        self.e.cleanup()

    def test_full_slice_two_likes(self):
        cands = list(FRESH) + [
            # exact duplicate of the first: DUPLICATE
            {"url": "https://www.threads.com/@fixturebuilder/post/"
                    "CANDL1K3AAA/",
             "type": "like", "text": "dup"},
            # @garyvee is engaged in the durable log: ALREADY_ENGAGED
            {"url": "https://www.threads.com/@garyvee/post/DbU_q9mLbX/",
             "type": "like", "text": "legacy"},
        ]
        rc, report = self.e.run_cycle("slice1", cands)
        self.assertEqual(rc, 0, report)

        decisions = report["decisions"]
        # candidate_id repeats for the within-batch duplicate; the first
        # occurrence of each must PROCEED.
        seen_ids = set()
        for d in decisions:
            cid = d.get("candidate_id")
            if cid in ("threads:like:CANDL1K3AAA",
                       "threads:like:CANDL1K3BBB") and cid not in seen_ids:
                seen_ids.add(cid)
                self.assertEqual(d["decision"], "PROCEED",
                                 "first occurrence of %s: %s" % (cid, d))
        self.assertEqual(seen_ids, {"threads:like:CANDL1K3AAA",
                                    "threads:like:CANDL1K3BBB"})
        rej = [d for d in report["decisions"]
               if d.get("decision") == "REJECT"]
        reasons = " ".join(d["reason"] for d in rej)
        self.assertIn("DUPLICATE", reasons)
        self.assertIn("ALREADY_ENGAGED", reasons)

        # Both eligible intents verified through read-after-write.
        driven = {d["intent_id"]: d["final_state"]
                  for d in report.get("driven", [])}
        self.assertEqual(
            driven["threads:like:post:CANDL1K3AAA:slice1"],
            "VERIFIED_SUCCESS")
        self.assertEqual(
            driven["threads:like:post:CANDL1K3BBB:slice1"],
            "VERIFIED_SUCCESS")

        # Exactly two external mutations happened, no more.
        self.assertEqual(self.e.mutation_count(), 2)

        # Decision records carry every required field and no opaque score.
        for d in self.e.jsonl("decisions.jsonl"):
            for f in DECISION_FIELDS:
                self.assertIn(f, d, "decision missing %s" % f)
            blob = json.dumps(d).lower()
            self.assertNotIn("ai_score", blob)
            self.assertNotIn("score:", blob)

        # Intent IDs follow the cross-platform contract.
        for iid, intent in self.e.intents().items():
            self.assertRegex(
                iid, r"^threads:(like|comment):post:[A-Za-z0-9_-]+:[a-z0-9-]+$")

        # Budget was consumed atomically: 2 likes in this window.
        budget = self.e.jsonl("budget.jsonl")
        self.assertEqual(len(budget), 2)
        self.assertEqual(budget[-1]["remaining_after"], 43)

        # Canonical evidence: verification observations present, and no
        # VERIFIED_SUCCESS without one.
        ev = self.e.jsonl("evidence.jsonl")
        self.assertEqual(len(ev), 2)
        for e in ev:
            self.assertEqual(e["outcome"], "VERIFIED_SUCCESS")
            self.assertEqual(
                e["verification"]["observed_state"], "liked_by_account")
            self.assertEqual(e["policy_verdict"]["decision"], "ELIGIBLE")

        # Relationship touches recorded for both handles.
        touches = self.e.jsonl("relationship.jsonl")
        handles = sorted(t["handle"] for t in touches)
        self.assertEqual(handles, ["@fixturebuilder", "@fixturemaker"])

        # Transition chain is intact: replay reconstructs the same states.
        sys.path.insert(0, os.path.join(SKILL_DIR, "src"))
        import si_state as S
        os.environ["SI_THREADS_STATE_DIR"] = self.e.state_dir
        ok, err = S.verify_chain()
        self.assertTrue(ok, err)

    def test_comment_slice(self):
        cands = [{
            "url": "https://www.threads.com/@fixturecomment/post/CMNT111aaa/",
            "type": "comment",
            "text": "A post about deterministic replay.",
            "comment_text": "Replay beats rhetoric. Nice build.",
        }]
        rc, report = self.e.run_cycle("slice2", cands)
        self.assertEqual(rc, 0, report)
        driven = {d["intent_id"]: d["final_state"]
                  for d in report.get("driven", [])}
        iid = "threads:comment:post:CMNT111aaa:slice2"
        self.assertEqual(driven[iid], "VERIFIED_SUCCESS")
        ev = [e for e in self.e.jsonl("evidence.jsonl")
              if e["intent_id"] == iid][0]
        self.assertEqual(ev["verification"]["observed_state"],
                         "comment_present")
        self.assertEqual(self.e.mutation_count(), 1)

    def test_comment_without_text_is_cancelled_never_invented(self):
        cands = [{
            "url": "https://www.threads.com/@fixturecomment/post/CMNT222bbb/",
            "type": "comment",
            "text": "A post about deterministic replay.",
        }]
        rc, report = self.e.run_cycle("slice3", cands)
        self.assertEqual(rc, 0, report)
        intents = self.e.intents()
        iid = "threads:comment:post:CMNT222bbb:slice3"
        # No intent was created at all: the harness refuses to invent copy.
        self.assertNotIn(iid, intents)
        self.assertEqual(self.e.mutation_count(), 0)
        # The transition log records the cancellation honestly.
        states = [t["to_state"] for t in self.e.jsonl("transitions.jsonl")
                  if t["intent_id"] == iid]
        self.assertIn("CANCELLED", states)

    def test_capability_missing_rejects(self):
        cands = [{
            "url": "https://www.threads.com/@fixturebuilder/post/CAPM1SSaaa/",
            "type": "follow",  # threads supports like + comment only
            "text": "x",
        }]
        rc, report = self.e.run_cycle("slice4", cands)
        self.assertEqual(rc, 0, report)
        rej = [d for d in report["decisions"]
               if d.get("decision") == "REJECT"]
        self.assertTrue(rej)
        self.assertIn("CAPABILITY_MISSING", rej[0]["reason"])
        self.assertEqual(self.e.mutation_count(), 0)

    def test_unauthorized_account_refused(self):
        env = dict(self.e.env)
        import subprocess
        cand_path = os.path.join(self.e.root, "c.json")
        json.dump(FRESH[:1], open(cand_path, "w"))
        proc = subprocess.run(
            [sys.executable,
             os.path.join(SKILL_DIR, "bin", "th-si-cycle.py"),
             "--batch-id", "slice5", "--candidates", cand_path,
             "--account", "@intruder"],
            capture_output=True, text=True, env=env, timeout=120)
        self.assertNotEqual(proc.returncode, 0)
        self.assertIn("NO_ACTION_WITHOUT_AUTHORIZED_ACCOUNT",
                      proc.stderr + proc.stdout)
        self.assertEqual(self.e.mutation_count(), 0)


if __name__ == "__main__":
    unittest.main()
