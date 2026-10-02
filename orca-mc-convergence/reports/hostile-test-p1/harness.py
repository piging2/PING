#!/usr/bin/env python3
"""Hostile tests for the MissionIntent front door (P1 runtime hostile-test).

Synthetic, replay-only. No live dispatch, no network, no real worker
spawns. Every test uses an isolated temp journal; the real PING journal
is never touched. Authorization verdicts for the "real adapter" tests
come from the vendored ExternalAgentAdapter via local node (no mock
authority); executors are fake.

Usage: python3 harness.py
Exit 0 always; results are printed as PASS/FAIL lines.
"""
import json
import os
import subprocess
import sys
import tempfile
import threading
import time

_HERE = os.path.dirname(os.path.abspath(__file__))
_MC = "/tmp/mc-hostile-test/mission-control"
_WT = "/tmp/mc-hostile-test"
if _MC not in sys.path:
    sys.path.insert(0, _MC)

import mission_intent as mi
import frontdoor_adapters as fa

ADAPTER_DIR = os.path.join(_WT, "orca-adapter")
CONSTRAINTS = dict(fa.SpineDryRunObserverAdapter.CONSTRAINTS)
RESULTS = []


def report(test_id, verdict, detail):
    RESULTS.append((test_id, verdict, detail))
    print("[%s] %s: %s" % (verdict, test_id, detail), flush=True)


def new_journal():
    d = tempfile.mkdtemp(prefix="mc-hostile-")
    return os.path.join(d, "events.jsonl")


def read_journal(path):
    rows = []
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    rows.append(json.loads(line))
    return rows


def frontdoor_records(path):
    out = []
    for ev in read_journal(path):
        if ev.get("aggregate_id") != "mc:lane:" + mi.INTENT_LANE:
            continue
        _, rec = mi._unpack_summary((ev.get("event_data") or {}).get("summary"))
        if rec:
            rec = dict(rec)
            # event-level status travels outside the packed record
            rec["_event_status"] = (ev.get("event_data") or {}).get("status")
            out.append((ev.get("event_type"), rec))
    return out


def event_types(path):
    return [t for t, _ in frontdoor_records(path)]


_KEYN = [0]


def make_intent(key=None, **over):
    _KEYN[0] += 1
    inputs = {"pass_id": "hostile-%d" % _KEYN[0], "dry_run": True}
    intent = {
        "mission_class": "spine-observe-dry-run",
        "actor": "mission-control",
        "tenant": "mc-hostile",
        "capability": "fixture.read",
        "inputs_hash": mi.canonical_inputs_hash(inputs),
        "idempotency_key": key or ("hostile-key-%d" % _KEYN[0]),
        "inputs": inputs,
        "event_bind": {"pass_id": inputs["pass_id"]},
    }
    intent.update(over)
    return intent


class OkExecutor(mi.Executor):
    name = "ok-executor"

    def __init__(self):
        self.calls = 0

    def execute(self, intent, work_order):
        self.calls += 1
        return {"status": "completed", "summary": "ok", "artifacts": []}


class SpawnFailExecutor(mi.Executor):
    name = "spawn-fail-executor"

    def __init__(self):
        self.calls = 0

    def execute(self, intent, work_order):
        self.calls += 1
        raise OSError("spawn failed: worker process could not start "
                      "(exec format error)")


class EffectThenCrashExecutor(mi.Executor):
    """Performs an external effect (marker file), THEN crashes."""
    name = "effect-then-crash-executor"

    def __init__(self, marker):
        self.calls = 0
        self.marker = marker

    def execute(self, intent, work_order):
        self.calls += 1
        with open(self.marker, "w") as f:
            f.write("external effect happened")
        raise RuntimeError("worker crashed AFTER performing external effect")


class ReturnedFailExecutor(mi.Executor):
    """Clean failure reported via the typed result, not an exception."""
    name = "returned-fail-executor"

    def __init__(self):
        self.calls = 0

    def execute(self, intent, work_order):
        self.calls += 1
        return {"status": "failed",
                "summary": "token budget exhausted at 78% of run",
                "artifacts": []}


class BadShapeExecutor(mi.Executor):
    name = "bad-shape-executor"

    def execute(self, intent, work_order):
        return {"status": "weird", "summary": "not a legal status"}


