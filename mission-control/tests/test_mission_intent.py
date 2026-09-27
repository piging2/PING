#!/usr/bin/env python3
"""Tests for the MissionIntent front door contract.

Run from the worktree root:
    python3 -m unittest discover -s mission-control/tests -v

Every test uses an isolated temp journal; the real PING journal is never
touched. Authorization verdicts come from the REAL vendored
ExternalAgentAdapter via node (no mock authority); the executor is fake
except in the end-to-end test, which runs the REAL legacy dry-run
observer as a subprocess.

Support files (untracked): four files this suite needs are NOT committed
on this lane branch; they are imported read-only from sibling lanes.
See mission-control/SUPPORT-FILES.md for the source commits, blob
SHAs, and the exact materialization commands. A bare clone cannot run
these tests until the files are materialized.
"""

import hashlib
import json
import os
import sys
import tempfile
import threading
import time
import unittest

_HERE = os.path.dirname(os.path.abspath(__file__))
_MC = os.path.normpath(os.path.join(_HERE, ".."))
_WT = os.path.normpath(os.path.join(_MC, ".."))
for _p in (_MC,):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import mission_intent as mi
import frontdoor_adapters as fa
import emit as _spine_emit  # spine lane's emit path (read-only)

ADAPTER_DIR = os.path.join(_WT, "orca-adapter")
OBSERVER_PATH = os.path.join(_WT, "outreach", "spine_observe.py")

PASS_ID = "x-20260926-120000"
ACTOR = "mission-control"
TENANT = "mc-test"


class FakeExecutor(mi.Executor):
    name = "fake-test-executor"

    def __init__(self):
        self.calls = 0

    def execute(self, intent, work_order):
        self.calls += 1
        return {"status": "completed", "summary": "fake ok", "artifacts": []}


class FailedExecutor(mi.Executor):
    """H2a: the executor ran and REPORTS failure via the typed envelope."""

    name = "failed-test-executor"

    def __init__(self):
        self.calls = 0

    def execute(self, intent, work_order):
        self.calls += 1
        return {"status": "failed",
                "summary": "budget exhausted: quota 0, work not performed",
                "artifacts": []}


class UnknownExecutor(mi.Executor):
    """H5b: the executor signals the explicit unknown-outcome channel."""

    name = "unknown-test-executor"

    def __init__(self, effect_may_have_occurred=True,
                 include_effect_flag=True):
        self.calls = 0
        self.effect_may_have_occurred = effect_may_have_occurred
        self.include_effect_flag = include_effect_flag

    def execute(self, intent, work_order):
        self.calls += 1
        out = {"status": "unknown",
               "summary": "transport timed out after send; commit unconfirmed",
               "artifacts": []}
        if self.include_effect_flag:
            out["effect_may_have_occurred"] = self.effect_may_have_occurred
        return out


class CrashExecutor(mi.Executor):
    """H5b: performs a visible effect, then crashes. The front door
    cannot distinguish this from a pre-effect crash."""

    name = "crash-test-executor"

    def __init__(self, marker_path=None):
        self.calls = 0
        self.marker_path = marker_path

    def execute(self, intent, work_order):
        self.calls += 1
        if self.marker_path:
            with open(self.marker_path, "w", encoding="utf-8") as f:
                f.write("effect-performed\n")
        raise RuntimeError("segfault after effect")


class SpawnFailExecutor(mi.Executor):
    """H5a preserved: positively attests no effect before failing."""

    name = "spawn-fail-test-executor"

    def __init__(self):
        self.calls = 0

    def execute(self, intent, work_order):
        self.calls += 1
        raise mi.ExecutorNoEffect("spawn failed: executable not found")


class BadShapeExecutor(mi.Executor):
    """Malformed envelope: the executor ran but broke the contract."""

    name = "bad-shape-test-executor"

    def __init__(self):
        self.calls = 0

    def execute(self, intent, work_order):
        self.calls += 1
        return {"status": "bogus", "summary": "not a real status"}


class SleepExecutor(mi.Executor):
    """Slow executor for the mid-flight revocation test."""

    name = "sleep-test-executor"

    def __init__(self, seconds=2.0):
        self.calls = 0
        self.seconds = seconds

    def execute(self, intent, work_order):
        self.calls += 1
        time.sleep(self.seconds)
        return {"status": "completed", "summary": "slow ok", "artifacts": []}


def _read_journal(path):
    rows = []
    if not os.path.exists(path):
        return rows
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def _frontdoor_records(rows):
    """Unpack front-door records from journal rows."""
    out = []
    for ev in rows:
        if ev.get("aggregate_id") != "mc:lane:" + mi.INTENT_LANE:
            continue
        _, rec = mi._unpack_summary((ev.get("event_data") or {}).get("summary"))
        if rec:
            out.append((ev.get("event_type"), rec))
    return out


def _wait_for_started(journal, idempotency_key, timeout_s=20):
    """Poll until an MC_LANE_STARTED for the key lands in the journal."""
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        for ev in _read_journal(journal):
            if ev.get("event_type") != "MC_LANE_STARTED":
                continue
            _, rec = mi._unpack_summary(
                (ev.get("event_data") or {}).get("summary"))
            if rec and rec.get("idempotency_key") == idempotency_key:
                return True
        time.sleep(0.05)
    return False


def _revocation_records(rows):
    """Unpack revocation records from journal rows."""
    out = []
    for ev in rows:
        if ev.get("event_type") in ("MC_REVOKED", "REVOKED_AFTER_DISPATCH"):
            _, rec = mi._unpack_summary(
                (ev.get("event_data") or {}).get("summary"))
            if rec:
                out.append((ev.get("event_type"), rec))
    return out


def _ctx(tenant=TENANT, agent="hermes"):
    """Build an AuthenticatedContext for tests."""
    return mi.AuthenticatedContext(agent_id=agent, tenant=tenant,
                                   entitled_tenants=frozenset([tenant]))


