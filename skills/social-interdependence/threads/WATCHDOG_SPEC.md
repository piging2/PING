# Watchdog Spec - Threads Social Interdependence

## What the watchdog is

`src/si_watchdog.py`: the machine that keeps the loop honest. It runs at
the end of every cycle and can run standalone. It owns safety gates.

## What it may do

1. **Circuit breakers** (`breakers.json`): open `platform:threads` when
   the 2h failure rate exceeds `maximum_failure_rate` (0.10); open
   `adapter:threads` when the 2h unknown rate exceeds
   `maximum_unknown_rate` (0.05) or on ANY verification failure
   (adapter claim vs read-back mismatch is a trust violation, not
   noise). Breakers are checked at dispatch time
   (`NO_EXECUTION_AFTER_CIRCUIT_BREAKER_OPEN`); no execution may start
   in an open scope.
2. **Breaker half-open**: breakers expire after 2h; a probe (one like,
   verified) closes or re-opens. The policy never lowers ceilings in
   response.
3. **Platform-flag reaction**: a checkpoint / action block / rate limit
   observed mid-pass cancels the intent, records the flag, and opens
   the platform breaker.
4. **Learner lifecycle**: SHADOW -> CANARY -> ACTIVE with gates
   (sample counts, failure ceilings, per-stage timeouts); out-of-envelope
   proposals rejected; automatic rollback to the last ACTIVE config on
   any gate failure.
5. **Stuck-intent scan**: intents left in non-terminal states past their
   age bound are surfaced for reconcile; the watchdog never moves them
   itself (reconcile owns movement).
6. **Lease hygiene**: expired leases are visible; live leases are never
   broken (a live worker owns the pass; reconcile refuses while leased).

## What it may NOT do

- Dispatch, decide eligibility, or re-decide anything.
- Change the envelope, ceilings, or any authority boundary.
- Resolve UNKNOWN_EXECUTION by assumption.
- Clear a hold (owner-only) or close a breaker manually (only the
  half-open probe path may close one).
- Modify policy: learner proposals are parameter-only, bounded by
  `learner_bounds`, and every promotion/rollback is journaled.

## Machine checks (run every cycle)

| Check | Signal | Action |
|---|---|---|
| breaker state per scope | `breakers.json` | intents in open scopes CANCELLED at dispatch |
| failure rate (2h) | `evidence.jsonl` | open `platform:threads` |
| unknown rate (2h) | `evidence.jsonl` | open `adapter:threads` |
| verification failure (24h) | `evidence.jsonl` | open `adapter:threads` immediately |
| adapter flags | `adapter_flags.jsonl` | open platform breaker on checkpoint/block |
| lease state | `leases/` | report live/stale; never break live |
| learner gates | `learned_config.json` | promote or roll back |
| evidence TTL | decision records | stale evidence never reused for a new decision |

## Reporting

`check()` returns a list of actions taken. The cycle includes it in its
report. Anything the watchdog cannot resolve (UNKNOWN_EXECUTION past
age bound, recurring verification failures, breaker flapping) is
surfaced to the human in plain language; the loop keeps failing closed
until then.