class SleepExecutor(mi.Executor):
    name = "sleep-executor"

    def __init__(self, secs):
        self.calls = 0
        self.secs = secs
        self.elapsed = None

    def execute(self, intent, work_order):
        self.calls += 1
        t0 = time.time()
        time.sleep(self.secs)
        self.elapsed = time.time() - t0
        return {"status": "completed", "summary": "slept", "artifacts": []}


# ---------------------------------------------------------------- H1
def h1_capability_absence():
    """Policy DENIAL: hermes requests email.send, which the existing
    authority does not grant."""
    j = new_journal()
    ex = OkExecutor()
    intent = make_intent(capability="email.send")
    try:
        mi.submit(intent, "hermes", CONSTRAINTS, ex,
                  journal_file=j, adapter_dir=ADAPTER_DIR)
        report("H1", "FAIL", "submit did not raise for ungranted capability")
        return
    except mi.IntentAuthorizationError as e:
        msg = str(e)
    types = event_types(j)
    recs = frontdoor_records(j)
    deny = [r for t, r in recs if t == "MC_LANE_FAILED"]
    ok = (
        "email.send" in msg
        and ex.calls == 0
        and "MC_LANE_STARTED" not in types
        and types.count("MC_GATE_RESULT") == 2
        and "MC_LANE_FAILED" in types
        and deny and deny[0].get("_event_status") == "denied"
        and deny[0].get("denied_by") == "existing-authority"
        and "email.send" in (deny[0].get("deny_reason") or "")
    )
    auth_gate = [r for t, r in recs
                 if t == "MC_GATE_RESULT" and r.get("stage") == "authorize"]
    report("H1", "PASS" if ok else "FAIL",
           "denial honest: IntentAuthorizationError(%r); MC_GATE_RESULT "
           "authorize verdict=%s; MC_LANE_FAILED event_status=%s denied_by=%s; "
           "executor.calls=%d; no MC_LANE_STARTED"
           % (msg[:90],
              auth_gate[0].get("verdict") if auth_gate else "?",
              deny[0].get("_event_status") if deny else "?",
              deny[0].get("denied_by") if deny else "?",
              ex.calls))


# ---------------------------------------------------------------- H2
def h2a_budget_exhaustion_returned_failure():
    """Executor reports failure via typed result (budget exhausted)."""
    j = new_journal()
    ex = ReturnedFailExecutor()
    intent = make_intent()
    try:
        result = mi.submit(intent, "hermes", CONSTRAINTS, ex,
                           journal_file=j, adapter_dir=ADAPTER_DIR)
    except Exception as e:
        report("H2a", "FAIL",
               "returned status='failed' raised %r (should not raise)" % e)
        return
    types = event_types(j)
    recs = frontdoor_records(j)
    done = [r for t, r in recs if t == "MC_LANE_COMPLETED"]
    failed_lane = "MC_LANE_FAILED" in types
    ok = (result["outcome"] == "dispatched" and done
          and done[0].get("executor_status") == "failed")
    if ok and not failed_lane:
        report("H2a", "FAIL",
               "AMBIGUOUS: executor returned status='failed' (budget "
               "exhausted) but the lane terminal event is MC_LANE_COMPLETED "
               "with record executor_status='failed'; no MC_LANE_FAILED. "
               "The failure class is visible only inside the packed record, "
               "not in the event type. find_intent_record() treats this as "
               "a completed terminal.")
    elif ok:
        report("H2a", "PASS",
               "returned failure recorded as MC_LANE_FAILED")
    else:
        report("H2a", "FAIL", "unexpected outcome=%r types=%r"
               % (result.get("outcome"), types))


def h2b_no_budget_concept():
    """The front door has no budget counters: 30 sequential submits all
    dispatch; no budget-denial signal exists anywhere in the code."""
    j = new_journal()
    ex = OkExecutor()
    n = 30
    for _ in range(n):
        mi.submit(make_intent(), "hermes", CONSTRAINTS, ex,
                  journal_file=j, adapter_dir=ADAPTER_DIR)
    types = event_types(j)
    ok = (ex.calls == n and types.count("MC_LANE_STARTED") == n
          and types.count("MC_LANE_COMPLETED") == n)
    report("H2b", "PASS" if ok else "FAIL",
           "no budget gate in front door: %d/%d submits dispatched, "
           "executor.calls=%d; quota gating lives outside this code "
           "(vendored adapter notes: dispatcher checks quota before "
           "issuing; front door has zero budget/saturation counters)"
           % (types.count("MC_LANE_COMPLETED"), n, ex.calls))


