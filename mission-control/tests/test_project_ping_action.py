#!/usr/bin/env python3
"""Tests for the Mission Control one-action projector.

Run from the repo root:
    python3 -m unittest discover -s mission-control/tests -p "test_project_ping_action.py" -v

The projector is read-only: it shells to the ledger's own `trace`
command and never writes to the ledger. Tests use temp files only;
the real ledger is read, never mutated.
"""

import json
import os
import subprocess
import sys
import tempfile
import unittest

_HERE = os.path.dirname(os.path.abspath(__file__))
_MC = os.path.normpath(os.path.join(_HERE, ".."))
_REPO = os.path.normpath(os.path.join(_MC, ".."))
_PROJECTOR = os.path.join(_MC, "project_ping_action.py")

REAL_INTENT = "8cfeddea8fee41e598630b2c36330f22"
AS_OF = "2026-09-29T19:00:00Z"


def run_projector(intent_id, out_path, extra_env=None):
    env = dict(os.environ)
    if extra_env:
        env.update(extra_env)
    return subprocess.run(
        [sys.executable, _PROJECTOR, "--intent-id", intent_id,
         "--as-of", AS_OF, "--out", out_path],
        capture_output=True, text=True, env=env, cwd=_REPO)


class TestPingActionProjection(unittest.TestCase):
    def test_real_action_screen_answers_all_eight(self):
        with tempfile.TemporaryDirectory() as td:
            out = os.path.join(td, "screen.json")
            proc = run_projector(REAL_INTENT, out)
            self.assertEqual(proc.returncode, 0, proc.stderr)
            with open(out, encoding="utf-8") as f:
                doc = json.load(f)
        self.assertEqual(doc["projection"],
                         "mission-control/ping-action-screen")
        self.assertEqual(doc["intent_id"], REAL_INTENT)
        self.assertEqual(doc["as_of"], AS_OF)
        screen = doc["screen"]
        for key in ("wanted", "authorized", "attempt", "worker_report",
                    "verified", "outcome_known", "remains_unknown",
                    "learned"):
            self.assertIn(key, screen)
            self.assertIn("question", screen[key])
            self.assertIn("answer", screen[key])
            self.assertIn("source", screen[key])

        # The real chain is fully observed except learning: nothing mocked.
        self.assertEqual(screen["wanted"]["answer"]["action"], "comment")
        self.assertEqual(screen["wanted"]["answer"]["platform"], "facebook")
        self.assertIn("facebook.com/groups/2646836605529865",
                      screen["wanted"]["answer"]["target"])

        auth_answer = screen["authorized"]["answer"]
        self.assertIn("allowed", auth_answer["decision"])
        # No fabricated per-action receipt: the ledger says it is absent.
        self.assertIn("absent", auth_answer["per_action_receipt"])

        self.assertNotEqual(screen["attempt"]["answer"], "UNKNOWN")
        self.assertEqual(screen["worker_report"]["answer"]["terminal"],
                         "EXECUTED")
        self.assertTrue(screen["worker_report"]["answer"]["ok"])

        verified = screen["verified"]["answer"]
        self.assertIsInstance(verified, list)
        self.assertEqual(verified[0]["verdict"], "EFFECT_CONFIRMED")

        outcomes = screen["outcome_known"]["answer"]
        self.assertIsInstance(outcomes, list)
        self.assertEqual(outcomes[0]["outcome_class"], "NO_SIGNAL")

        # Learning stays a non-proposal: n=1 no-signal is not support.
        learned = screen["learned"]["answer"]
        self.assertEqual(learned["status"], "none proposed")

        # The window is honestly open: unknowns are explicit, not hidden.
        unknowns = screen["remains_unknown"]["answer"]
        self.assertTrue(any("replies" in u for u in unknowns))

        # Provenance: the screen digests the exact trace it projected.
        self.assertEqual(len(doc["source"]["trace_sha256"]), 64)
        self.assertIn("trace --intent-id", doc["source"]["command"])

    def test_unknown_intent_fails_closed(self):
        with tempfile.TemporaryDirectory() as td:
            out = os.path.join(td, "screen.json")
            proc = run_projector("deadbeef" * 4, out)
            self.assertNotEqual(proc.returncode, 0)
            self.assertFalse(os.path.exists(out))

    def test_partial_ledger_renders_unknown(self):
        # A ledger with only an intent record: every later stage is UNKNOWN.
        intent = {
            "record_type": "intent", "stage": "ACTION_INTENT_DURABLE",
            "intent_id": "test-partial-1", "pass_id": "test-pass",
            "platform": "facebook", "action": "comment",
            "url": "https://example.invalid/post/1",
            "account": "Test Account (comment)",
            "ts": "2026-09-29T17:00:00+00:00",
        }
        with tempfile.TemporaryDirectory() as td:
            ledger = os.path.join(td, "ledger.jsonl")
            with open(ledger, "w", encoding="utf-8") as f:
                f.write(json.dumps(intent) + "\n")
            out = os.path.join(td, "screen.json")
            proc = run_projector(
                "test-partial-1", out,
                extra_env={"ENGAGEMENT_INTENT_LEDGER": ledger})
            self.assertEqual(proc.returncode, 0, proc.stderr)
            with open(out, encoding="utf-8") as f:
                doc = json.load(f)
        screen = doc["screen"]
        self.assertEqual(screen["wanted"]["answer"]["action"], "comment")
        self.assertEqual(screen["attempt"]["answer"], "UNKNOWN")
        self.assertEqual(screen["worker_report"]["answer"], "UNKNOWN")
        self.assertEqual(screen["verified"]["answer"], "UNKNOWN")
        self.assertEqual(screen["outcome_known"]["answer"], "UNKNOWN")
        self.assertEqual(screen["learned"]["answer"]["status"],
                         "none proposed")
        self.assertGreaterEqual(doc["honesty"]["unknown_count"], 4)

    def test_deterministic_bytes(self):
        with tempfile.TemporaryDirectory() as td:
            outs = [os.path.join(td, "s%d.json" % i) for i in (1, 2)]
            for out in outs:
                proc = run_projector(REAL_INTENT, out)
                self.assertEqual(proc.returncode, 0, proc.stderr)
            with open(outs[0], "rb") as f:
                a = f.read()
            with open(outs[1], "rb") as f:
                b = f.read()
            self.assertEqual(a, b)

    def test_no_mocked_fields_in_honesty_block(self):
        with tempfile.TemporaryDirectory() as td:
            out = os.path.join(td, "screen.json")
            proc = run_projector(REAL_INTENT, out)
            self.assertEqual(proc.returncode, 0, proc.stderr)
            with open(out, encoding="utf-8") as f:
                doc = json.load(f)
        self.assertEqual(doc["honesty"]["mocked_fields"], 0)
        # UNKNOWN count matches the answers that are literally UNKNOWN.
        screen = doc["screen"]
        expected = sum(1 for k in screen
                       if k in ("wanted", "authorized", "attempt",
                                "worker_report", "verified", "outcome_known",
                                "remains_unknown", "learned")
                       and screen[k]["answer"] == "UNKNOWN")
        self.assertEqual(doc["honesty"]["unknown_count"], expected)


if __name__ == "__main__":
    unittest.main()
