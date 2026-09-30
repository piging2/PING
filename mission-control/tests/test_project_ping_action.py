#!/usr/bin/env python3
"""Tests for the Mission Control one-action projector.

Run from the repo root:
    python3 -m unittest discover -s mission-control/tests -p "test_project_ping_action.py" -v

The projector is read-only: it shells to the ledger's own `trace`
command and never writes to the ledger. Tests use temp files only;
the real ledger is read, never mutated.

Ledger under read (resolve_ledger): explicit ENGAGEMENT_INTENT_LEDGER env
first, then the repo's default ledger data file, then the checked-in
NO_SIGNAL fixture (mission-control/tests/fixtures/ledger-no-signal.jsonl).
The ledger data file is untracked operational data, so a clean worktree
has no live ledger; the fixture fallback keeps the suite green there,
honestly labeled. World-state assertions are data-driven off the ledger's
own latest outcome record, never hardcoded to one world: the NO_SIGNAL
world's original meaning is pinned by the fixture test instead.
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
_LEDGER_CLI = os.path.join(_REPO, "outreach", "action-intent-ledger.py")
_DEFAULT_LEDGER_DATA = os.path.join(_REPO, "outreach",
                                    "action-intent-ledger.jsonl")
_FIXTURE_LEDGER = os.path.join(_HERE, "fixtures",
                               "ledger-no-signal.jsonl")

REAL_INTENT = "8cfeddea8fee41e598630b2c36330f22"
AS_OF = "2026-09-29T19:00:00Z"


def resolve_ledger():
    """Return (env, label) naming the ledger the assertions run against.

    Explicit ENGAGEMENT_INTENT_LEDGER wins; then the repo default data
    file; then the checked-in NO_SIGNAL fixture. The label keeps the
    fallback honest: a clean worktree runs against the pinned fixture,
    never a silently missing ledger.
    """
    explicit = os.environ.get("ENGAGEMENT_INTENT_LEDGER")
    if explicit and os.path.isfile(explicit):
        return dict(os.environ), "env:ENGAGEMENT_INTENT_LEDGER"
    if os.path.isfile(_DEFAULT_LEDGER_DATA):
        env = dict(os.environ)
        env.pop("ENGAGEMENT_INTENT_LEDGER", None)
        return env, "repo-default"
    env = dict(os.environ)
    env["ENGAGEMENT_INTENT_LEDGER"] = _FIXTURE_LEDGER
    return env, "fixture:no-signal-world"


def fixture_env():
    """Env pinning the ledger to the NO_SIGNAL fixture world."""
    env = dict(os.environ)
    env["ENGAGEMENT_INTENT_LEDGER"] = _FIXTURE_LEDGER
    return env


def run_projector(intent_id, out_path, env):
    return subprocess.run(
        [sys.executable, _PROJECTOR, "--intent-id", intent_id,
         "--as-of", AS_OF, "--out", out_path],
        capture_output=True, text=True, env=env, cwd=_REPO)


def run_trace(intent_id, env):
    """The ledger's own trace: the same authority seam the projector uses."""
    proc = subprocess.run(
        [sys.executable, _LEDGER_CLI, "trace", "--intent-id", intent_id],
        capture_output=True, text=True, env=env, cwd=_REPO)
    assert proc.returncode == 0, proc.stderr
    return json.loads(proc.stdout)


def assert_eight_questions(testcase, doc):
    screen = doc["screen"]
    for key in ("wanted", "authorized", "attempt", "worker_report",
                "verified", "outcome_known", "remains_unknown",
                "learned"):
        testcase.assertIn(key, screen)
        testcase.assertIn("question", screen[key])
        testcase.assertIn("answer", screen[key])
        testcase.assertIn("source", screen[key])
    return screen