# ---------------------------------------------------------------- H3
def h3_saturation():
    """Saturation: the front door has no dispatcher queue; observed =
    unbounded sequential dispatch."""
    j = new_journal()
    ex = OkExecutor()
    n = 40
    for _ in range(n):
        mi.submit(make_intent(), "hermes", CONSTRAINTS, ex,
                  journal_file=j, adapter_dir=ADAPTER_DIR)
    types = event_types(j)
    ok = ex.calls == n and "MC_HOLD_RAISED" not in types
    report("H3", "PASS" if ok else "FAIL",
           "no saturation model: %d rapid submits all dispatched "
           "(MC_LANE_STARTED x%d); no queue-full/backpressure signal "
           "exists in the front door" % (n, types.count("MC_LANE_STARTED")))


# ---------------------------------------------------------------- H4
def h4a_adapter_dir_missing():
    """Existing authority unreachable: vendored adapter absent."""
    j = new_journal()
    ex = OkExecutor()
    try:
        mi.submit(make_intent(), "hermes", CONSTRAINTS, ex,
                  journal_file=j, adapter_dir="/tmp/does-not-exist")
        report("H4a", "FAIL", "submit did not raise with missing adapter")
        return
    except mi.IntentAuthorizationError as e:
        msg = str(e)
    types = event_types(j)
    ok = ("unreachable" in msg and ex.calls == 0
          and types == ["MC_GATE_RESULT"]   # validate-pass only
          and "MC_LANE_FAILED" not in types
          and "MC_LANE_STARTED" not in types)
    # A resubmit with the same key must retry authorization (no record).
    intent2 = make_intent(key="h4a-retry-key")
    try:
        mi.submit(intent2, "hermes", CONSTRAINTS, ex,
                  journal_file=j, adapter_dir="/tmp/does-not-exist")
    except mi.IntentAuthorizationError:
        pass
    types2 = event_types(j)
    report("H4a", "PASS" if ok else "FAIL",
           "unreachable authority fail-closed: IntentAuthorizationError(%r); "
           "journal=%r (validate-pass only, no terminal, no MC_LANE_STARTED); "
           "second attempt re-tried authorization (types now %r)"
           % (msg[:80], types, types2))


def h4b_node_missing():
    """Existing authority unreachable: node binary absent."""
    j = new_journal()
    ex = OkExecutor()
    try:
        mi.submit(make_intent(), "hermes", CONSTRAINTS, ex,
                  journal_file=j, adapter_dir=ADAPTER_DIR,
                  node_bin="node-binary-that-does-not-exist")
        report("H4b", "FAIL", "submit did not raise with missing node")
        return
    except mi.IntentAuthorizationError as e:
        msg = str(e)
    types = event_types(j)
    ok = ("unreachable" in msg and ex.calls == 0
          and "MC_LANE_FAILED" not in types
          and "MC_LANE_STARTED" not in types)
    report("H4b", "PASS" if ok else "FAIL",
           "shim transport failure fail-closed: IntentAuthorizationError(%r); "
           "journal types=%r; executor.calls=%d" % (msg[:80], types, ex.calls))


def h4c_issuance_denial():
    """Work-order issuance denied by the existing authority
    (WORK_ORDER_DENIED at issue time, via direct _issue_work_order with
    constraints the authority rejects)."""
    j = new_journal()
    intent = make_intent()
    verdict = {"granted": True, "reason": "test",
               "agent_id": "hermes", "capability": "fixture.read",
               "namespace": "tenant::mc-hostile",
               "constraints": {"read_only": True}}  # missing required trues
    try:
        mi._issue_work_order(intent, verdict, ADAPTER_DIR)
        report("H4c", "FAIL", "_issue_work_order did not raise")
        return
    except mi.IntentAuthorizationError as e:
        msg = str(e)
    ok = "work order denied by existing authority" in msg
    report("H4c", "PASS" if ok else "FAIL",
           "issuance denial signal: IntentAuthorizationError(%r); the "
           "adapter re-runs authorizeWorkOrder inside issueWorkOrder and "
           "throws code=WORK_ORDER_DENIED" % msg[:100])


