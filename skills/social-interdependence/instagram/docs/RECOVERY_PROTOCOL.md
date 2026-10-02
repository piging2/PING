# RECOVERY_PROTOCOL: social-interdependence/instagram

Recovery without replay. When a worker dies, a lease expires, or the
platform stops answering mid-attempt, `reconcile()` restores a truthful
state using only durable records and verification reads. It never
re-executes a mutation.

## The rule

- Stranded in DISPATCHED: the adapter was never invoked (the crash
  landed before the ATTEMPTING transition). Safe to re-dispatch:
  DISPATCHED -> SCHEDULED with that evidence.
- Stranded in ATTEMPTING or VERIFYING: the external effect is
  unknowable. The intent becomes UNKNOWN. It leaves UNKNOWN only when a
  verification READ proves the outcome:
  - read proves the mutation applied -> VERIFIED_SUCCESS (then the
    normal canonicalization: guard history, relationship touch, budget
    commit). Zero additional adapter executions.
  - read proves the mutation never happened -> SAFE_RETRY -> QUEUED
    (budget re-reserved, bounded retries continue).
  - read inconclusive or the read itself fails (outage) -> stays
    UNKNOWN, honestly. No canonical success, no blind retry. A later
    reconcile may still recover it.
- Lease still held by a live worker: reconcile leaves the intent alone.
  One worker per account is a lease, not a suggestion.

## What reconcile never does

- Re-call `adapter.execute` for an UNKNOWN intent. (The transition
  table has no UNKNOWN -> ATTEMPTING edge; the code cannot express it.)
- Record a relationship touch or guard history entry without a
  VERIFIED_SUCCESS.
- Lower budgets or change the envelope because recovery was needed.
- Grant authority. Reconcile runs under the same gate as everything
  else.

## Crash injection points (tested)

`execute_pass(..., crash_points=(...))` accepts `after_intent_created`,
`after_dispatched`, `after_attempting`. The tests kill the run at each
point, then reconcile with a fresh adapter sharing the same platform
truth, and assert:

- exactly-once external effect (the fixture's execution log is the
  proof),
- the truthful terminal state (VERIFIED_SUCCESS via read, or honest
  UNKNOWN),
- no duplicate relationship touch, no duplicate guard history entry.

## Operator notes

- Run `si-ig.py reconcile` after any suspected worker death before the
  next `execute`. It is idempotent.
- If an intent sits in UNKNOWN across several reconciles, the platform
  read path is failing: treat as a read outage, not as permission to
  retry the mutation.
- The watchdog's unknown-rate threshold (0.25) pauses the pass for
  reconcile before more intents are dispatched.
