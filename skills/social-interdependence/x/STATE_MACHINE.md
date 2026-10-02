# Intent State Machine

Every engagement is a durable intent that moves through this lifecycle.
All transitions are journaled on the hash-chained journal with actor,
reason, identity key, and attempt count. Illegal transitions raise
ILLEGAL_TRANSITION and fail the candidate closed.

## States

DISCOVERED -> NORMALIZED -> EVALUATED -> ELIGIBLE -> INTENT_CREATED
-> QUEUED -> SCHEDULED -> DISPATCHED -> ATTEMPTING -> VERIFYING
-> VERIFIED_SUCCESS | VERIFIED_NOOP | FAILED_TERMINAL | SAFE_RETRY
-> (SCHEDULED | FAILED_TERMINAL)

Side states: DEFERRED (parked, resumable: 429, 401/403, circuit open),
CANCELLED, UNKNOWN (verification read outage; persisted without an
`ok` boolean, never dispatched on), FAILED_RETRYABLE.

## Legal transitions

```
DISCOVERED: NORMALIZED, CANCELLED
NORMALIZED: EVALUATED, CANCELLED
EVALUATED: ELIGIBLE, CANCELLED
ELIGIBLE: INTENT_CREATED, CANCELLED
INTENT_CREATED: QUEUED, CANCELLED
QUEUED: SCHEDULED, DEFERRED, CANCELLED
SCHEDULED: DISPATCHED, DEFERRED, CANCELLED
DISPATCHED: ATTEMPTING, VERIFYING, CANCELLED
ATTEMPTING: VERIFYING, UNKNOWN, DEFERRED, FAILED_TERMINAL, CANCELLED
VERIFYING: VERIFIED_SUCCESS, VERIFIED_NOOP, FAILED_TERMINAL,
           SAFE_RETRY, UNKNOWN, CANCELLED
SAFE_RETRY: SCHEDULED, DEFERRED, CANCELLED
FAILED_RETRYABLE: SCHEDULED, DEFERRED, CANCELLED
UNKNOWN: VERIFYING, CANCELLED
DEFERRED: SCHEDULED, CANCELLED
CANCELLED: (terminal)
VERIFIED_SUCCESS / VERIFIED_NOOP / FAILED_TERMINAL: (terminal)
```

Notes on the non-obvious edges:

- DISPATCHED -> VERIFYING is the crash-recovery path: the adapter may
  have executed before the process died, so the first legal move is a
  verification read, never a re-dispatch.
- ATTEMPTING -> DEFERRED: the platform refused the attempt without a
  mutation (429 rate limit, 401/403 auth rejection). The refusal is
  about the request, not the target, so the attempt parks rather than
  fails.
- SAFE_RETRY / FAILED_RETRYABLE -> DEFERRED: a bounded retry that
  cannot run now (circuit open) parks as deferred instead of burning
  its attempt.

## Terminals

VERIFIED_SUCCESS (verification read confirmed the effect, receipt
ok=true), VERIFIED_NOOP (already present, receipt ok=true),
FAILED_TERMINAL (verification failed or attempts exhausted, receipt
ok=false), CANCELLED. Never-reengage: a later pass that discovers an
identity key with a prior VERIFIED_SUCCESS/VERIFIED_NOOP rejects the
candidate as ALREADY_ENGAGED.

Schema: `schemas/intent.json`, `schemas/transition-evidence.json`.