# ---------------------------------------------------------------- H5
def h5a_spawn_failure():
    """Worker process fails to start (executor raises OSError)."""
    j = new_journal()
    ex = SpawnFailExecutor()
    try:
        mi.submit(make_intent(), "hermes", CONSTRAINTS, ex,
                  journal_file=j, adapter_dir=ADAPTER_DIR)
        report("H5a", "FAIL", "submit did not raise on spawn failure")
        return
    except mi.IntentDispatchError as e:
        msg = str(e)
    types = event_types(j)
    recs = frontdoor_records(j)
    fail = [r for t, r in recs if t == "MC_LANE_FAILED"]
    ok = (ex.calls == 1 and "spawn failed" in msg
          and "MC_LANE_STARTED" in types and "MC_LANE_FAILED" in types
          and fail and fail[0].get("_event_status") == "dispatch-failed"
          and "spawn failed" in (fail[0].get("failure") or ""))
    report("H5a", "PASS" if ok else "FAIL",
           "spawn failure honest: IntentDispatchError(%r); "
           "MC_LANE_STARTED then MC_LANE_FAILED event_status=%s; executor.calls=%d"
           % (msg[:80], fail[0].get("_event_status") if fail else "?",
              ex.calls))


def h5b_effect_then_crash():
    """Worker performs an external effect, THEN crashes. The code cannot
    know the effect happened: it reports FAILED, not UNKNOWN."""
    j = new_journal()
    marker = os.path.join(tempfile.mkdtemp(prefix="mc-hostile-"),
                           "effect.marker")
    ex = EffectThenCrashExecutor(marker)
    try:
        mi.submit(make_intent(), "hermes", CONSTRAINTS, ex,
                  journal_file=j, adapter_dir=ADAPTER_DIR)
        report("H5b", "FAIL", "submit did not raise on crash")
        return
    except mi.IntentDispatchError as e:
        msg = str(e)
    effect_happened = os.path.exists(marker)
    types = event_types(j)
    ok = (effect_happened and "MC_LANE_FAILED" in types
          and "MC_HOLD_RAISED" not in types)
    if ok:
        report("H5b", "FAIL",
               "MISREPORT: external effect DID happen (marker file exists) "
               "but the mission is recorded MC_LANE_FAILED "
               "status=dispatch-failed, IntentDispatchError(%r). The code "
               "cannot distinguish 'crashed before effect' from 'crashed "
               "after effect'; both collapse to FAILED, never UNKNOWN."
               % msg[:70])
    else:
        report("H5b", "FAIL", "unexpected: effect=%r types=%r"
               % (effect_happened, types))


def h5c_bad_executor_shape():
    """Executor returns an illegal status string."""
    j = new_journal()
    ex = BadShapeExecutor()
    try:
        mi.submit(make_intent(), "hermes", CONSTRAINTS, ex,
                  journal_file=j, adapter_dir=ADAPTER_DIR)
        report("H5c", "FAIL", "submit did not raise on bad shape")
        return
    except mi.IntentDispatchError as e:
        msg = str(e)
    ok = "executor status must be" in msg
    report("H5c", "PASS" if ok else "FAIL",
           "_check_executor_result gate: IntentDispatchError(%r)" % msg[:80])


# ---------------------------------------------------------------- H6
def h6a_observer_timeout():
    """Reference executor's subprocess timeout -> dispatch-failed."""
    j = new_journal()
    slow = os.path.join(tempfile.mkdtemp(prefix="mc-hostile-"),
                         "slow_observer.py")
    with open(slow, "w") as f:
        f.write("import time\ntime.sleep(3)\nprint('[]')\n")
    ex = fa._DryRunObserverExecutor(
        slow, tempfile.mkdtemp(prefix="mc-hostile-"),
        os.path.join(tempfile.mkdtemp(prefix="mc-hostile-"), "ledger.jsonl"),
        timeout_s=0.5)
    intent = make_intent()
    intent["inputs"] = {"pass_id": "x"}
    try:
        mi.submit(intent, "hermes", CONSTRAINTS, ex,
                  journal_file=j, adapter_dir=ADAPTER_DIR)
        report("H6a", "FAIL", "submit did not raise on observer timeout")
        return
    except mi.IntentDispatchError as e:
        msg = str(e)
    types = event_types(j)
    ok = ("failed" in msg and "MC_LANE_FAILED" in types)
    report("H6a", "PASS" if ok else "FAIL",
           "executor timeout -> IntentDispatchError(%r); MC_LANE_FAILED; "
           "no distinct TIMEOUT class exists (timeout is reported as "
           "dispatch-failed)" % msg[:80])


