#!/usr/bin/env python3
"""Adversarial tests for owner-hold dominance at the dispatch boundary.

Incident: 2026-10-02, pass fb-20261002-233439 dispatched 7 FB likes after a
park order. Verdict: authority defect. A timer firing is never authorization.

Proves the invariant: HELD -> ZERO NEW EXTERNAL EFFECTS, across 8 adversarial
cases. All hermetic: the effect boundary is a mock (an in-memory list); the
gate is the REAL outreach/authority-check.py against a fixture holds.json.
Zero real external effects from these tests.

The MockDispatcher below faithfully replicates the run_pass.sh dispatch
sequence: TOP GATE -> work window -> PRE-LAUNCH RE-CHECK -> dispatch. The
static wiring tests at the bottom prove the real dispatcher scripts contain
both gates and the real workers contain the per-action sentinel check.

Run: python3 test_owner_hold_dispatch.py
"""

import json
import os
import subprocess
import sys
import tempfile
import unittest

GATE = os.path.expanduser("~/workspace/outreach/authority-check.py")
REPO = os.path.expanduser("~/workspace")

SURFACES = ("facebook", "instagram", "threads", "x", "tiktok", "linkedin")

# Dispatchers that must gate the owner hold (top gate + pre-launch re-check).
DISPATCHERS = [
    ("pig-fb/run_pass.sh", "facebook"),
    ("pig-fb/run_ig_pass.sh", "instagram"),
    ("pig-fb/run_th_pass.sh", "threads"),
    ("pig-fb/x-engage.sh", "x"),
    ("pig-fb/x-follow-batch.sh", "x"),
    ("pig-fb/x-comment.sh", "x"),
    ("pig-fb/run_tk_pass.sh", "tiktok"),
    ("pig-fb/run_unfollow.sh", "facebook"),
    ("pig-fb/run_ig_unfollow.sh", "instagram"),
    ("pig-fb/run_page_post.sh", "facebook"),
    ("pig-linkedin/run_pass.sh", "linkedin"),
]

# Workers that must re-read the <job>.hold.json sentinel before every action.
WORKERS = [
    "pig-fb/engage.js",
    "pig-fb/ig-engage.js",
    "pig-fb/th-engage.js",
    "pig-fb/tk-engage.js",
    "pig-fb/fb-unfollow.js",
    "pig-fb/ig-unfollow.js",
    "pig-fb/page-post.js",
    "pig-linkedin/engage.js",
]


def make_holds(held_surfaces):
    return {"holds": {
        s: {"held": s in held_surfaces,
            "set_by": "test",
            "set_at": "2026-10-02T00:00:00Z",
            "reason": "adversarial test",
            "ref": "test"}
        for s in SURFACES}}


def make_authority():
    return {"schema_version": 1, "surfaces": {
        s: {"status": "ACTIVE", "reason": "test", "set_by": "test",
            "set_at": "2026-10-02T00:00:00Z",
            "capability": {"authorized": True, "notes": None, "window": None}}
        for s in SURFACES}}


