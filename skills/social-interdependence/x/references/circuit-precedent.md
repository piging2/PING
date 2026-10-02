# Circuit Precedent (reference)

Source of truth: `x-engagement.md` 2026-09-30 (the x-probe incident) and
`~/workspace/pig-fb/x-probe-circuit.json`, verified 2026-10-01.

## What happened

Four consecutive timeouts on the X comments/likes probe crossed the
threshold (3). The circuit opened. The scheduled half-open probe at
~09:14 MDT was NOT launched while the circuit was open; the operator
directive was "offline diagnostic first, no more live-budget burn". The
probe ran only after the diagnostic, with a bounded 3-probe budget and
a hard stop at the first success (second probe succeeded at ~09:30).

## The machine rules this precedent establishes

1. `consecutive_timeouts >= timeout_threshold` (3) opens the scope.
   `consecutive_failures >= failure_threshold` (5) opens it too.
2. While OPEN, no probe and no execution. The refusal carries a
   machine-readable reason: `CIRCUIT_OPEN scope=<scope>
   consecutive_timeouts=<n> (threshold 3); half-open in <s>s`.
3. Half-open after the cooldown (6h) permits exactly one trial; a
   second concurrent trial is refused while one is inflight.
4. Trial success closes the circuit (counters reset). Trial failure
   re-opens it.
5. An operator-directive pin ("offline diagnostic first, no more
   live-budget burn") holds the scope OPEN past the cooldown. The pin
   is a named, recorded directive with a reason; it clears only on an
   explicit operator action.
6. A 429 is a hard stop for the scope (recorded as rate-limited), never
   a signal to reroute or retry elsewhere.

## This skill's usage

`CircuitStore` in `bin/x_store.py` implements exactly these semantics;
`assert_circuit_allows` in `bin/x_invariants.py` enforces rule 2 at the
scheduling boundary (NO_EXECUTION_AFTER_CIRCUIT_BREAKER_OPEN). The
behavioral suite `tests/test_06_circuit.py` replays the precedent:
4 timeouts open, no probe inside the cooldown, single half-open trial
after 6h, success closes, operator pin holds past cooldown.