def h6b_no_watchdog():
    """A slow executor is not interrupted: the front door enforces no
    wall-clock budget (the work-order deadline is recorded, never
    checked)."""
    j = new_journal()
    ex = SleepExecutor(2.5)
    intent = make_intent()
    holder = {}
    t0 = time.time()

    def run():
        try:
            holder["result"] = mi.submit(
                intent, "hermes", CONSTRAINTS, ex,
                journal_file=j, adapter_dir=ADAPTER_DIR)
        except Exception as e:  # noqa
            holder["error"] = e

    th = threading.Thread(target=run, daemon=True)
    th.start()
    th.join(timeout=1.0)
    still_running_at_1s = th.is_alive()
    th.join(timeout=10)
    wall = time.time() - t0
    types = event_types(j)
    wo_deadline = None
    recs = frontdoor_records(j)
    ok = (still_running_at_1s and holder.get("result")
          and holder["result"]["outcome"] == "dispatched"
          and ex.elapsed is not None and ex.elapsed >= 2.4
          and "MC_LANE_COMPLETED" in types
          and not any("TIMEOUT" in t for t in types))
    report("H6b", "PASS" if ok else "FAIL",
           "no watchdog: 2.5s executor still running at t=1s (%r); submit "
           "blocked %.1fs total, then MC_LANE_COMPLETED; the work-order "
           "deadline (+600s, recorded on the order) is never enforced by "
           "the front door" % (still_running_at_1s, wall))


# ---------------------------------------------------------------- H7
def h7_cancellation():
    """Revocation/cancellation: no such concept exists in the front door.
    Static check + behavioral proof that a mid-execution 'revocation'
    cannot block dispatch."""
    src_files = ["mission_intent.py", "frontdoor_adapters.py",
                 "_adapter_shim.js"]
    hits = []
    for fn in src_files:
        p = os.path.join(_MC, fn)
        with open(p, encoding="utf-8") as f:
            body = f.read().lower()
        for kw in ("revok", "cancel"):
            if kw in body:
                hits.append((fn, kw))
    emit_types = set()
    p = os.path.join(_MC, "emit.py")
    with open(p, encoding="utf-8") as f:
        for line in f:
            if "MC_" in line and '"' in line:
                for tok in line.replace(",", " ").replace('"', " ").split():
                    if tok.startswith("MC_"):
                        emit_types.add(tok)
    cancel_types = [t for t in emit_types if "CANCEL" in t or "REVOK" in t]

    # Behavioral: mid-execution "revocation" has no API; mission completes.
    j = new_journal()
    ex = SleepExecutor(2.0)
    holder = {}

    def run():
        try:
            holder["result"] = mi.submit(
                make_intent(), "hermes", CONSTRAINTS, ex,
                journal_file=j, adapter_dir=ADAPTER_DIR)
        except Exception as e:  # noqa
            holder["error"] = e

    th = threading.Thread(target=run, daemon=True)
    th.start()
    time.sleep(0.8)  # "revocation arrives mid-execution" -- nothing to call
    th.join(timeout=15)
    completed = holder.get("result", {}).get("outcome") == "dispatched"
    if not hits and not cancel_types and completed:
        report("H7", "FAIL",
               "GAP: no revocation/cancellation concept anywhere in the "
               "front door (grep revok|cancel in %s: no hits; no "
               "MC_*CANCEL*/*REVOK* event type). A mid-execution revocation "
               "cannot be expressed, so it cannot block dispatch: the "
               "2.0s mission ran to MC_LANE_COMPLETED despite the "
               "'revocation'. Revocation does NOT block new dispatch "
               "because revocation does not exist." % src_files)
    else:
        report("H7", "FAIL",
               "unexpected revocation surface: hits=%r cancel_types=%r "
               "completed=%r" % (hits, cancel_types, completed))


