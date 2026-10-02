# Eval Plan - Threads Social Interdependence

The loop is graded by what it proves, not by what it runs. Three
suites, all runnable offline against fixtures; live evidence is recorded
honestly as verified or not.

## Suites

### 1. Vertical slice (5 tests, `tests/test_vertical_slice.py`)

The whole pass, real guard, fixture executor:
- Full slice: 2 eligible likes -> VERIFIED_SUCCESS with read-back,
  within-batch duplicate collapsed, `@garyvee` rejected
  ALREADY_ENGAGED, pacing delays recorded.
- Real guard behavior: fixture candidates -> ELIGIBLE, ELIGIBLE,
  DUPLICATE, ALREADY_ENGAGED; `garyveee` -> BLOCKED (fail closed).
- Safe mode: unknown capability blocks mutation, reads continue.
- Safe mode: unknown verification blocks canonical success.
- Capability-missing rejects unsupported actions.

### 2. Failure injection (8 tests, `tests/test_failure_injection.py`)

Crash after DISPATCHED / ATTEMPTING / VERIFYING / QUEUED; reconcile
recovers each to a terminal or authorized-retry state; no double budget
consume; reconcile refuses under live lease; no-op when nothing is
uncertain.

### 3. Adversarial (15 tests, `tests/test_adversarial.py`)

- Two workers, second fails closed (rc=5, no partial state).
- Budget race: 8 racers, exactly one winner (fcntl atomicity).
- Saturation defers, never forces.
- Duplicate discovery collapses to one intent.
- Adapter lie -> FAILED_TERMINAL, adapter breaker opens.
- Executor timeout with external success -> blind retry FORBIDDEN.
- Executor timeout without external success -> safe retry allowed.
- Identity ambiguity (`garyveee`) -> BLOCKED, fail closed.
- Platform outage -> graceful defer, no crash.
- Platform flag (checkpoint) -> platform breaker opens, intent CANCELLED.
- Learner out-of-envelope rejected; promotion gates enforced;
  rollback restores last ACTIVE config.
- All 8 invariants fire on synthetic violation.
- Stale lease released, live lease untouched.

## Recorded results (2026-10-01, this build)

- `python3 -m unittest discover -s tests -p "test_*.py"`: **28 tests, OK**
  (5 vertical slice + 8 failure injection + 15 adversarial).
- Bugs found and fixed by these runs: stale-state save clobbering
  transitions in `drive_intent`; duplicate lifecycle transitions for
  within-batch duplicates; dynamic `state_dir()` for env redirection;
  `lie_detected` propagation into evidence; learner param carry-through
  on promotion; verification-failure breaker independent of sample
  size; range-valued learner bound comparison.

## Live evidence (to be recorded at first live pass, not invented here)

- First live pass must record: batch id, candidate count, guard
  verdict distribution, budget windows consumed, executor results,
  verification observations, watchdog actions.
- LIVE EXTERNAL EXECUTION was BLOCKED in this environment (no
  credentials; Pig unreachable). That is the honest state, recorded,
  not a gap to paper over.

## Grading rules

- A failed pass is retried, never answered with lower caps.
- Zero engagement under the guard is the honest signal, not a bug.
- Never freeze on prose; scale back only on a platform flag.
- Any test failure fails the build; the fix is in the code or the
  test's expectation, documented here.
