# STATE_MACHINE: social-interdependence/instagram

Nineteen states. Every transition is appended to `transitions.jsonl` with
the intent id, from/to, reason, evidence object, actor, and timestamp.
Illegal transitions raise; they are never silently coerced. The table is
enforced by `bin/siig_states.py`, which is the only writer.

## The states

DISCOVERED, NORMALIZED, EVALUATED, ELIGIBLE, REJECTED, INTENT_CREATED,
QUEUED, SCHEDULED, DISPATCHED, ATTEMPTING, VERIFYING, VERIFIED_SUCCESS,
VERIFIED_NOOP, UNKNOWN, SAFE_RETRY, DEFERRED, FAILED_RETRYABLE,
FAILED_TERMINAL, CANCELLED.

Terminal: REJECTED, VERIFIED_SUCCESS, VERIFIED_NOOP, FAILED_TERMINAL,
CANCELLED. Everything else is active (blocks a duplicate intent for the
same handle).

## Legal transitions (exact, from siig_states.py)

- DISCOVERED -> NORMALIZED, REJECTED
- NORMALIZED -> EVALUATED, REJECTED
- EVALUATED -> ELIGIBLE, REJECTED
- ELIGIBLE -> INTENT_CREATED, REJECTED, DEFERRED
- INTENT_CREATED -> QUEUED, CANCELLED
- QUEUED -> SCHEDULED, CANCELLED, DEFERRED
- SCHEDULED -> DISPATCHED, CANCELLED, DEFERRED
- DISPATCHED -> ATTEMPTING, SCHEDULED, CANCELLED
- ATTEMPTING -> VERIFYING, UNKNOWN, FAILED_RETRYABLE, FAILED_TERMINAL, CANCELLED
- UNKNOWN -> VERIFYING, SAFE_RETRY, FAILED_RETRYABLE, FAILED_TERMINAL, VERIFIED_SUCCESS, VERIFIED_NOOP, CANCELLED
- VERIFYING -> VERIFIED_SUCCESS, VERIFIED_NOOP, SAFE_RETRY, FAILED_RETRYABLE, FAILED_TERMINAL, UNKNOWN
- SAFE_RETRY -> QUEUED, CANCELLED
- FAILED_RETRYABLE -> QUEUED, FAILED_TERMINAL, CANCELLED
- DEFERRED -> QUEUED, CANCELLED

## Deliberate absences (the safety core)

- **UNKNOWN -> ATTEMPTING does not exist.** An intent whose external
  effect is unknowable is never re-executed. UNKNOWN resolves only
  through verification reads: VERIFIED_SUCCESS / VERIFIED_NOOP when a
  recovery read proves the outcome, SAFE_RETRY when a read proves the
  mutation never happened, FAILED_RETRYABLE when the read is inconclusive
  but retry is safe.
- **No transition skips VERIFYING on the success path.** ATTEMPTING ->
  VERIFIED_SUCCESS does not exist; the verification read is mandatory.
- **DISPATCHED -> SCHEDULED exists but means one precise thing:** the
  crash landed between the DISPATCHED transition and the ATTEMPTING
  transition, so `adapter.execute()` was never invoked and re-dispatch
  is safe. It is recorded with that evidence, not as a generic requeue.

## How crashes map to states

- Kill after INTENT_CREATED: a later pass sees INTENT_CREATED with no
  lease and continues the pipeline (QUEUED -> SCHEDULED).
- Kill after DISPATCHED: lease expired, adapter never invoked ->
  SCHEDULED (safe re-dispatch), proven by reconcile test.
- Kill after ATTEMPTING: the mutation may have happened -> UNKNOWN ->
  recovery read decides.
- Timeout after success: ATTEMPTING -> UNKNOWN on AdapterTimeout; the
  recovery read finds the applied mutation -> VERIFIED_SUCCESS with
  zero additional executions (exactly-once proven).
- Adapter outage during recovery: the read itself fails -> stays
  UNKNOWN, honestly. No canonical success is recorded, no retry is
  attempted blind.

## Replay is decision replay

`reconcile` replays DECISIONS (what state each intent is in, what the
durable log says, what the platform read says). It never replays
MUTATIONS. The transition log plus the intent index is sufficient to
reconstruct every pass without re-executing anything.