# ---------------------------------------------------------------- H8
def h8a_duplicate_suppressed():
    """Same key twice: exactly one dispatch."""
    j = new_journal()
    ex = OkExecutor()
    intent = make_intent(key="h8a-key")
    r1 = mi.submit(intent, "hermes", CONSTRAINTS, ex,
                   journal_file=j, adapter_dir=ADAPTER_DIR)
    r2 = mi.submit(dict(intent), "hermes", CONSTRAINTS, ex,
                   journal_file=j, adapter_dir=ADAPTER_DIR)
    types = event_types(j)
    recs = frontdoor_records(j)
    cp = [r for t, r in recs if t == "MC_CHECKPOINT"]
    ok = (r1["outcome"] == "dispatched"
          and r2["outcome"] == "duplicate-suppressed" and r2["duplicate"]
          and ex.calls == 1
          and types.count("MC_LANE_STARTED") == 1
          and types.count("MC_LANE_COMPLETED") == 1
          and types.count("MC_CHECKPOINT") == 1
          and cp and cp[0].get("status") == "duplicate-suppressed"
          and r2["original"]["work_order_id"]
          == r1["work_order"]["work_order_id"])
    report("H8a", "PASS" if ok else "FAIL",
           "duplicate suppressed: outcome=%s/%s executor.calls=%d; "
           "MC_CHECKPOINT status=%s; original work_order_id returned; "
           "no second dispatch" % (r1["outcome"], r2["outcome"], ex.calls,
                                   cp[0].get("status") if cp else "?"))


def h8b_no_retry_after_failure():
    """Same key after a FAILED dispatch: duplicate-suppressed to the
    FAILED record; the failure is NOT silently retried."""
    j = new_journal()
    ex = SpawnFailExecutor()
    intent = make_intent(key="h8b-key")
    try:
        mi.submit(intent, "hermes", CONSTRAINTS, ex,
                  journal_file=j, adapter_dir=ADAPTER_DIR)
    except mi.IntentDispatchError:
        pass
    r2 = mi.submit(dict(intent), "hermes", CONSTRAINTS, ex,
                   journal_file=j, adapter_dir=ADAPTER_DIR)
    ok = (ex.calls == 1 and r2["outcome"] == "duplicate-suppressed"
          and r2["original"]["terminal"] == "MC_LANE_FAILED")
    report("H8b", "PASS" if ok else "FAIL",
           "failed dispatch is terminal under the same key: second submit "
           "returned duplicate-suppressed with original.terminal=%r; "
           "executor.calls stayed %d (no silent retry); a retry needs a "
           "new idempotency key" % (r2["original"]["terminal"], ex.calls))


def h8c_e2_collision():
    """Same key + different canonical bytes: fail closed, no dispatch."""
    j = new_journal()
    ex = OkExecutor()
    first = make_intent(key="h8c-key")
    mi.submit(first, "hermes", CONSTRAINTS, ex,
              journal_file=j, adapter_dir=ADAPTER_DIR)
    other = make_intent(key="h8c-key", capability="email.send")
    try:
        mi.submit(other, "hermes", CONSTRAINTS, ex,
                  journal_file=j, adapter_dir=ADAPTER_DIR)
        report("H8c", "FAIL", "E2 collision did not raise")
        return
    except mi.IntentDispatchError as e:
        msg = str(e)
    ok = "E2" in msg and ex.calls == 1
    report("H8c", "PASS" if ok else "FAIL",
           "E2 fail-closed: IntentDispatchError(%r); executor.calls=%d; "
           "collision detected BEFORE authorize (raise is DispatchError, "
           "not the authority's denial)" % (msg[:70], ex.calls))


# ---------------------------------------------------------------- H9
def _write_acceptance(j, intent, agent_id="hermes"):
    """Simulate a crash between MC_LANE_STARTED and the terminal event:
    the acceptance record exists, no terminal follows (-9 mid-mission)."""
    mi.observe([{
        "event_type": "MC_LANE_STARTED",
        "human": "frontdoor intent accepted for dispatch (crashed before "
                 "terminal)",
        "record": mi._intent_record(intent, {
            "agent_id": agent_id,
            "namespace": "tenant::" + intent["tenant"],
            "status": "intent-accepted",
        }),
        "status": "intent-accepted",
    }], journal_file=j)