class TestPingActionProjection(unittest.TestCase):
    def test_real_action_screen_answers_all_eight(self):
        env, label = resolve_ledger()
        print("ledger under read: %s" % label)
        with tempfile.TemporaryDirectory() as td:
            out = os.path.join(td, "screen.json")
            proc = run_projector(REAL_INTENT, out, env)
            self.assertEqual(proc.returncode, 0, proc.stderr)
            with open(out, encoding="utf-8") as f:
                doc = json.load(f)
        self.assertEqual(doc["projection"],
                         "mission-control/ping-action-screen")
        self.assertEqual(doc["intent_id"], REAL_INTENT)
        self.assertEqual(doc["as_of"], AS_OF)
        screen = assert_eight_questions(self, doc)

        # Independent read of the same authority seam the projector used.
        chain = run_trace(REAL_INTENT, env)
        trace_outcomes = (chain.get("OUTCOME") or {}).get("records") or []
        verifications = ((chain.get("VERIFIED_EFFECT") or {})
                         .get("records") or [])
        learnings = ((chain.get("CANDIDATE_LEARNING") or {})
                     .get("records") or [])
        latest_class = (trace_outcomes[-1].get("outcome_class")
                        if trace_outcomes else None)

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

        # Projection fidelity: the screen's outcome list is exactly the
        # ledger's outcome records, in order. No world state hardcoded.
        outcomes = screen["outcome_known"]["answer"]
        self.assertIsInstance(outcomes, list)
        self.assertEqual(
            [o["outcome_class"] for o in outcomes],
            [o.get("outcome_class") for o in trace_outcomes])

        # Learning stays a non-proposal while the ledger holds no
        # candidate learnings: n=1 is not sample support, in either world.
        learned = screen["learned"]["answer"]
        if not learnings:
            self.assertEqual(learned["status"], "none proposed")
        else:
            self.assertIsInstance(learned, list)

        # Unknowns stay consistent with the latest outcome record: the
        # "replies" unknown is present exactly while the outcome window
        # is honestly open (NO_SIGNAL latest), and gone once the ledger
        # records the window closed.
        unknowns = screen["remains_unknown"]["answer"]
        self.assertEqual(any("replies" in u for u in unknowns),
                         latest_class == "NO_SIGNAL")
        self.assertEqual(any("world state after" in u for u in unknowns),
                         bool(verifications))
        self.assertEqual(
            any("per-action authorization receipt" in u for u in unknowns),
            "absent" in str(auth_answer["per_action_receipt"]))

        # Provenance: the screen digests the exact trace it projected.
        self.assertEqual(len(doc["source"]["trace_sha256"]), 64)
        self.assertIn("trace --intent-id", doc["source"]["command"])

    def test_no_signal_world_keeps_window_open(self):
        # Pinned fixture: the ledger as it stood before Lane A appended
        # REPLY_RECEIVED. Preserves the original test's meaning: while the
        # latest outcome is NO_SIGNAL, the outcome window is honestly open
        # and the "replies" unknown is explicit, not hidden.
        with tempfile.TemporaryDirectory() as td:
            out = os.path.join(td, "screen.json")
            proc = run_projector(REAL_INTENT, out, fixture_env())
            self.assertEqual(proc.returncode, 0, proc.stderr)
            with open(out, encoding="utf-8") as f:
                doc = json.load(f)
        screen = assert_eight_questions(self, doc)

        outcomes = screen["outcome_known"]["answer"]
        self.assertIsInstance(outcomes, list)
        self.assertEqual(len(outcomes), 1)
        self.assertEqual(outcomes[0]["outcome_class"], "NO_SIGNAL")

        unknowns = screen["remains_unknown"]["answer"]
        self.assertTrue(any("replies" in u for u in unknowns))

        learned = screen["learned"]["answer"]
        self.assertEqual(learned["status"], "none proposed")

    def test_unknown_intent_fails_closed(self):
        env, _ = resolve_ledger()
        with tempfile.TemporaryDirectory() as td:
            out = os.path.join(td, "screen.json")
            proc = run_projector("deadbeef" * 4, out, env)
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
            partial_env = dict(os.environ)
            partial_env["ENGAGEMENT_INTENT_LEDGER"] = ledger
            proc = run_projector("test-partial-1", out, partial_env)
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
        env, _ = resolve_ledger()
        with tempfile.TemporaryDirectory() as td:
            outs = [os.path.join(td, "s%d.json" % i) for i in (1, 2)]
            for out in outs:
                proc = run_projector(REAL_INTENT, out, env)
                self.assertEqual(proc.returncode, 0, proc.stderr)
            with open(outs[0], "rb") as f:
                a = f.read()
            with open(outs[1], "rb") as f:
                b = f.read()
            self.assertEqual(a, b)

    def test_no_mocked_fields_in_honesty_block(self):
        env, _ = resolve_ledger()
        with tempfile.TemporaryDirectory() as td:
            out = os.path.join(td, "screen.json")
            proc = run_projector(REAL_INTENT, out, env)
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
