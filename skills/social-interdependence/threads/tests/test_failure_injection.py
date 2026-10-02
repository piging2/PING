#!/usr/bin/env python3
"""Failure-injection tests: kill the cycle between transitions, then prove
recovery = reconcile, not replay.

For every crash point: crash -> reconcile -> re-run cycle, and assert:
  - the transition hash chain is intact
  - every intent reaches a terminal state
  - external mutations are never duplicated (fixture mutation_count)
  - no canonical success is ever declared without verification
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _harness import ScratchEnv, FRESH

SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TERMINAL = {"VERIFIED_SUCCESS", "VERIFIED_NOOP", "FAILED_TERMINAL",
            "CANCELLED", "REJECTED", "DEFERRED"}

CRASH_POINTS = ["NORMALIZED", "EVALUATED", "DECIDED", "INTENT_CREATED",
                "SCHEDULED", "ATTEMPTING", "VERIFYING"]


class TestFailureInjection(unittest.TestCase):
    def setUp(self):
        self.e = ScratchEnv()

    def tearDown(self):
        self.e.cleanup()

    def _chain_ok(self):
        sys.path.insert(0, os.path.join(SKILL_DIR, "src"))
        import si_state as S
        os.environ["SI_THREADS_STATE_DIR"] = self.e.state_dir
        ok, err = S.verify_chain()
        self.assertTrue(ok, "chain broken: %s" % err)

    def _assert_recovered(self, batch, expect_mutations=2):
        rc, rep = self.e.run_reconcile()
        self.assertEqual(rc, 0, rep)
        self.assertTrue(rep["chain_ok"], rep.get("chain_error"))
        rc, rep = self.e.run_cycle(batch, FRESH)
        self.assertEqual(rc, 0, rep)
        self._chain_ok()
        intents = self.e.intents()
        for iid, intent in intents.items():
            if batch in iid:
                self.assertIn(intent["state"], TERMINAL,
                              "%s stuck in %s" % (iid, intent["state"]))
        # No duplicate external mutations, ever.
        self.assertEqual(self.e.mutation_count(), expect_mutations)
        # No canonical success without a verification observation.
        for e in self.e.jsonl("evidence.jsonl"):
            if e["outcome"] == "VERIFIED_SUCCESS":
                self.assertTrue(
                    e["verification"]["observed_state"],
                    "success without observation for %s"
                    % e["intent_id"])

    def test_crash_after_normalized(self):
        rc, _ = self.e.run_cycle("crash1", FRESH, crash_after="NORMALIZED")
        self.assertNotEqual(rc, 0)
        self._assert_recovered("crash1")

    def test_crash_after_evaluated(self):
        rc, _ = self.e.run_cycle("crash2", FRESH, crash_after="EVALUATED")
        self.assertNotEqual(rc, 0)
        self._assert_recovered("crash2")

    def test_crash_after_decided(self):
        rc, _ = self.e.run_cycle("crash3", FRESH, crash_after="DECIDED")
        self.assertNotEqual(rc, 0)
        self._assert_recovered("crash3")

    def test_crash_after_intent_created(self):
        rc, _ = self.e.run_cycle("crash4", FRESH,
                                 crash_after="INTENT_CREATED")
        self.assertNotEqual(rc, 0)
        self._assert_recovered("crash4")

    def test_crash_after_scheduled(self):
        rc, _ = self.e.run_cycle("crash5", FRESH, crash_after="SCHEDULED")
        self.assertNotEqual(rc, 0)
        self._assert_recovered("crash5")

    def test_crash_after_attempting(self):
        # Executor completed and applied the like; we died before
        # verification. Recovery must read external state and verify,
        # never re-dispatch.
        rc, _ = self.e.run_cycle("crash6", FRESH, crash_after="ATTEMPTING")
        self.assertNotEqual(rc, 0)
        self.assertEqual(self.e.mutation_count(), 1)  # one like landed
        self._assert_recovered("crash6", expect_mutations=2)
        intents = self.e.intents()
        self.assertEqual(
            intents["threads:like:post:CANDL1K3AAA:crash6"]["state"],
            "VERIFIED_SUCCESS")

    def test_crash_after_verifying(self):
        rc, _ = self.e.run_cycle("crash7", FRESH, crash_after="VERIFYING")
        self.assertNotEqual(rc, 0)
        self._assert_recovered("crash7", expect_mutations=2)

    def test_reconcile_without_crash_is_harmless(self):
        rc, rep = self.e.run_cycle("crash8", FRESH)
        self.assertEqual(rc, 0, rep)
        rc, rep = self.e.run_reconcile()
        self.assertEqual(rc, 0, rep)
        self.assertTrue(rep["chain_ok"])
        self.assertEqual(rep["reconciled"], [])
        self.assertEqual(self.e.mutation_count(), 2)


if __name__ == "__main__":
    unittest.main()
