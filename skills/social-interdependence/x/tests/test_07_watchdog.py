#!/usr/bin/env python3
"""Test 7: the watchdog is fail-closed. It may REDUCE/STOP/DEFER/ROLLBACK
pass behavior, it may NEVER grant execution, it writes SAFE_MODE when a
hard threshold trips, and SAFE_MODE stops new mutations at pass entry."""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import si_testlib as T
from x_watchdog import Watchdog
from x_invariants import InvariantViolation
from x_orchestrator import PassHarness, load_envelope
from xapi_fixture import FixtureAdapter

T.make_outreach_root()
scratch = T.make_scratch()
wd = Watchdog(scratch, load_envelope(T.write_envelope(scratch)))

# Healthy scratch: OK, no SAFE_MODE file.
rep = wd.evaluate()
T.check("watchdog healthy on clean streams",
        rep["action"] == "OK" and
        not os.path.isfile(os.path.join(scratch, "SAFE_MODE")), rep)

# Attempting to grant execution raises; the method exists only to fail.
try:
    wd.attempt_grant({"authorized_accounts": ["mallory"]})
    T.check("attempt_grant raises", False, "no raise")
except InvariantViolation as e:
    T.check("attempt_grant raises",
            "WATCHDOG_MAY_NOT_GRANT_AUTHORITY" in str(e), str(e))
T.check("attempt_grant on a non-granting key returns False, changes "
        "nothing",
        wd.attempt_grant({"dispatch_spacing_sec": 45}) is False, None)

# High failure rate: REDUCE (advisory), no SAFE_MODE.
scratch2 = T.make_scratch()
for i in range(5):
    with open(os.path.join(scratch2, "outcome-receipts.jsonl"), "a") as f:
        f.write(json.dumps({"intent_id": "x:like:post:%d:b" % i,
                            "terminal": "FAILED_TERMINAL",
                            "ok": False}) + "\n")
wd2 = Watchdog(scratch2, load_envelope(T.write_envelope(scratch2)))
rep = wd2.evaluate()
T.check("failure-rate breach: REDUCE",
        rep["action"] == "REDUCE" and rep["failure_rate"] == 1.0, rep)
T.check("REDUCE does not write SAFE_MODE",
        not os.path.isfile(os.path.join(scratch2, "SAFE_MODE")), None)

# A policy violation: STOP writes SAFE_MODE with a machine reason.
with open(os.path.join(scratch2, "invariant-violations.jsonl"), "a") as f:
    f.write(json.dumps({"violation": "NO_ACTION_WITHOUT_AUTHORIZED_ACCOUNT",
                        "at": "2026-10-01T00:00:00Z"}) + "\n")
rep = wd2.evaluate()
T.check("policy violation: STOP", rep["action"] == "STOP", rep)
sm_path = os.path.join(scratch2, "SAFE_MODE")
T.check("STOP writes SAFE_MODE with reason",
        os.path.isfile(sm_path) and "STOP" in open(sm_path).read(),
        open(sm_path).read() if os.path.isfile(sm_path) else None)

# Duplicate canonical actions on the same identity key: STOP.
scratch3 = T.make_scratch()
for i in range(2):
    with open(os.path.join(scratch3, "outcome-receipts.jsonl"), "a") as f:
        f.write(json.dumps({"intent_id": "x:like:post:123:b%d" % i,
                            "terminal": "VERIFIED_SUCCESS",
                            "ok": True}) + "\n")
wd3 = Watchdog(scratch3, load_envelope(T.write_envelope(scratch3)))
rep = wd3.evaluate()
T.check("duplicate canonical actions: STOP",
        rep["action"] == "STOP" and
        rep["duplicate_canonical_actions"] == 1, rep)

# Pass integration: SAFE_MODE file present -> pass refuses to mutate.
scratch4 = T.make_scratch()
env_path = T.write_envelope(scratch4)
h = PassHarness(load_envelope(env_path), scratch4,
                FixtureAdapter(os.path.join(scratch4, "fixture-server.json")))
Watchdog(scratch4, load_envelope(env_path)).enter_safe_mode(
    "test trip: policy violation under review")
res = h.run_pass("batch-safe")
T.check("SAFE_MODE: pass verdict SAFE_MODE, zero mutations",
        res["verdict"] == "SAFE_MODE" and h.adapter.mutation_count() == 0,
        (res, h.adapter.mutation_count()))

# Safe mode exits only on an explicit, recorded operator action.
Watchdog(scratch4, load_envelope(env_path)).exit_safe_mode(
    "operator reviewed; cause resolved")
T.check("operator exit clears SAFE_MODE and is recorded",
        not os.path.isfile(os.path.join(scratch4, "SAFE_MODE")), None)
reports = [json.loads(l) for l in open(
    os.path.join(scratch4, "watchdog-reports.jsonl"))]
T.check("exit recorded in watchdog reports",
        any(r.get("action") == "SAFE_MODE_EXIT" for r in reports),
        [r.get("action") for r in reports])

sys.exit(T.summary())
