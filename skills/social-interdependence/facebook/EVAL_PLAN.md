# Eval Plan

How this slice is evaluated: what is measured, against what bar, and what would falsify the claim that the machinery works. The tests in `tests/` are the current implementation of this plan; this document is the contract they implement.

## Claim under test

"Autonomous Facebook engagement within the envelope needs no per-action human approval, because machine-enforced machinery (authority gate, deterministic eligibility, tamper-evident envelopes, invariants, leases, read-after-write verification, watchdog, reconcile-not-replay) produces behavior that is safe, honest, and recoverable."

## Eval suites (all runnable, all passing)

| Suite | File | What it proves | Result |
|---|---|---|---|
| Eligibility harness | `test_eligibility_harness.py` | The REAL guard decides: ELIGIBLE/BLOCKED/OUTSIDE_CORRIDOR/ALREADY_ENGAGED/UNKNOWN/CAPABILITY_MISSING, precedence order, stamp/verify roundtrip, tamper and stale refusal, pfbid same-form join | 13/13 |
| Vertical slice | `test_vertical_slice.py` | End to end on the fixture: envelope -> scheduler -> orchestrator -> adapter -> verification -> evidence; decision-record contract fields; idempotent batch re-run; production ledger pattern; scheduler cadence | 18/18 |
| Failure injection | `test_failure_injection.py` | Kill at 5 crash points + 4 adapter fault shapes; reconcile+resume; exactly one external mutation; honest terminal states; UNKNOWN stays UNKNOWN when read-back is impossible | 25/25 |
| State machine | `test_state_machine.py` | Transition table covers all states; terminals absorbing; illegal transitions raise and are never persisted; fold deterministic; pipeline writes only legal transitions | 14/14 |
| Invariants | `test_invariants.py` | Each invariant's legal case passes and violation raises with the stable code | 26/26 |
| Adversarial | `test_adversarial.py` | Duplicate discovery, cross-batch in-flight, lease contention, hold before pass/resume, expired credential, adapter lies, budget race (5 procs), lease expiry, identity ambiguity, saturation, negative-feedback breaker, learner SHADOW | 25/25 |

Total: 121/121, all against scratch state, all with real (non-mocked) eligibility, authority, envelope, budget, lease, and recovery code. The only fake is the boundary adapter.

## Running the evals

```bash
cd ~/workspace/skills/social-interdependence/facebook
for t in tests/test_*.py; do python3 "$t"; done
```

Each file is self-contained: it builds fresh scratch state, runs, prints PASS/FAIL per check, prints `n/n passed`, and exits non-zero on any failure. No test touches production outreach state; no test needs credentials, the Pig, or the network.

## Falsification criteria (what would fail the slice)

- Any test failing: the claim is false until the defect is fixed and the suite is green.
- A crash point producing two external mutations for one intent: the exactly-once recovery claim is false.
- An UNKNOWN intent re-executed without a read-back proving no effect: the no-blind-retry claim is false.
- A VERIFIED_SUCCESS without an orchestrator read-after-write observation: the verification claim is false.
- A dispatch with a missing, tampered, or stale envelope: the envelope claim is false.
- A dispatch while a hold is active or authority is DENY: the authority claim is false.
- A learner output reaching policy: the SHADOW claim is false.
- Any new fake beyond the adapter boundary: the "fixtures only at the boundary" claim is false.

## What is NOT evaluated here (honest limits)

- **Live external execution.** BLOCKED: no credentials, Pig CDP unreachable from this environment. The production adapter contract is specified in CAPABILITY_MATRIX.md; its live proof awaits the Pig.
- **Adversarial platform behavior beyond the fault shapes.** The fixture covers timeouts, mid-request crashes, lies, checkpoint aborts, expired credentials, and outages. Novel platform failure shapes are not covered.
- **The guard's own correctness.** The eligibility harness tests the slice's USE of the guard (real function, real data), not the guard's rule set. Guard correctness is proven by the guard's own replay and adversarial proofs (`eligibility-replay-173-2026-10-01.md`, `eligibility-adversarial-2026-10-01.md`).
- **Human-factor evaluation.** The envelope authoring UX and the hold/revocation UX are out of scope for this slice.

## Regression policy

Every defect found becomes a test before it is fixed. The four defects found during construction (transition stream invisible to the fold; zero-byte file reads; missing batch dedup threading; lie fixture mutating before lying) each have a regression test. A fix without a test does not count.