def _make_intent(capability="fixture.read", **over):
    inputs = {"pass_id": PASS_ID, "dry_run": True}
    intent = {
        "mission_class": "spine-observe-dry-run",
        "actor": ACTOR,
        "tenant": TENANT,
        "capability": capability,
        "inputs_hash": mi.canonical_inputs_hash(inputs),
        "idempotency_key": "test-intent:%s" % PASS_ID,
        "inputs": inputs,
        "event_bind": {"pass_id": PASS_ID},
    }
    intent.update(over)
    return intent


class FrontDoorTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="mc-intent-test-")
        self.journal = os.path.join(self.tmp, "events.jsonl")
        self.passes_dir = os.path.join(self.tmp, "passes")
        os.makedirs(self.passes_dir)
        self.ledger = os.path.join(self.tmp, "ledger.jsonl")
        with open(self.ledger, "w", encoding="utf-8"):
            pass
        self.adapter = fa.SpineDryRunObserverAdapter(
            observer_path=OBSERVER_PATH, adapter_dir=ADAPTER_DIR)

    def expected_work_order_id(self, idempotency_key):
        task_id = "mc-intent:" + idempotency_key
        return hashlib.sha256(
            ("workorder:" + task_id).encode("utf-8")).hexdigest()[:16]

    def test_valid_intent_flows_end_to_end(self):
        """Valid intent: validate -> authorize (real adapter) -> dispatch
        (real work order + real dry-run observer) -> observe (journal)."""
        result = self.adapter.submit(
            PASS_ID, self.passes_dir, self.ledger, ACTOR, _ctx(TENANT),
            journal_file=self.journal)
        self.assertEqual(result["outcome"], "dispatched")
        self.assertFalse(result["duplicate"])
        self.assertEqual(result["executor_calls"], 1)

        wo = result["work_order"]
        ref_key = "spine-observe:%s:%s" % (TENANT, PASS_ID)
        self.assertEqual(
            wo["work_order_id"],
            self.expected_work_order_id(ref_key))
        self.assertEqual(wo["agent_id"], "hermes")
        self.assertEqual(wo["capability"], "fixture.read")
        self.assertEqual(wo["namespace"], "tenant::" + TENANT)

        ex = result["executor_result"]
        self.assertEqual(ex["status"], "completed")
        self.assertIn("MC_PASS_STARTED", ex["folded_event_types"])

        rows = _read_journal(self.journal)
        recs = _frontdoor_records(rows)
        types = [t for t, _ in recs]
        self.assertIn("MC_GATE_RESULT", types)   # validate pass
        self.assertEqual(types.count("MC_GATE_RESULT"), 2)  # + authorize
        self.assertEqual(types.count("MC_LANE_STARTED"), 1)
        self.assertEqual(types.count("MC_LANE_COMPLETED"), 1)
        auth_rec = [r for t, r in recs
                    if t == "MC_GATE_RESULT" and r.get("stage") == "authorize"][0]
        self.assertEqual(auth_rec["verdict"], "pass")
        done_rec = [r for t, r in recs if t == "MC_LANE_COMPLETED"][0]
        self.assertEqual(done_rec["work_order_id"], wo["work_order_id"])
        self.assertEqual(done_rec["idempotency_key"], ref_key)

    def test_invalid_intent_rejected_at_validate(self):
        """Schema violations fail before any authority call or emission."""
        bad = _make_intent()
        del bad["capability"]
        with self.assertRaises(mi.IntentValidationError):
            mi.submit(bad, "hermes", {}, FakeExecutor(),
                      journal_file=self.journal, adapter_dir=ADAPTER_DIR,
                  auth_ctx=_ctx())
        bad_hash = _make_intent(inputs_hash="not-a-sha256")
        with self.assertRaises(mi.IntentValidationError):
            mi.validate(bad_hash)
        self.assertEqual(_read_journal(self.journal), [])

    def test_unauthorized_capability_denied_at_authorize(self):
        """The EXISTING authority denies email.send for hermes; the
        denial is observed and nothing dispatches."""
        ex = FakeExecutor()
        intent = _make_intent(capability="email.send")
        with self.assertRaises(mi.IntentAuthorizationError) as ctx:
            mi.submit(intent, "hermes",
                      fa.SpineDryRunObserverAdapter.CONSTRAINTS, ex,
                      journal_file=self.journal, adapter_dir=ADAPTER_DIR,
                  auth_ctx=_ctx())
        self.assertIn("email.send", str(ctx.exception))
        self.assertEqual(ex.calls, 0)
        rows = _read_journal(self.journal)
        recs = _frontdoor_records(rows)
        types = [t for t, _ in recs]
        self.assertIn("MC_GATE_RESULT", types)
        self.assertIn("MC_LANE_FAILED", types)
        self.assertNotIn("MC_LANE_STARTED", types)
        deny = [r for t, r in recs if t == "MC_LANE_FAILED"][0]
        self.assertEqual(deny["denied_by"], "existing-authority")
        self.assertIn("email.send", deny["deny_reason"])

    def test_duplicate_intent_idempotent_single_dispatch(self):
        """Same idempotency key twice: one work order, second returns
        the original record; no second dispatch."""
        ex = FakeExecutor()
        intent = _make_intent()
        first = mi.submit(intent, "hermes",
                          fa.SpineDryRunObserverAdapter.CONSTRAINTS, ex,
                          journal_file=self.journal, adapter_dir=ADAPTER_DIR,
                  auth_ctx=_ctx())
        second = mi.submit(intent, "hermes",
                           fa.SpineDryRunObserverAdapter.CONSTRAINTS, ex,
                           journal_file=self.journal, adapter_dir=ADAPTER_DIR,
                  auth_ctx=_ctx())
        self.assertEqual(first["outcome"], "dispatched")
        self.assertEqual(second["outcome"], "duplicate-suppressed")
        self.assertTrue(second["duplicate"])
        self.assertEqual(ex.calls, 1)
        self.assertEqual(second["original"]["work_order_id"],
                         first["work_order"]["work_order_id"])
        rows = _read_journal(self.journal)
        recs = _frontdoor_records(rows)
        types = [t for t, _ in recs]
        self.assertEqual(types.count("MC_LANE_STARTED"), 1)
        self.assertEqual(types.count("MC_LANE_COMPLETED"), 1)
        self.assertEqual(types.count("MC_CHECKPOINT"), 1)
        cp = [r for t, r in recs if t == "MC_CHECKPOINT"][0]
        self.assertEqual(cp["status"], "duplicate-suppressed")

    def test_duplicate_key_with_different_inputs_fails_closed(self):
        """E2: same idempotency key + different bytes must not dedupe."""
        ex = FakeExecutor()
        first_intent = _make_intent()
        mi.submit(first_intent, "hermes",
                  fa.SpineDryRunObserverAdapter.CONSTRAINTS, ex,
                  journal_file=self.journal, adapter_dir=ADAPTER_DIR,
                  auth_ctx=_ctx())
        other = _make_intent(inputs_hash="0" * 64)
        with self.assertRaises(mi.IntentDispatchError):
            mi.submit(other, "hermes",
                      fa.SpineDryRunObserverAdapter.CONSTRAINTS, ex,
                      journal_file=self.journal, adapter_dir=ADAPTER_DIR,
                  auth_ctx=_ctx())
        self.assertEqual(ex.calls, 1)

    def test_duplicate_key_with_different_capability_fails_closed(self):
        """E2 (falsifier D1 repro): same key + different capability with
        identical inputs must fail closed, never duplicate-suppress to
        the first intent's work order. The collision check runs before
        authorize, so the raise is IntentDispatchError (E2), not the
        authority's denial of email.send."""
        ex = FakeExecutor()
        first = _make_intent(capability="fixture.read")
        mi.submit(first, "hermes",
                  fa.SpineDryRunObserverAdapter.CONSTRAINTS, ex,
                  journal_file=self.journal, adapter_dir=ADAPTER_DIR,
                  auth_ctx=_ctx())
        other = _make_intent(capability="email.send")
        self.assertEqual(other["inputs_hash"], first["inputs_hash"])
        with self.assertRaises(mi.IntentDispatchError) as ctx:
            mi.submit(other, "hermes",
                      fa.SpineDryRunObserverAdapter.CONSTRAINTS, ex,
                      journal_file=self.journal, adapter_dir=ADAPTER_DIR,
                  auth_ctx=_ctx())
        self.assertIn("E2", str(ctx.exception))
        self.assertEqual(ex.calls, 1)
        rows = _read_journal(self.journal)
        recs = _frontdoor_records(rows)
        types = [t for t, _ in recs]
        self.assertEqual(types.count("MC_LANE_STARTED"), 1)
        self.assertEqual(types.count("MC_CHECKPOINT"), 0)

    def test_duplicate_key_with_different_tenant_fails_closed(self):
        """E2 (falsifier D1 repro): same key + different inputs in the
        SAME tenant must fail closed. Tenant-scoped idempotency: the
        same key in a DIFFERENT tenant is a different record (no
        cross-tenant duplicate-suppression, no cross-tenant
        disclosure)."""
        ex = FakeExecutor()
        first = _make_intent(tenant="tenant-a")
        mi.submit(first, "hermes",
                  fa.SpineDryRunObserverAdapter.CONSTRAINTS, ex,
                  journal_file=self.journal, adapter_dir=ADAPTER_DIR,
                  auth_ctx=_ctx("tenant-a"))
        # Same tenant, same key, different inputs: E2 collision.
        other_inputs = {"pass_id": "different", "dry_run": True}
        other = _make_intent(tenant="tenant-a")
        other["inputs"] = other_inputs
        other["inputs_hash"] = mi.canonical_inputs_hash(other_inputs)
        with self.assertRaises(mi.IntentDispatchError) as ctx:
            mi.submit(other, "hermes",
                      fa.SpineDryRunObserverAdapter.CONSTRAINTS, ex,
                      journal_file=self.journal, adapter_dir=ADAPTER_DIR,
                      auth_ctx=_ctx("tenant-a"))
        self.assertIn("E2", str(ctx.exception))
        self.assertEqual(ex.calls, 1)
        # Different tenant, same key: NOT a collision (tenant-scoped).
        cross = _make_intent(tenant="tenant-b")
        result = mi.submit(cross, "hermes",
                           fa.SpineDryRunObserverAdapter.CONSTRAINTS, ex,
                           journal_file=self.journal, adapter_dir=ADAPTER_DIR,
                           auth_ctx=_ctx("tenant-b"))
        self.assertEqual(result["outcome"], "dispatched")
        self.assertEqual(ex.calls, 2)
        rows = _read_journal(self.journal)
        recs = _frontdoor_records(rows)
        self.assertFalse(
            any(r.get("tenant") == "tenant-b" and
                r.get("status") == "duplicate-suppressed"
                for _, r in recs))

    def test_duplicate_key_with_different_actor_fails_closed(self):
        """E2: same key + different actor with identical inputs must
        fail closed."""
        ex = FakeExecutor()
        first = _make_intent(actor="mission-control")
        mi.submit(first, "hermes",
                  fa.SpineDryRunObserverAdapter.CONSTRAINTS, ex,
                  journal_file=self.journal, adapter_dir=ADAPTER_DIR,
                  auth_ctx=_ctx())
        other = _make_intent(actor="someone-else")
        with self.assertRaises(mi.IntentDispatchError):
            mi.submit(other, "hermes",
                      fa.SpineDryRunObserverAdapter.CONSTRAINTS, ex,
                      journal_file=self.journal, adapter_dir=ADAPTER_DIR,
                  auth_ctx=_ctx())
        self.assertEqual(ex.calls, 1)

    def test_duplicate_key_with_different_event_bind_fails_closed(self):
        """E2: the collision domain includes event_bind. Same key with
        the same inputs but different bind bytes must fail closed."""
        ex = FakeExecutor()
        first = _make_intent()
        mi.submit(first, "hermes",
                  fa.SpineDryRunObserverAdapter.CONSTRAINTS, ex,
                  journal_file=self.journal, adapter_dir=ADAPTER_DIR,
                  auth_ctx=_ctx())
        other = _make_intent(
            event_bind={"pass_id": PASS_ID, "extra": "divergent"})
        with self.assertRaises(mi.IntentDispatchError):
            mi.submit(other, "hermes",
                      fa.SpineDryRunObserverAdapter.CONSTRAINTS, ex,
                      journal_file=self.journal, adapter_dir=ADAPTER_DIR,
                  auth_ctx=_ctx())
        self.assertEqual(ex.calls, 1)

    def test_legacy_record_without_digest_still_fails_closed(self):
        """Pre-digest legacy records (no MC_WORK_ORDER_ISSUED) have
        unverified terminals: the terminal is ignored, never trusted.
        Key reuse against one does NOT duplicate-suppress to the
        legacy work order; the in-flight guard fails closed."""
        ex = FakeExecutor()
        intent = _make_intent()
        legacy_record = {
            "intent_version": mi.INTENT_VERSION,
            "mission_class": intent["mission_class"],
            "actor": intent["actor"],
            "tenant": intent["tenant"],
            "capability": intent["capability"],
            "inputs_hash": intent["inputs_hash"],
            "idempotency_key": intent["idempotency_key"],
        }
        legacy_record.update(intent["event_bind"])
        legacy_record.update({
            "agent_id": "hermes",
            "namespace": "tenant::" + intent["tenant"],
            "status": "intent-accepted",
        })
        mi.observe([{
            "event_type": "MC_LANE_STARTED",
            "human": "legacy acceptance (pre-D1 record shape)",
            "record": legacy_record,
            "status": "intent-accepted",
        }, {
            "event_type": "MC_LANE_COMPLETED",
            "human": "legacy completion",
            "record": dict(legacy_record, work_order_id="wo-legacy",
                           executor="fake", executor_status="completed",
                           executor_summary="fake ok"),
            "status": "dispatched",
        }], journal_file=self.journal)
        # The legacy terminal is unverified (no issuance chain):
        # it is ignored, so the key is in-flight and reuse is refused
        # (fail closed), never duplicate-suppressed to wo-legacy.
        with self.assertRaises(mi.IntentDispatchError) as ctx:
            mi.submit(dict(intent), "hermes",
                      fa.SpineDryRunObserverAdapter.CONSTRAINTS, ex,
                      journal_file=self.journal, adapter_dir=ADAPTER_DIR,
                      auth_ctx=_ctx())
        self.assertIn("in-flight", str(ctx.exception))
        self.assertEqual(ex.calls, 0)
        other = _make_intent(capability="email.send")
        with self.assertRaises(mi.IntentDispatchError):
            mi.submit(other, "hermes",
                      fa.SpineDryRunObserverAdapter.CONSTRAINTS, ex,
                      journal_file=self.journal, adapter_dir=ADAPTER_DIR,
                  auth_ctx=_ctx())
        self.assertEqual(ex.calls, 0)

    def test_duplicate_key_with_identical_bytes_suppresses(self):
        """Same key + identical canonical bytes (rebuilt dict, shuffled
        key order, separate object) duplicate-suppresses exactly as
        before: one dispatch, original record returned."""
        ex = FakeExecutor()
        first = _make_intent()
        r1 = mi.submit(first, "hermes",
                       fa.SpineDryRunObserverAdapter.CONSTRAINTS, ex,
                       journal_file=self.journal, adapter_dir=ADAPTER_DIR,
                  auth_ctx=_ctx())
        rebuilt = {
            "idempotency_key": first["idempotency_key"],
            "inputs": dict(first["inputs"]),
            "event_bind": dict(first["event_bind"]),
            "capability": first["capability"],
            "tenant": first["tenant"],
            "actor": first["actor"],
            "mission_class": first["mission_class"],
            "inputs_hash": first["inputs_hash"],
        }
        r2 = mi.submit(rebuilt, "hermes",
                       fa.SpineDryRunObserverAdapter.CONSTRAINTS, ex,
                       journal_file=self.journal, adapter_dir=ADAPTER_DIR,
                  auth_ctx=_ctx())
        self.assertEqual(r1["outcome"], "dispatched")
        self.assertEqual(r2["outcome"], "duplicate-suppressed")
        self.assertTrue(r2["duplicate"])
        self.assertEqual(ex.calls, 1)
        self.assertEqual(r2["original"]["work_order_id"],
                         r1["work_order"]["work_order_id"])

    def test_reference_adapter_key_is_tenant_scoped(self):
        """The reference adapter's idempotency key carries the tenant:
        the same pass observed for two tenants dispatches twice, never
        cross-suppressing."""
        key_a = self.adapter.build_intent(
            PASS_ID, self.passes_dir, self.ledger, ACTOR,
            _ctx("tenant-a"))["idempotency_key"]
        key_b = self.adapter.build_intent(
            PASS_ID, self.passes_dir, self.ledger, ACTOR,
            _ctx("tenant-b"))["idempotency_key"]
        self.assertNotEqual(key_a, key_b)
        self.assertIn("tenant-a", key_a)
        self.assertIn("tenant-b", key_b)
        ex = FakeExecutor()
        ra = mi.submit(
            self.adapter.build_intent(
                PASS_ID, self.passes_dir, self.ledger, ACTOR,
                _ctx("tenant-a")),
            "hermes", fa.SpineDryRunObserverAdapter.CONSTRAINTS, ex,
            journal_file=self.journal, adapter_dir=ADAPTER_DIR,
                  auth_ctx=_ctx("tenant-a"))
        rb = mi.submit(
            self.adapter.build_intent(
                PASS_ID, self.passes_dir, self.ledger, ACTOR,
                _ctx("tenant-b")),
            "hermes", fa.SpineDryRunObserverAdapter.CONSTRAINTS, ex,
            journal_file=self.journal, adapter_dir=ADAPTER_DIR,
                  auth_ctx=_ctx("tenant-b"))
        self.assertEqual(ra["outcome"], "dispatched")
        self.assertEqual(rb["outcome"], "dispatched")
        self.assertEqual(ex.calls, 2)
        self.assertNotEqual(ra["work_order"]["work_order_id"],
                            rb["work_order"]["work_order_id"])

    def test_bypass_of_migrated_class_is_detectable(self):
        """A direct MC_PASS_* emission with no covering intent record
        is flagged; a covered pass_id is not."""
        self.assertTrue(fa.is_bypass_illegal("spine-observe-dry-run"))
        self.assertFalse(fa.is_bypass_illegal("some-unmigrated-class"))

        # Route pass A through the front door (dry-run: no MC_PASS_*
        # events emitted by the adapter itself).
        self.adapter.submit(PASS_ID, self.passes_dir, self.ledger,
                            ACTOR, _ctx(TENANT), journal_file=self.journal)

        # Simulate the legacy caller bypassing the front door: direct
        # MC_PASS_* emission via the spine's emit path, no intent.
        other_pass = "x-20260926-130000"
        _spine_emit.emit_pass_event(
            "MC_PASS_STARTED", other_pass, "x",
            {"note": "direct legacy emission, bypassing front door"},
            journal_file=self.journal)
        _spine_emit.emit_pass_event(
            "MC_PASS_STARTED", PASS_ID, "x",
            {"note": "direct emission for the covered pass"},
            journal_file=self.journal)

        report = fa.detect_bypass(self.journal, "spine-observe-dry-run")
        self.assertEqual(report["covered"], [PASS_ID])
        violated = {v["pass_id"] for v in report["violations"]}
        self.assertIn(other_pass, violated)
        self.assertNotIn(PASS_ID, violated)

        with self.assertRaises(ValueError):
            fa.detect_bypass(self.journal, "some-unmigrated-class")

    def test_observe_rejects_unregistered_event_type(self):
        """observe() rides the spine's registered vocabulary only."""
        with self.assertRaises(ValueError):
            mi.observe([{
                "event_type": "MC_INTENT_MADE_UP",
                "human": "nope",
                "record": {},
                "status": "x",
            }], journal_file=self.journal)

    # ------------------------------------------------ H2a: returned failure
    def test_returned_failed_records_lane_failed(self):
        """H2a: an executor RETURNING status="failed" records
        MC_LANE_FAILED, never MC_LANE_COMPLETED. The executor_status
        detail stays in the record."""
        ex = FailedExecutor()
        intent = _make_intent()
        result = mi.submit(intent, "hermes",
                           fa.SpineDryRunObserverAdapter.CONSTRAINTS, ex,
                           journal_file=self.journal, adapter_dir=ADAPTER_DIR,
                  auth_ctx=_ctx())
        self.assertEqual(result["outcome"], "executor-failed")
        self.assertFalse(result["duplicate"])
        self.assertEqual(result["executor_result"]["status"], "failed")
        rows = _read_journal(self.journal)
        recs = _frontdoor_records(rows)
        types = [t for t, _ in recs]
        self.assertEqual(types.count("MC_LANE_COMPLETED"), 0)
        self.assertEqual(types.count("MC_LANE_FAILED"), 1)
        failed = [r for t, r in recs if t == "MC_LANE_FAILED"][0]
        self.assertEqual(failed["executor_status"], "failed")
        self.assertIn("budget exhausted", failed["executor_summary"])
        self.assertEqual(failed["failure_source"], "executor-result")
        info = mi.find_intent_record(self.journal, intent["idempotency_key"])
        self.assertEqual(info["terminal"]["event_type"], "MC_LANE_FAILED")
        self.assertNotIn(info["terminal"]["event_type"], mi.SUCCESS_TERMINALS)
        dup = mi.submit(intent, "hermes",
                        fa.SpineDryRunObserverAdapter.CONSTRAINTS, ex,
                        journal_file=self.journal, adapter_dir=ADAPTER_DIR,
                  auth_ctx=_ctx())
        self.assertEqual(dup["outcome"], "duplicate-suppressed")
        self.assertEqual(dup["original"]["terminal"], "MC_LANE_FAILED")
        self.assertFalse(dup["original"]["terminal_success"])
        self.assertEqual(ex.calls, 1)

    # ------------------------------------------------ H5b: unknown outcome
    def test_unknown_signal_records_lane_unknown(self):
        """H5b: the explicit unknown-outcome signal records
        MC_LANE_UNKNOWN: terminal, never FAILED, never COMPLETED."""
        ex = UnknownExecutor()
        intent = _make_intent()
        result = mi.submit(intent, "hermes",
                           fa.SpineDryRunObserverAdapter.CONSTRAINTS, ex,
                           journal_file=self.journal, adapter_dir=ADAPTER_DIR,
                  auth_ctx=_ctx())
        self.assertEqual(result["outcome"], "executor-unknown")
        self.assertFalse(result["duplicate"])
        rows = _read_journal(self.journal)
        recs = _frontdoor_records(rows)
        types = [t for t, _ in recs]
        self.assertEqual(types.count("MC_LANE_UNKNOWN"), 1)
        self.assertEqual(types.count("MC_LANE_COMPLETED"), 0)
        self.assertEqual(types.count("MC_LANE_FAILED"), 0)
        unk = [r for t, r in recs if t == "MC_LANE_UNKNOWN"][0]
        self.assertEqual(unk["executor_status"], "unknown")
        self.assertTrue(unk["effect_may_have_occurred"])
        self.assertEqual(unk["unknown_reason"], "executor-signaled-unknown")
        info = mi.find_intent_record(self.journal, intent["idempotency_key"])
        self.assertEqual(info["terminal"]["event_type"], "MC_LANE_UNKNOWN")
        self.assertNotIn("MC_LANE_UNKNOWN", mi.SUCCESS_TERMINALS)
        dup = mi.submit(intent, "hermes",
                        fa.SpineDryRunObserverAdapter.CONSTRAINTS, ex,
                        journal_file=self.journal, adapter_dir=ADAPTER_DIR,
                  auth_ctx=_ctx())
        self.assertEqual(dup["original"]["terminal"], "MC_LANE_UNKNOWN")
        self.assertFalse(dup["original"]["terminal_success"])
        self.assertEqual(ex.calls, 1)

    def test_unknown_signal_effect_flag_false_preserved(self):
        """effect_may_have_occurred=False is preserved verbatim in the
        UNKNOWN record (the executor knows the effect did not happen,
        but the outcome is still unconfirmed)."""
        ex = UnknownExecutor(effect_may_have_occurred=False)
        intent = _make_intent()
        mi.submit(intent, "hermes",
                  fa.SpineDryRunObserverAdapter.CONSTRAINTS, ex,
                  journal_file=self.journal, adapter_dir=ADAPTER_DIR,
                  auth_ctx=_ctx())
        rows = _read_journal(self.journal)
        recs = _frontdoor_records(rows)
        unk = [r for t, r in recs if t == "MC_LANE_UNKNOWN"][0]
        self.assertFalse(unk["effect_may_have_occurred"])
        self.assertEqual(
            [t for t, _ in recs].count("MC_LANE_UNKNOWN"), 1)

    def test_unknown_signal_defaults_effect_conservative(self):
        """effect_may_have_occurred omitted from the envelope: the front
        door defaults to True (conservative) and records it."""
        ex = UnknownExecutor(include_effect_flag=False)
        intent = _make_intent()
        mi.submit(intent, "hermes",
                  fa.SpineDryRunObserverAdapter.CONSTRAINTS, ex,
                  journal_file=self.journal, adapter_dir=ADAPTER_DIR,
                  auth_ctx=_ctx())
        rows = _read_journal(self.journal)
        recs = _frontdoor_records(rows)
        unk = [r for t, r in recs if t == "MC_LANE_UNKNOWN"][0]
        self.assertTrue(unk["effect_may_have_occurred"])

    def test_crash_after_possible_effect_records_unknown(self):
        """H5b: an executor that crashes after a possible effect records
        MC_LANE_UNKNOWN, never MC_LANE_FAILED. The effect marker proves
        the crash was post-effect; the protocol cannot tell."""
        self.assertTrue(issubclass(mi.ExecutorOutcomeUnknown,
                                   mi.IntentDispatchError))
        marker = os.path.join(self.tmp, "effect.marker")
        ex = CrashExecutor(marker_path=marker)
        intent = _make_intent()
        with self.assertRaises(mi.ExecutorOutcomeUnknown):
            mi.submit(intent, "hermes",
                      fa.SpineDryRunObserverAdapter.CONSTRAINTS, ex,
                      journal_file=self.journal, adapter_dir=ADAPTER_DIR,
                  auth_ctx=_ctx())
        self.assertTrue(os.path.exists(marker))
        self.assertEqual(ex.calls, 1)
        rows = _read_journal(self.journal)
        recs = _frontdoor_records(rows)
        types = [t for t, _ in recs]
        self.assertIn("MC_LANE_STARTED", types)
        self.assertEqual(types.count("MC_LANE_UNKNOWN"), 1)
        self.assertNotIn("MC_LANE_FAILED", types)
        self.assertNotIn("MC_LANE_COMPLETED", types)
        unk = [r for t, r in recs if t == "MC_LANE_UNKNOWN"][0]
        self.assertEqual(unk["unknown_reason"], "executor-crashed")
        self.assertTrue(unk["effect_may_have_occurred"])
        self.assertTrue(unk["work_order_id"])

    def test_malformed_envelope_records_unknown(self):
        """A malformed result envelope is an unconfirmed outcome (the
        executor ran): MC_LANE_UNKNOWN, not a silent FAILED. This is a
        deliberate hardening change from the pre-hardening behavior,
        which collapsed it to FAILED."""
        ex = BadShapeExecutor()
        intent = _make_intent()
        with self.assertRaises(mi.ExecutorOutcomeUnknown) as ctx:
            mi.submit(intent, "hermes",
                      fa.SpineDryRunObserverAdapter.CONSTRAINTS, ex,
                      journal_file=self.journal, adapter_dir=ADAPTER_DIR,
                  auth_ctx=_ctx())
        self.assertIn("bogus", str(ctx.exception))
        rows = _read_journal(self.journal)
        recs = _frontdoor_records(rows)
        types = [t for t, _ in recs]
        self.assertEqual(types.count("MC_LANE_UNKNOWN"), 1)
        self.assertNotIn("MC_LANE_FAILED", types)
        unk = [r for t, r in recs if t == "MC_LANE_UNKNOWN"][0]
        self.assertEqual(unk["unknown_reason"], "malformed-envelope")
        self.assertTrue(unk["effect_may_have_occurred"])

    def test_no_effect_attestation_stays_failed(self):
        """H5a preserved: an executor that positively attests no effect
        (ExecutorNoEffect, e.g. spawn failure) keeps the honest
        MC_LANE_FAILED: nothing was dispatched into the world."""
        ex = SpawnFailExecutor()
        intent = _make_intent()
        with self.assertRaises(mi.IntentDispatchError) as ctx:
            mi.submit(intent, "hermes",
                      fa.SpineDryRunObserverAdapter.CONSTRAINTS, ex,
                      journal_file=self.journal, adapter_dir=ADAPTER_DIR,
                  auth_ctx=_ctx())
        self.assertNotIsInstance(ctx.exception, mi.ExecutorOutcomeUnknown)
        self.assertIn("spawn failed", str(ctx.exception))
        rows = _read_journal(self.journal)
        recs = _frontdoor_records(rows)
        types = [t for t, _ in recs]
        self.assertEqual(types.count("MC_LANE_FAILED"), 1)
        self.assertNotIn("MC_LANE_UNKNOWN", types)

    # ------------------------------------------------ H7: revocation
    def test_revoke_before_dispatch_blocks_submit(self):
        """H7: revoke() with no prior record emits MC_REVOKED; a later
        submit refuses before authorize with zero dispatch."""
        key = "test-revoke-predispatch:%s" % PASS_ID
        intent = _make_intent(idempotency_key=key)
        rev = mi.revoke(key, "operator stop: wrong capability",
                        journal_file=self.journal, auth_ctx=_ctx())
        self.assertTrue(rev["revoked"])
        self.assertFalse(rev["duplicate"])
        self.assertEqual(rev["classification"], "no-dispatch-recorded")
        rows = _read_journal(self.journal)
        revs = _revocation_records(rows)
        self.assertEqual([t for t, _ in revs], ["MC_REVOKED"])
        self.assertEqual(revs[0][1]["reason"],
                         "operator stop: wrong capability")
        ex = FakeExecutor()
        with self.assertRaises(mi.IntentRevokedError) as ctx:
            mi.submit(intent, "hermes",
                      fa.SpineDryRunObserverAdapter.CONSTRAINTS, ex,
                      journal_file=self.journal, adapter_dir=ADAPTER_DIR,
                  auth_ctx=_ctx())
        self.assertIn("revoked", str(ctx.exception))
        self.assertEqual(ex.calls, 0)
        rows = _read_journal(self.journal)
        recs = _frontdoor_records(rows)
        types = [t for t, _ in recs]
        self.assertNotIn("MC_LANE_STARTED", types)
        auth_gates = [r for t, r in recs
                      if t == "MC_GATE_RESULT"
                      and r.get("stage") == "authorize"]
        self.assertEqual(auth_gates, [])
        refused = [r for t, r in recs
                   if t == "MC_CHECKPOINT"
                   and r.get("status") == "revoked-refused"]
        self.assertEqual(len(refused), 1)

    def test_revoke_validates_key_and_reason(self):
        """Revocation needs a well-formed key and a non-empty reason;
        invalid calls emit nothing."""
        with self.assertRaises(mi.IntentValidationError):
            mi.revoke("bad key with spaces!!", "x",
                      journal_file=self.journal)
        with self.assertRaises(mi.IntentValidationError):
            mi.revoke("ok-key:1", "   ", journal_file=self.journal)
        self.assertEqual(_read_journal(self.journal), [])

    def test_revoke_is_idempotent(self):
        """A second revoke() returns the existing revocation and emits
        nothing new."""
        key = "test-revoke-idem:%s" % PASS_ID
        first = mi.revoke(key, "reason one", journal_file=self.journal)
        second = mi.revoke(key, "reason two", journal_file=self.journal)
        self.assertTrue(second["duplicate"])
        self.assertEqual(second["revocation"]["reason"], "reason one")
        self.assertEqual(first["classification"],
                         second["classification"])
        rows = _read_journal(self.journal)
        self.assertEqual(len(_revocation_records(rows)), 1)

    def test_revoke_after_completed_classifies_committed(self):
        """H7 disposition #7: committed -> record reality. Revocation is
        sticky: later submits refuse with zero new dispatch."""
        ex = FakeExecutor()
        intent = _make_intent(
            idempotency_key="test-revoke-committed:%s" % PASS_ID)
        mi.submit(intent, "hermes",
                  fa.SpineDryRunObserverAdapter.CONSTRAINTS, ex,
                  journal_file=self.journal, adapter_dir=ADAPTER_DIR,
                  auth_ctx=_ctx())
        rev = mi.revoke(intent["idempotency_key"], "operator stop",
                        journal_file=self.journal)
        self.assertEqual(rev["classification"], "already-committed")
        self.assertEqual(rev["effect_status"], "committed")
        rows = _read_journal(self.journal)
        revs = _revocation_records(rows)
        self.assertEqual([t for t, _ in revs], ["REVOKED_AFTER_DISPATCH"])
        self.assertEqual(revs[0][1]["classification"], "already-committed")
        self.assertEqual(revs[0][1]["effect_status"], "committed")
        with self.assertRaises(mi.IntentRevokedError):
            mi.submit(intent, "hermes",
                      fa.SpineDryRunObserverAdapter.CONSTRAINTS, ex,
                      journal_file=self.journal, adapter_dir=ADAPTER_DIR,
                  auth_ctx=_ctx())
        self.assertEqual(ex.calls, 1)

    def test_revoke_after_returned_failed_classifies(self):
        """H7 disposition #7: a returned-failed terminal classifies as
        already-failed with the executor's failure preserved."""
        ex = FailedExecutor()
        intent = _make_intent(
            idempotency_key="test-revoke-failed:%s" % PASS_ID)
        mi.submit(intent, "hermes",
                  fa.SpineDryRunObserverAdapter.CONSTRAINTS, ex,
                  journal_file=self.journal, adapter_dir=ADAPTER_DIR,
                  auth_ctx=_ctx())
        rev = mi.revoke(intent["idempotency_key"], "operator stop",
                        journal_file=self.journal)
        self.assertEqual(rev["classification"], "already-failed")
        rows = _read_journal(self.journal)
        revs = _revocation_records(rows)
        self.assertEqual(revs[0][1]["effect_status"], "failed-per-executor")

    def test_revoke_after_denial_is_pre_dispatch(self):
        """A denied intent never dispatched: revocation is MC_REVOKED,
        not REVOKED_AFTER_DISPATCH."""
        ex = FakeExecutor()
        intent = _make_intent(capability="email.send",
                              idempotency_key="test-revoke-denied:%s"
                              % PASS_ID)
        with self.assertRaises(mi.IntentAuthorizationError):
            mi.submit(intent, "hermes",
                      fa.SpineDryRunObserverAdapter.CONSTRAINTS, ex,
                      journal_file=self.journal, adapter_dir=ADAPTER_DIR,
                  auth_ctx=_ctx())
        rev = mi.revoke(intent["idempotency_key"], "operator stop",
                        journal_file=self.journal)
        self.assertEqual(rev["classification"], "no-dispatch-recorded")
        rows = _read_journal(self.journal)
        self.assertEqual([t for t, _ in _revocation_records(rows)],
                         ["MC_REVOKED"])

    def test_revoke_in_flight_classifies_uncertain(self):
        """H7 disposition #7: no terminal yet -> uncertain ->
        UNKNOWN/HOLD/RECONCILE."""
        intent = _make_intent(
            idempotency_key="test-revoke-inflight:%s" % PASS_ID)
        mi.observe([{
            "event_type": "MC_LANE_STARTED",
            "human": "synthetic in-flight acceptance",
            "record": mi._intent_record(intent, {
                "agent_id": "hermes",
                "namespace": "tenant::" + TENANT,
                "status": "intent-accepted",
            }),
            "status": "intent-accepted",
        }], journal_file=self.journal)
        rev = mi.revoke(intent["idempotency_key"], "operator stop",
                        journal_file=self.journal)
        self.assertEqual(rev["classification"], "in-flight-uncertain")
        rows = _read_journal(self.journal)
        revs = _revocation_records(rows)
        self.assertEqual([t for t, _ in revs], ["REVOKED_AFTER_DISPATCH"])
        self.assertEqual(revs[0][1]["effect_status"], "unknown")
        self.assertIsNone(revs[0][1]["prior_terminal"])

    def test_revoke_after_unknown_classifies_unknown_hold(self):
        """H7 disposition #7: an UNKNOWN terminal stays HOLD/RECONCILE."""
        ex = UnknownExecutor()
        intent = _make_intent(
            idempotency_key="test-revoke-unknown:%s" % PASS_ID)
        mi.submit(intent, "hermes",
                  fa.SpineDryRunObserverAdapter.CONSTRAINTS, ex,
                  journal_file=self.journal, adapter_dir=ADAPTER_DIR,
                  auth_ctx=_ctx())
        rev = mi.revoke(intent["idempotency_key"], "operator stop",
                        journal_file=self.journal)
        self.assertEqual(rev["classification"], "unknown-hold")
        rows = _read_journal(self.journal)
        revs = _revocation_records(rows)
        self.assertEqual(revs[0][1]["effect_status"], "unknown")
        self.assertEqual(revs[0][1]["prior_terminal"], "MC_LANE_UNKNOWN")

    def test_mid_flight_revocation_records_late_outcome(self):
        """H7: revocation lands while the executor runs. No routine
        terminal is emitted; the late outcome is recorded on the
        revocation (record reality), and the submitter is told the key
        was revoked."""
        key = "test-revoke-midflight:%s" % PASS_ID
        intent = _make_intent(idempotency_key=key)
        ex = SleepExecutor(seconds=2.0)
        holder = {}

        def run():
            try:
                holder["result"] = mi.submit(
                    intent, "hermes",
                    fa.SpineDryRunObserverAdapter.CONSTRAINTS, ex,
                    journal_file=self.journal, adapter_dir=ADAPTER_DIR,
                  auth_ctx=_ctx())
            except Exception as e:  # noqa: BLE001 - recorded, asserted below
                holder["error"] = e

        th = threading.Thread(target=run, daemon=True)
        th.start()
        try:
            self.assertTrue(_wait_for_started(self.journal, key),
                            "MC_LANE_STARTED never landed")
            rev = mi.revoke(key, "operator stop mid-flight",
                            journal_file=self.journal)
            self.assertEqual(rev["classification"], "in-flight-uncertain")
            th.join(timeout=30)
            self.assertFalse(th.is_alive(), "submit thread hung")
        finally:
            th.join(timeout=30)
        err = holder.get("error")
        self.assertIsInstance(err, mi.IntentRevokedError)
        self.assertEqual(ex.calls, 1)
        rows = _read_journal(self.journal)
        recs = _frontdoor_records(rows)
        types = [t for t, _ in recs]
        self.assertNotIn("MC_LANE_COMPLETED", types)
        revs = _revocation_records(rows)
        self.assertEqual([t for t, _ in revs],
                         ["REVOKED_AFTER_DISPATCH", "REVOKED_AFTER_DISPATCH"])
        late = revs[1][1]
        self.assertEqual(late["classification"],
                         "revoked-in-flight-late-commit")
        self.assertEqual(late["late_executor_status"], "completed")
        self.assertEqual(late["effect_status"], "committed")

    def test_find_revocation_returns_none_when_absent(self):
        self.assertIsNone(mi.find_revocation(
            self.journal, "test-intent:%s" % PASS_ID))


