#!/usr/bin/env python3
"""Adversarial tests: the machinery must hold under hostile or degraded
conditions, without weakening evidence, authority, replay, verification,
or rollback. Every case asserts a concrete fail-closed behavior.
"""
import json
import os
import subprocess
import sys
import time
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _harness import ScratchEnv, FRESH

SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(SKILL_DIR, "src")


def src():
    if SRC_DIR not in sys.path:
        sys.path.insert(0, SRC_DIR)
    import si_state as S
    import si_policy as P
    import si_watchdog as W
    return S, P, W


class TestAdversarial(unittest.TestCase):
    def setUp(self):
        self.e = ScratchEnv()

    def tearDown(self):
        self.e.cleanup()

    def test_duplicate_discovery_collapses(self):
        cands = [dict(FRESH[0]), dict(FRESH[0])]
        rc, report = self.e.run_cycle("adv1", cands)
        self.assertEqual(rc, 0, report)
        driven = [d for d in report.get("driven", [])]
        self.assertEqual(len(driven), 1)
        self.assertEqual(self.e.mutation_count(), 1)
        rej = [d for d in report["decisions"]
               if d.get("decision") == "REJECT"]
        self.assertTrue(any("DUPLICATE" in d["reason"] for d in rej))

    def test_two_workers_second_fails_closed(self):
        S, P, W = src()
        os.environ["SI_THREADS_STATE_DIR"] = self.e.state_dir
        self.assertTrue(S.acquire_lease("th-pass-adv2", "rival-worker",
                                        ttl_sec=600))
        try:
            rc, report = self.e.run_cycle("adv2", FRESH)
            self.assertEqual(rc, 5)
            self.assertIn("lease", report["stopped"])
            self.assertEqual(self.e.mutation_count(), 0)
            self.assertEqual(self.e.intents(), {})
        finally:
            S.release_lease("th-pass-adv2", "rival-worker")

    def test_identity_ambiguity_blocks_fail_closed(self):
        cands = [{
            "url": "https://www.threads.com/@garyveee/post/AMB1G111aa/",
            "type": "like", "text": "looks almost like an engaged handle"}]
        rc, report = self.e.run_cycle("adv3", cands)
        self.assertEqual(rc, 0, report)
        rej = [d for d in report["decisions"]
               if d.get("decision") == "REJECT"]
        self.assertTrue(rej)
        self.assertIn("BLOCKED", rej[0]["reason"])
        self.assertEqual(self.e.mutation_count(), 0)

    def test_expired_credential_no_success_claimed(self):
        rc, report = self.e.run_cycle(
            "adv4", FRESH, extra_env={"FAKE_AUTH_EXPIRED": "1"})
        self.assertEqual(rc, 0, report)
        self.assertEqual(self.e.mutation_count(), 0)
        for d in report.get("driven", []):
            self.assertEqual(d["final_state"], "FAILED_RETRYABLE")
        for e in self.e.jsonl("evidence.jsonl"):
            self.assertNotEqual(e["outcome"], "VERIFIED_SUCCESS")
        flags = self.e.jsonl("adapter_flags.jsonl")
        self.assertTrue(any("logged_out" in f.get("flag", "")
                            for f in flags))

    def test_timeout_after_success_reconciles_without_redispatch(self):
        # Executor applies the like, then dies silently: UNKNOWN external
        # effect. Reconcile must read external state, verify success, and
        # never dispatch a second like.
        rc, report = self.e.run_cycle(
            "adv5", FRESH[:1], extra_env={"FAKE_TIMEOUT_AFTER_SUCCESS": "1"})
        self.assertEqual(rc, 0, report)
        self.assertEqual(self.e.mutation_count(), 1)
        driven = {d["intent_id"]: d["final_state"]
                  for d in report.get("driven", [])}
        iid = "threads:like:post:CANDL1K3AAA:adv5"
        self.assertEqual(driven[iid], "FAILED_RETRYABLE")
        intent = self.e.intents()[iid]
        self.assertEqual(intent["external_effect"], "unknown")

        rc, rep = self.e.run_reconcile()
        self.assertEqual(rc, 0, rep)
        self.assertEqual(self.e.intents()[iid]["state"], "VERIFIED_SUCCESS")
        # Still exactly one external mutation: no blind retry happened.
        self.assertEqual(self.e.mutation_count(), 1)

        # A further cycle must not re-dispatch either.
        rc, rep = self.e.run_cycle("adv5b", FRESH[:1])
        self.assertEqual(rc, 0, rep)
        self.assertEqual(self.e.mutation_count(), 1)

    def test_adapter_lie_detected_by_verification(self):
        rc, report = self.e.run_cycle(
            "adv6", FRESH[:1], extra_env={"FAKE_LIE": "1"})
        self.assertEqual(rc, 0, report)
        self.assertEqual(self.e.mutation_count(), 0)  # nothing applied
        driven = {d["intent_id"]: d["final_state"]
                  for d in report.get("driven", [])}
        iid = "threads:like:post:CANDL1K3AAA:adv6"
        self.assertEqual(driven[iid], "FAILED_TERMINAL")
        ev = [e for e in self.e.jsonl("evidence.jsonl")
              if e["intent_id"] == iid][0]
        self.assertTrue(ev["verification"]["observed_state"],
                        "not_liked_by_account")
        # Watchdog opened the adapter breaker on verification failure.
        S, P, W = src()
        os.environ["SI_THREADS_STATE_DIR"] = self.e.state_dir
        breakers = W.load_breakers()
        self.assertTrue(breakers.get("adapter:threads", {}).get("open"),
                        "adapter breaker should be open after a lie")

    def test_budget_race_exactly_one_winner(self):
        S, P, W = src()
        os.environ["SI_THREADS_STATE_DIR"] = self.e.state_dir
        import concurrent.futures
        # 1 unit of budget, 8 racers: exactly one consumes it.
        wins = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
            futs = [ex.submit(
                S.consume_budget, "like", "intent-%d" % i, "race",
                "@nolanpigi", 1, 7200, "env", 1) for i in range(8)]
            for f in concurrent.futures.as_completed(futs):
                wins.append(f.result())
        self.assertEqual(sum(1 for w in wins if w is not None), 1)

    def test_lease_expiry_releases_stale_not_live(self):
        S, P, W = src()
        os.environ["SI_THREADS_STATE_DIR"] = self.e.state_dir
        self.assertTrue(S.acquire_lease("th-pass-adv8", "gone-worker",
                                        ttl_sec=1))
        time.sleep(1.2)
        # A different worker may now take it: the stale lease does not
        # block forever.
        self.assertTrue(S.acquire_lease("th-pass-adv8", "new-worker",
                                        ttl_sec=600))
        # But a live lease still blocks a rival.
        self.assertFalse(S.acquire_lease("th-pass-adv8", "rival",
                                         ttl_sec=600))

    def test_platform_outage_defers_gracefully(self):
        rc, report = self.e.run_cycle(
            "adv9", FRESH[:1], extra_env={"FAKE_OUTAGE": "1"})
        self.assertEqual(rc, 0, report)
        self.assertEqual(self.e.mutation_count(), 0)
        driven = {d["intent_id"]: d["final_state"]
                  for d in report.get("driven", [])}
        self.assertEqual(
            driven["threads:like:post:CANDL1K3AAA:adv9"],
            "FAILED_RETRYABLE")

    def test_checkpoint_flag_opens_platform_breaker(self):
        rc, report = self.e.run_cycle(
            "adv10", FRESH[:1], extra_env={"FAKE_FLAG": "checkpoint"})
        self.assertEqual(rc, 0, report)
        driven = {d["intent_id"]: d["final_state"]
                  for d in report.get("driven", [])}
        self.assertEqual(
            driven["threads:like:post:CANDL1K3AAA:adv10"], "CANCELLED")
        S, P, W = src()
        os.environ["SI_THREADS_STATE_DIR"] = self.e.state_dir
        breakers = W.load_breakers()
        self.assertTrue(breakers.get("platform:threads", {}).get("open"),
                        "platform breaker should open on checkpoint flag")
        # NO_EXECUTION_AFTER_CIRCUIT_BREAKER_OPEN: the invariant fires.
        with self.assertRaises(P.InvariantViolation) as ctx:
            P.check_no_execution_after_circuit_breaker_open(
                breakers, "platform:threads")
        self.assertIn("NO_EXECUTION_AFTER_CIRCUIT_BREAKER_OPEN",
                      str(ctx.exception))

    def test_saturation_defers_does_not_force(self):
        S, P, W = src()
        os.environ["SI_THREADS_STATE_DIR"] = self.e.state_dir
        # Pre-saturate @fixturebuilder: 5 touches in the last 7 days.
        for i in range(5):
            S.record_touch("@fixturebuilder", "old-intent-%d" % i,
                           "VERIFIED_SUCCESS")
        rc, report = self.e.run_cycle("adv11", FRESH[:1])
        self.assertEqual(rc, 0, report)
        by_cand = {d["candidate_id"]: d for d in report["decisions"]
                   if "candidate_id" in d}
        d = by_cand["threads:like:CANDL1K3AAA"]
        self.assertEqual(d["decision"], "DEFER")
        self.assertIn("saturated", d["reason"])
        self.assertEqual(self.e.mutation_count(), 0)
        intents = self.e.intents()
        self.assertNotIn("threads:like:post:CANDL1K3AAA:adv11", intents)

    def test_unknown_stays_unknown_on_read_failure(self):
        # Verification reads fail: the outcome must stay UNKNOWN and the
        # intent must never be retried blindly. When reads return, the
        # same intent reconciles to VERIFIED_SUCCESS with no re-dispatch.
        cands = [dict(FRESH[0])]
        self.e.set(FAKE_READ_FAIL="1")
        rc, report = self.e.run_cycle("adv12", cands)
        self.assertEqual(rc, 0, report)
        # The like landed, but verification could not observe it.
        self.assertEqual(self.e.mutation_count(), 1)
        iid = "threads:like:post:CANDL1K3AAA:adv12"
        driven = {d["intent_id"]: d["final_state"]
                  for d in report.get("driven", [])}
        self.assertEqual(driven[iid], "UNKNOWN")

        rc, rep = self.e.run_reconcile()
        self.assertEqual(rc, 0, rep)
        intents = self.e.intents()
        self.assertEqual(intents[iid]["state"], "UNKNOWN")
        # Attempt count unchanged: no blind retry happened.
        self.assertEqual(intents[iid].get("attempt"), 1)
        self.assertEqual(self.e.mutation_count(), 1)

        # Reads return: reconcile now verifies without re-dispatching.
        self.e.unset("FAKE_READ_FAIL")
        rc, rep = self.e.run_reconcile()
        self.assertEqual(rc, 0, rep)
        self.assertEqual(self.e.intents()[iid]["state"],
                         "VERIFIED_SUCCESS")
        self.assertEqual(self.e.mutation_count(), 1)

    def test_learner_out_of_envelope_rejected(self):
        S, P, W = src()
        os.environ["SI_THREADS_STATE_DIR"] = self.e.state_dir
        envelope = P.default_envelope()
        # Raising a ceiling: rejected.
        with self.assertRaises(P.InvariantViolation):
            W.propose_learned_config(
                {"platform_budget": {"threads_like_per_window": 999}},
                envelope)
        # Tuning outside [min,max]: rejected.
        with self.assertRaises(P.InvariantViolation):
            W.propose_learned_config(
                {"inter_action_delay_sec": [10, 20]}, envelope)
        # Tuning inside bounds: accepted as SHADOW.
        v = W.propose_learned_config(
            {"inter_action_delay_sec": [70, 130]}, envelope)
        self.assertEqual(v, 1)
        cfg = W.get_learned_config()
        self.assertEqual(cfg["history"][-1]["stage"], "SHADOW")

    def test_learner_promotion_gates_and_rollback(self):
        S, P, W = src()
        os.environ["SI_THREADS_STATE_DIR"] = self.e.state_dir
        envelope = P.default_envelope()
        v = W.propose_learned_config(
            {"inter_action_delay_sec": [70, 130]}, envelope)
        gates = {"policy_violations": 0,
                 "duplicate_canonical_actions": 0,
                 "unverified_success_declarations": 0,
                 "unknown_outcome_rate": 0.02}
        W.promote_learned_config(v, "CANARY", gates)
        W.promote_learned_config(v, "ACTIVE", gates)
        # A dirty gate blocks promotion.
        v2 = W.propose_learned_config(
            {"inter_action_delay_sec": [80, 140]}, envelope)
        with self.assertRaises(ValueError):
            W.promote_learned_config(
                v2, "CANARY",
                dict(gates, unverified_success_declarations=1))
        # Regression triggers automatic rollback to the last ACTIVE.
        self.e.jsonl("learner.jsonl")  # exists
        with open(os.path.join(self.e.state_dir, "learner.jsonl"),
                  "a") as f:
            f.write(json.dumps(
                {"at": "2099-01-01T00:00:00+00:00",
                 "kind": "regression"}) + "\n")
        taken = W.check(envelope)
        self.assertTrue(any("rolled back" in t for t in taken),
                        "expected automatic rollback, got %s" % taken)
        cfg = W.get_learned_config()
        self.assertEqual(cfg["params"], {"inter_action_delay_sec":
                                         [70, 130]})

    def test_invariants_fire(self):
        S, P, W = src()
        os.environ["SI_THREADS_STATE_DIR"] = self.e.state_dir
        envelope = P.default_envelope()
        with self.assertRaises(P.InvariantViolation):
            P.check_no_action_without_authorized_account(
                envelope, "@intruder")
        existing = {"threads:like:post:X:b1": {"state": "SCHEDULED"}}
        with self.assertRaises(P.InvariantViolation):
            P.check_no_duplicate_active_intent("threads:like:post:X:b1",
                                               existing)
        # Terminal intents are not "active": re-drive is a policy
        # decision, not an invariant breach.
        P.check_no_duplicate_active_intent(
            "threads:like:post:X:b1",
            {"threads:like:post:X:b1": {"state": "VERIFIED_SUCCESS"}})
        with self.assertRaises(P.InvariantViolation):
            P.check_no_canonical_success_without_verification(
                "VERIFIED_SUCCESS", None)
        with self.assertRaises(P.InvariantViolation):
            P.check_no_blind_retry_after_unknown_external_mutation(
                {"intent_id": "i", "state": "UNKNOWN",
                 "external_effect": "unknown"})
        with self.assertRaises(P.InvariantViolation):
            P.check_tab_hygiene({"worker_window_opened": True,
                                 "worker_window_closed": False})


if __name__ == "__main__":
    unittest.main()