def h9a_restart_unknown_preserved():
    """-9 after acceptance, before terminal: the duplicate is HELD,
    never re-dispatched, never collapsed to success/failure."""
    j = new_journal()
    ex = OkExecutor()
    intent = make_intent(key="h9a-key")
    _write_acceptance(j, intent)
    try:
        mi.submit(dict(intent), "hermes", CONSTRAINTS, ex,
                  journal_file=j, adapter_dir=ADAPTER_DIR)
        report("H9a", "FAIL", "in-flight duplicate did not raise")
        return
    except mi.IntentDispatchError as e:
        msg = str(e)
    types = event_types(j)
    recs = frontdoor_records(j)
    hold = [r for t, r in recs if t == "MC_HOLD_RAISED"]
    terminals = [t for t in types
                 if t in ("MC_LANE_COMPLETED", "MC_LANE_FAILED")]
    found = mi.find_intent_record(j, "h9a-key")
    ok = (ex.calls == 0 and "in-flight" in msg
          and "MC_HOLD_RAISED" in types
          and hold and hold[0].get("status") == "in-flight-duplicate-hold"
          and not terminals
          and found is not None and found["terminal"] is None)
    report("H9a", "PASS" if ok else "FAIL",
           "UNKNOWN preserved: IntentDispatchError(%r); MC_HOLD_RAISED "
           "status=%s; executor.calls=%d; no terminal event for the key; "
           "find_intent_record terminal=None" %
           (msg[:70], hold[0].get("status") if hold else "?", ex.calls))


def h9b_hold_is_sticky():
    """Repeated duplicates while in-flight keep holding; never dispatch."""
    j = new_journal()
    ex = OkExecutor()
    intent = make_intent(key="h9b-key")
    _write_acceptance(j, intent)
    raises = 0
    for _ in range(3):
        try:
            mi.submit(dict(intent), "hermes", CONSTRAINTS, ex,
                      journal_file=j, adapter_dir=ADAPTER_DIR)
        except mi.IntentDispatchError:
            raises += 1
    types = event_types(j)
    ok = (raises == 3 and ex.calls == 0
          and types.count("MC_HOLD_RAISED") == 3
          and "MC_LANE_COMPLETED" not in types
          and "MC_LANE_FAILED" not in types)
    report("H9b", "PASS" if ok else "FAIL",
           "hold is sticky: %d/3 duplicates held (MC_HOLD_RAISED x%d), "
           "executor.calls=%d, no terminal ever written"
           % (raises, types.count("MC_HOLD_RAISED"), ex.calls))


def h9c_journal_corruption_fail_closed():
    """A corrupted (truncated) terminal line makes the mission look
    in-flight: the duplicate must HOLD, never re-dispatch."""
    j = new_journal()
    ex = OkExecutor()
    intent = make_intent(key="h9c-key")
    mi.observe([{
        "event_type": "MC_LANE_STARTED",
        "human": "acceptance",
        "record": mi._intent_record(intent, {"status": "intent-accepted"}),
        "status": "intent-accepted",
    }], journal_file=j)
    with open(j, "a", encoding="utf-8") as f:
        f.write('{"event_type": "MC_LANE_COMPLETED", "aggregate_id": '
                '"mc:lane:mission-intent", "truncated": true\n')  # corrupt
    try:
        mi.submit(dict(intent), "hermes", CONSTRAINTS, ex,
                  journal_file=j, adapter_dir=ADAPTER_DIR)
        report("H9c", "FAIL", "corrupted-terminal duplicate did not raise")
        return
    except mi.IntentDispatchError as e:
        msg = str(e)
    ok = ex.calls == 0 and "in-flight" in msg
    report("H9c", "PASS" if ok else "FAIL",
           "journal corruption fail-closed: bad line skipped by "
           "_journal_events, mission reads as in-flight, duplicate held "
           "(%r); executor.calls=%d" % (msg[:60], ex.calls))


def h9d_recovery_resolves_hold():
    """A terminal event written later (recovery) lets the duplicate
    suppress to the original record."""
    j = new_journal()
    ex = OkExecutor()
    intent = make_intent(key="h9d-key")
    _write_acceptance(j, intent)
    mi.observe([{
        "event_type": "MC_LANE_COMPLETED",
        "human": "recovered completion",
        "record": mi._intent_record(intent, {
            "work_order_id": "wo-recovered",
            "executor": "recovery",
            "executor_status": "completed",
            "executor_summary": "recovered ok",
        }),
        "status": "dispatched",
    }], journal_file=j)
    r = mi.submit(dict(intent), "hermes", CONSTRAINTS, ex,
                  journal_file=j, adapter_dir=ADAPTER_DIR)
    ok = (r["outcome"] == "duplicate-suppressed"
          and r["original"]["work_order_id"] == "wo-recovered"
          and ex.calls == 0)
    report("H9d", "PASS" if ok else "FAIL",
           "recovery terminal resolves the hold: duplicate-suppressed to "
           "wo-recovered; executor.calls=%d" % ex.calls)