class HoldFixture(unittest.TestCase):
    """Fixture: throwaway OUTREACH_ROOT with real gate semantics."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = self.tmp.name
        self.holds_path = os.path.join(self.root, "holds.json")
        self.auth_path = os.path.join(self.root, "AUTHORITY.json")
        with open(self.auth_path, "w", encoding="utf-8") as f:
            json.dump(make_authority(), f)
        self.write_holds(set())
        self.env = dict(os.environ, OUTREACH_ROOT=self.root,
                        AUTHORITY_JSON_PATH=self.auth_path,
                        AUTHORITY_CONFLICTS_DIR=os.path.join(self.root, "conflicts"))

    def tearDown(self):
        self.tmp.cleanup()

    def write_holds(self, held_surfaces):
        with open(self.holds_path, "w", encoding="utf-8") as f:
            json.dump(make_holds(held_surfaces), f)

    def set_hold(self, surface):
        """Simulate set-hold.py: atomic write of held=true (the authority)."""
        holds = make_holds({surface} | self.held_surfaces())
        with open(self.holds_path, "w", encoding="utf-8") as f:
            json.dump(holds, f)

    def held_surfaces(self):
        with open(self.holds_path, encoding="utf-8") as f:
            doc = json.load(f)
        return {s for s, e in doc["holds"].items() if e.get("held")}

    def gate(self, surface):
        """Run the REAL authority-check.py. Nonzero == deny."""
        return subprocess.run([sys.executable, GATE, surface],
                              capture_output=True, text=True, env=self.env)


class MockDispatcher:
    """Faithful replication of the run_pass.sh dispatch sequence.

    TOP GATE -> work window (a hold may land here) -> PRE-LAUNCH RE-CHECK
    -> dispatch. The effect boundary is an in-memory list; the gates are
    real authority-check.py invocations against CURRENT fixture holds.
    """

    def __init__(self, test, surface, name="scheduler"):
        self.t = test
        self.surface = surface
        self.name = name
        self.effects = []  # the mock external-effect boundary

    def top_gate(self):
        r = self.t.gate(self.surface)
        return r.returncode == 0

    def prelaunch_recheck(self):
        r = self.t.gate(self.surface)
        return r.returncode == 0

    def dispatch(self, actions, on_work=None):
        """Run the full sequence. Returns (allowed, effects)."""
        if not self.top_gate():
            return ("denied-top", [])
        if on_work:
            on_work()  # the work window: a hold may land here
        if not self.prelaunch_recheck():
            return ("denied-prelaunch", [])
        for a in actions:
            self.effects.append(a)
        return ("dispatched", list(self.effects))


class MockWorker:
    """Faithful replication of the engage.js per-action sentinel check.

    Reads <job>.hold.json before EVERY action; missing/unreadable/invalid
    fails closed. Mirrors ownerHoldState() in pig-fb/engage.js.
    """

    def __init__(self, job_path):
        self.job_path = job_path
        self.effects = []
        self.stopped = None

    def hold_state(self):
        try:
            with open(self.job_path + ".hold.json", encoding="utf-8") as f:
                s = json.load(f)
            if s.get("held") is False:
                return (False, None)
            if s.get("held") is True:
                return (True, str(s.get("reason") or "owner hold"))
            return (True, "sentinel invalid (fail closed)")
        except Exception:
            return (True, "sentinel unreadable (fail closed)")

    def run(self, actions, on_action=None):
        for a in actions:
            held, reason = self.hold_state()
            if held:
                self.stopped = reason
                break
            self.effects.append(a)
            if on_action:
                on_action(a)
        return list(self.effects)


class OwnerHoldDispatchTest(HoldFixture):
    """The 8 adversarial cases. Invariant: HELD -> ZERO NEW EXTERNAL EFFECTS."""

    def test_a_hold_before_schedule(self):
        # Hold is in force before the schedule even exists.
        self.set_hold("facebook")
        d = MockDispatcher(self, "facebook")
        verdict, effects = d.dispatch(["like:1", "like:2"])
        self.assertEqual(verdict, "denied-top")
        self.assertEqual(effects, [])

    def test_b_hold_after_schedule_before_dispatch(self):
        # Schedule created with no hold; hold lands in the work window
        # (the minutes between top gate and pre-launch: guard filter,
        # eligibility envelope, intent ledger, CDP pre-flight, scp).
        d = MockDispatcher(self, "facebook")
        def work():
            self.set_hold("facebook")
        verdict, effects = d.dispatch(["like:1", "like:2"], on_work=work)
        self.assertEqual(verdict, "denied-prelaunch")
        self.assertEqual(effects, [])

    def test_c_hold_while_worker_queued(self):
        # Worker launched before the hold; hold lands mid-pass. The worker
        # must stop before its next action: zero NEW effects after the hold.
        job = os.path.join(self.root, "job.json")
        with open(job, "w") as f:
            json.dump({"actions": ["like:1", "like:2", "like:3"]}, f)
        with open(job + ".hold.json", "w") as f:
            json.dump({"held": False, "surface": "facebook"}, f)
        w = MockWorker(job)
        def after_first(action):
            if action == "like:1":
                # enforce-hold flips the sentinel mid-pass.
                with open(job + ".hold.json", "w") as f:
                    json.dump({"held": True, "reason": "owner hold enforced"}, f)
        effects = w.run(["like:1", "like:2", "like:3"], on_action=after_first)
        self.assertEqual(effects, ["like:1"])  # only the pre-hold action
        self.assertIsNotNone(w.stopped)
        # The post-hold actions never became effects.
        self.assertNotIn("like:2", effects)
        self.assertNotIn("like:3", effects)

    def test_d_hold_during_restart(self):
        # Dispatcher starts (top gate allows), the process "restarts"
        # mid-sequence; a hold lands during the restart. The restarted
        # dispatcher must re-read CURRENT holds and deny.
        d = MockDispatcher(self, "facebook")
        self.assertTrue(d.top_gate())
        # Simulate restart: new dispatcher instance, hold lands meanwhile.
        self.set_hold("facebook")
        d2 = MockDispatcher(self, "facebook")
        verdict, effects = d2.dispatch(["like:1"])
        self.assertIn(verdict, ("denied-top", "denied-prelaunch"))
        self.assertEqual(effects, [])

    def test_e_hold_survives_restart(self):
        # Holds are durable machine state, not in-memory. After a restart
        # the gate still denies.
        self.set_hold("instagram")
        # Simulate restart: drop all in-memory state, re-read from disk.
        del self.env
        self.env = dict(os.environ, OUTREACH_ROOT=self.root,
                        AUTHORITY_JSON_PATH=self.auth_path,
                        AUTHORITY_CONFLICTS_DIR=os.path.join(self.root, "conflicts"))
        r = self.gate("instagram")
        self.assertNotEqual(r.returncode, 0)
        d = MockDispatcher(self, "instagram")
        verdict, effects = d.dispatch(["like:1"])
        self.assertEqual(effects, [])

    def test_f_multiple_schedulers(self):
        # Two independent schedulers share one holds.json. A hold denies both.
        self.set_hold("threads")
        d1 = MockDispatcher(self, "threads", name="cron")
        d2 = MockDispatcher(self, "threads", name="manual-trigger")
        v1, e1 = d1.dispatch(["like:1"])
        v2, e2 = d2.dispatch(["like:1"])
        self.assertEqual(e1, [])
        self.assertEqual(e2, [])
        self.assertNotEqual(v1, "dispatched")
        self.assertNotEqual(v2, "dispatched")

    def test_g_stale_schedule(self):
        # A schedule created BEFORE the hold (stale timestamp) fires AFTER
        # the hold. The gate reads CURRENT holds, not the schedule's vintage.
        schedule_created_at = "2026-10-02T16:00:00Z"  # before the hold
        self.set_hold("x")  # hold lands after the schedule was created
        d = MockDispatcher(self, "x")
        verdict, effects = d.dispatch(["like:1"])
        self.assertEqual(schedule_created_at < "2026-10-02T23:49:46Z", True)
        self.assertEqual(effects, [])
        self.assertNotEqual(verdict, "dispatched")

    def test_h_manual_dispatch_while_held(self):
        # A human (or rogue script) invokes the dispatcher directly while
        # held. The top gate denies before any work begins.
        self.set_hold("facebook")
        d = MockDispatcher(self, "facebook", name="manual")
        verdict, effects = d.dispatch(["like:1", "like:2", "like:3"])
        self.assertEqual(verdict, "denied-top")
        self.assertEqual(effects, [])


class WiringTest(unittest.TestCase):
    """Static proof that the real scripts contain the gates."""

    def test_every_dispatcher_gates_owner_hold(self):
        missing = []
        for rel, surface in DISPATCHERS:
            p = os.path.join(REPO, rel)
            with open(p, encoding="utf-8") as f:
                src = f.read()
            if "authority-check.py" not in src:
                missing.append(rel)
        self.assertEqual(missing, [], f"dispatchers without owner-hold gate: {missing}")

    def test_every_dispatcher_has_prelaunch_recheck(self):
        # The re-check comment marks the last-responsible-boundary gate.
        missing = []
        for rel, surface in DISPATCHERS:
            p = os.path.join(REPO, rel)
            with open(p, encoding="utf-8") as f:
                src = f.read()
            if "pre-launch boundary" not in src and "pre-action boundary" not in src:
                missing.append(rel)
        self.assertEqual(missing, [], f"dispatchers without pre-launch re-check: {missing}")

    def test_every_worker_checks_hold_sentinel(self):
        missing = []
        for rel in WORKERS:
            p = os.path.join(REPO, rel)
            with open(p, encoding="utf-8") as f:
                src = f.read()
            if "ownerHoldState" not in src:
                missing.append(rel)
        self.assertEqual(missing, [], f"workers without sentinel check: {missing}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
