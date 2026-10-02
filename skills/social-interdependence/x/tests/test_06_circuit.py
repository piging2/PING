#!/usr/bin/env python3
"""Test 6: circuit-breaker semantics reproduce the x-probe precedent
(x-engagement.md 2026-09-30; ~/workspace/pig-fb/x-probe-circuit.json):
consecutive_timeouts=4 with threshold 3 opens the scope; while OPEN, no
probe and no execution, with a machine-readable reason; the 6h half-open
cooldown gates the single trial; an operator-directive pin
('offline diagnostic first, no more live-budget burn') holds the scope OPEN
regardless of cooldown."""
import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import si_testlib as T
from x_store import CircuitStore
from x_invariants import InvariantViolation, assert_circuit_allows

T0 = datetime(2026, 9, 30, 7, 36, 38, tzinfo=timezone.utc)
POLICY = {"failure_threshold": 5, "timeout_threshold": 3,
          "half_open_cooldown_sec": 6 * 3600}


def clock_at(dt):
    return lambda: dt.isoformat()


scratch = T.make_scratch()
cs = CircuitStore(os.path.join(scratch, "circuits.json"),
                  clock=clock_at(T0))
scope = "probe:x:comments-likes"

# Four consecutive timeouts, as in the precedent (threshold 3).
for i in range(4):
    cs.record_timeout(scope, POLICY,
                      now=(T0 + timedelta(seconds=i)).isoformat())
st = cs.state(scope)
T.check("precedent: 4 timeouts open the scope",
        st["state"] == "OPEN" and st["consecutive_timeouts"] == 4, st)

# 2.4h later (still inside the 6h cooldown): no probe, machine reason.
later = T0 + timedelta(hours=2, minutes=24)
allowed, reason = cs.check(scope, POLICY, now=later.isoformat())
T.check("precedent: OPEN inside cooldown -> no probe",
        allowed is False and "CIRCUIT_OPEN" in reason and
        "half-open in" in reason, reason)
try:
    assert_circuit_allows(scope, allowed, reason)
    T.check("precedent: dispatch refused by invariant", False, "no raise")
except InvariantViolation as e:
    T.check("precedent: dispatch refused by invariant",
            "NO_EXECUTION_AFTER_CIRCUIT_BREAKER_OPEN" in str(e), str(e))

# After the 6h cooldown: exactly one half-open trial is permitted.
# (The scope opened at the 3rd timeout, T0+2s, so cooldown ends T0+6h+2s.)
after = T0 + timedelta(hours=6, seconds=3)
cs2 = CircuitStore(os.path.join(scratch, "circuits.json"),
                   clock=clock_at(after))
allowed, reason = cs2.check(scope, POLICY, now=after.isoformat())
T.check("precedent: half-open trial permitted after cooldown",
        allowed is True and "HALF_OPEN" in reason, reason)
# A second concurrent trial is refused while one is inflight.
allowed2, reason2 = cs2.check(scope, POLICY, now=after.isoformat())
T.check("half-open: single trial only",
        allowed2 is False and "inflight" in reason2, reason2)
# Trial success closes the circuit.
cs2.record_success(scope, POLICY, now=after.isoformat())
st = cs2.state(scope)
T.check("half-open success closes the circuit",
        st["state"] == "CLOSED" and st["consecutive_timeouts"] == 0, st)

# Operator-directive pin: 'offline diagnostic first, no more live-budget
# burn' holds the scope OPEN past the cooldown (the 2026-09-30 09:14+ MDT
# passes: half-open mechanically eligible but NOT taken).
scratch2 = T.make_scratch()
cs3 = CircuitStore(os.path.join(scratch2, "circuits.json"),
                   clock=clock_at(T0))
for i in range(3):
    cs3.record_timeout(scope, POLICY,
                       now=(T0 + timedelta(seconds=i)).isoformat())
cs3.pin_operator_directive(
    scope, POLICY,
    "offline diagnostic first, no more live-budget burn",
    now=T0.isoformat())
far = T0 + timedelta(hours=30)
allowed, reason = cs3.check(scope, POLICY, now=far.isoformat())
T.check("operator pin: OPEN past cooldown, machine-readable directive",
        allowed is False and "operator_directive" in reason and
        "offline diagnostic first" in reason, reason)
cs3.clear_operator_directive(scope, POLICY, now=far.isoformat())
st = cs3.state(scope)
T.check("directive cleared: scope back to CLOSED",
        st["state"] == "CLOSED" and st["operator_directive"] is None, st)

# 429 is a hard stop for the scope, never a reroute signal.
scratch3 = T.make_scratch()
cs4 = CircuitStore(os.path.join(scratch3, "circuits.json"),
                   clock=clock_at(T0))
cs4.record_rate_limited("platform:x", POLICY, now=T0.isoformat())
allowed, reason = cs4.check("platform:x", POLICY, now=T0.isoformat())
T.check("429: scope OPEN immediately with hard-stop reason",
        allowed is False and "429" in reason, reason)

# Failure threshold opens on consecutive failures too.
scratch4 = T.make_scratch()
cs5 = CircuitStore(os.path.join(scratch4, "circuits.json"),
                   clock=clock_at(T0))
for i in range(5):
    cs5.record_failure("action:x:like", POLICY,
                       now=(T0 + timedelta(seconds=i)).isoformat())
T.check("5 consecutive failures open the action scope",
        cs5.state("action:x:like")["state"] == "OPEN",
        cs5.state("action:x:like"))

sys.exit(T.summary())