class RawDispatchRevocationTest(unittest.TestCase):
    """H7 defect-3 (2026-09-27): dispatch() enforces revocation itself.

    A revoked key refuses with zero dispatch even when dispatch() is
    called directly, bypassing submit()'s bracketing checks: no work
    order is issued, the executor never runs, and the refusal is
    observed. Before this fix, dispatch() documented that direct callers
    had to check find_revocation() themselves.
    """

    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="mc-intent-d3-")
        self.journal = os.path.join(self.tmp, "events.jsonl")

    def _granted_verdict(self, intent):
        constraints = {
            "read_only": True,
            "no_writes": True,
            "no_network": True,
            "no_canonical_events": True,
            "no_mission_state_writes": True,
        }
        verdict = mi.authorize(intent, "hermes", constraints,
                               adapter_dir=ADAPTER_DIR)
        # submit() evaluates issuance under identical constraints to the
        # grant; a direct dispatch() caller does the same.
        return dict(verdict, constraints=constraints)

    def test_direct_dispatch_refuses_revoked_key(self):
        intent = _make_intent()
        verdict = self._granted_verdict(intent)
        self.assertTrue(verdict.get("granted"))
        mi.revoke(intent["idempotency_key"], "operator stop",
                  journal_file=self.journal)
        ex = FakeExecutor()
        with self.assertRaises(mi.IntentRevokedError):
            mi.dispatch(intent, verdict, ex, adapter_dir=ADAPTER_DIR,
                        journal_file=self.journal)
        self.assertEqual(ex.calls, 0)
        rows = _read_journal(self.journal)
        types = [ev.get("event_type") for ev in rows]
        self.assertNotIn("MC_WORK_ORDER_ISSUED", types)
        self.assertNotIn("MC_LANE_STARTED", types)
        self.assertIn("MC_REVOKED", types)

    def test_direct_dispatch_runs_unrevoked_key(self):
        intent = _make_intent()
        verdict = self._granted_verdict(intent)
        ex = FakeExecutor()
        out = mi.dispatch(intent, verdict, ex, adapter_dir=ADAPTER_DIR,
                          journal_file=self.journal)
        self.assertEqual(ex.calls, 1)
        self.assertEqual(out["executor_result"]["status"], "completed")
        rows = _read_journal(self.journal)
        types = [ev.get("event_type") for ev in rows]
        self.assertIn("MC_WORK_ORDER_ISSUED", types)


if __name__ == "__main__":
    unittest.main()
