# Eval Plan

The behavioral suites ARE the eval: eight suites, 134 checks, run with
`tests/run_all.sh`. Every check runs the real machinery (real guard,
real invariants, real journal) against the fixture at the adapter
boundary. No mocks above the adapter; no invented evidence.

## Suites

1. `test_01_guard_integration.py` (7): the real `eligibility_check()`
   against fixture candidates. ELIGIBLE/INELIGIBLE/UNKNOWN and the
   fail-closed cases (blocked handle, empty candidate,
   capability-stripped, fuzzy-handle resemblance).
2. `test_02_invariants.py` (30): every invariant in `x_invariants.py`
   fires on violation and passes on compliance.
3. `test_03_vertical_slice.py` (21): the full pass end to end. Two
   VERIFIED_SUCCESS receipts with ok=true, hash chain verifies, the
   second pass re-engages nothing (never-reengage).
4. `test_04_failure_injection.py` (20): real `os._exit` crash kills at
   four points plus timeout-after-success, lying adapter, and
   verification-read outage. Reconcile completes or fails closed with
   exactly-once mutation semantics.
5. `test_05_adversarial.py` (22): duplicate discovery, two-worker
   lease conflict, stale capability file, 401/403 handling, 429 hard
   stop, identity ambiguity, saturation, budget race (threads), ok-less
   outcome refusal, learner out-of-envelope refusal, lease expiry.
6. `test_06_circuit.py` (10): the x-probe precedent replayed. Four
   timeouts open the scope; no probe inside the 6h cooldown; exactly
   one half-open trial after; success closes; operator-directive pin
   holds past cooldown; 429 opens immediately.
7. `test_07_watchdog.py` (11): REDUCE on rate breach, STOP on policy
   violation and on duplicate canonical actions, SAFE_MODE stops new
   mutations, operator-only exit with provenance, attempt_grant raises.
8. `test_08_learner.py` (13): SHADOW -> CANARY -> ACTIVE on clean
   gates, dirty report blocks promotion, regression triggers automatic
   rollback, out-of-envelope / ceiling-raise / authority-grab proposals
   refused.

## Pass criteria

All suites green, zero failures. A single failure fails the eval: the
property it covers is load-bearing (exactly-once mutation, no blind
retry, no unverified success, no authority self-grant).

## Regression discipline

Any change to `bin/` re-runs the full suite before it is considered.
New failure modes discovered in production become new checks in the
suite that owns the property (failure injection for crash paths,
adversarial for abuse paths, circuit for breaker semantics).

## What the eval does not cover

Live platform behavior (the fixture stands in for the X API), human
taste in curation (TASTE IS NOT ELIGIBILITY: taste lives above the
guard, untested by design), and operator judgment calls (directive
pins, SAFE_MODE exits) which are recorded but not automated.