# ---------------------------------------------------------------- cross-cutting
def v1_no_retry_loops_static():
    """No retry loop exists anywhere in the front door."""
    import re
    retry_hits = []
    for fn in ("mission_intent.py", "frontdoor_adapters.py"):
        p = os.path.join(_MC, fn)
        with open(p) as f:
            body = f.read()
        for m in re.finditer(r"(?i)\bretry\b|\bwhile\b.*\bsubmit\b|for .* in "
                             r"range\(\d+\)\s*:\s*\n.*submit", body):
            retry_hits.append((fn, m.group(0)[:40]))
    # 'retryable' appears only in the vendored adapter (hard-coded False)
    # and docstrings; check the front door never acts on it.
    fd_retryable = []
    for fn in ("mission_intent.py", "frontdoor_adapters.py"):
        p = os.path.join(_MC, fn)
        with open(p) as f:
            for i, line in enumerate(f, 1):
                if "retryable" in line.lower():
                    fd_retryable.append((fn, i, line.strip()[:60]))
    ok = not retry_hits and not fd_retryable
    report("V1", "PASS" if ok else "FAIL",
           "no retry machinery in front door: retry-loop hits=%r; "
           "'retryable' references in front door=%r (vendored adapter "
           "hard-codes retryable:false on every result verification)"
           % (retry_hits, fd_retryable))


def v2_unknown_never_collapsed_static():
    """The only terminal event types the idempotency ledger recognizes
    are MC_LANE_COMPLETED / MC_LANE_FAILED; nothing writes a terminal
    for an in-flight mission except the mission's own observe path."""
    p = os.path.join(_MC, "mission_intent.py")
    with open(p) as f:
        body = f.read()
    terminal_check = ('"MC_LANE_COMPLETED", "MC_LANE_FAILED"' in body
                      or "('MC_LANE_COMPLETED', 'MC_LANE_FAILED')" in body
                      or 'in ("MC_LANE_COMPLETED", "MC_LANE_FAILED")' in body)
    hold_cleared_emitted = "MC_HOLD_CLEARED" in body
    ok = terminal_check and not hold_cleared_emitted
    report("V2", "PASS" if ok else "FAIL",
           "terminal recognition=%r (only MC_LANE_COMPLETED/FAILED); "
           "front door never emits MC_HOLD_CLEARED=%r (hold clears only "
           "via a real terminal event)" % (terminal_check,
                                           hold_cleared_emitted))


def main():
    print("== MissionIntent front-door hostile tests ==")
    print("worktree: /tmp/mc-hostile-test @ 537d264 (detached, read-only)")
    print("adapter:  vendored orca-adapter via local node (real verdicts)")
    print()
    h1_capability_absence()
    h2a_budget_exhaustion_returned_failure()
    h2b_no_budget_concept()
    h3_saturation()
    h4a_adapter_dir_missing()
    h4b_node_missing()
    h4c_issuance_denial()
    h5a_spawn_failure()
    h5b_effect_then_crash()
    h5c_bad_executor_shape()
    h6a_observer_timeout()
    h6b_no_watchdog()
    h7_cancellation()
    h8a_duplicate_suppressed()
    h8b_no_retry_after_failure()
    h8c_e2_collision()
    h9a_restart_unknown_preserved()
    h9b_hold_is_sticky()
    h9c_journal_corruption_fail_closed()
    h9d_recovery_resolves_hold()
    v1_no_retry_loops_static()
    v2_unknown_never_collapsed_static()
    print()
    print("== summary ==")
    npass = sum(1 for _, v, _ in RESULTS if v == "PASS")
    nfail = sum(1 for _, v, _ in RESULTS if v == "FAIL")
    for tid, v, _ in RESULTS:
        print("%s %s" % (v, tid))
    print("PASS=%d FAIL=%d" % (npass, nfail))


if __name__ == "__main__":
    main()
