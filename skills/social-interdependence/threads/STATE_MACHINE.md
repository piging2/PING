# State Machine - Threads Social Interdependence

## States

| State | Meaning |
|---|---|
| `DISCOVERED` | candidate normalized; intent identity derived |
| `NORMALIZED` | identity stable, target canonical form computed |
| `EVALUATED` | guard verdict recorded |
| `ELIGIBLE` | guard said ELIGIBLE (decision record written) |
| `ELIGIBLE_REJECTED` | guard said anything else; terminal for this candidate |
| `DEFERRED` | guard ELIGIBLE, but relationship budget / pacing says not now; retryable by a later pass |
| `INTENT_CREATED` | durable intent recorded (idempotent by intent_id) |
| `QUEUED` | passed policy gates, awaiting budget |
| `SCHEDULED` | budget consumed, ready to dispatch |
| `DISPATCHED` | sent to the adapter; executor invoked |
| `ATTEMPTING` | executor acknowledged and is running |
| `VERIFYING` | read-after-write verification in progress |
| `VERIFIED_SUCCESS` | canonical success; terminal |
| `FAILED_RETRYABLE` | executor never completed; no mutation evidence; terminal unless attempts remain |
| `FAILED_TERMINAL` | attempts exhausted, or platform block, or lie detected; terminal |
| `UNKNOWN_EXECUTION` | executor result uncertain AND external effect unreadable; terminal for this pass, reconcile owns it |
| `SAFE_RETRY` | safe mode interrupted dispatch; terminal for this pass, reconcile owns it |
| `CANCELLED` | platform flag, breaker, or human hold; terminal |

## Legal transitions

```
DISCOVERED -> NORMALIZED
NORMALIZED -> EVALUATED
EVALUATED -> ELIGIBLE | ELIGIBLE_REJECTED
ELIGIBLE -> DEFERRED | INTENT_CREATED
DEFERRED -> INTENT_CREATED        (later pass, guard re-run)
INTENT_CREATED -> QUEUED
QUEUED -> SCHEDULED | DEFERRED
SCHEDULED -> DISPATCHED | DEFERRED | CANCELLED
DISPATCHED -> ATTEMPTING | FAILED_RETRYABLE | UNKNOWN_EXECUTION
ATTEMPTING -> VERIFYING | FAILED_RETRYABLE | UNKNOWN_EXECUTION
VERIFYING -> VERIFIED_SUCCESS | FAILED_RETRYABLE | UNKNOWN_EXECUTION
            | FAILED_TERMINAL
FAILED_RETRYABLE -> SCHEDULED     (attempts remain, reconcile-authorized)
                  | FAILED_TERMINAL (attempts exhausted)
UNKNOWN_EXECUTION -> SCHEDULED    (reconcile proved no mutation; rare)
                    | FAILED_TERMINAL (reconcile proved mutation or timed out)
SAFE_RETRY -> SCHEDULED           (reconcile, after safe mode clears)
ANY non-terminal -> CANCELLED     (platform flag / breaker / hold)
```

Illegal transitions raise `IllegalTransition` and fail the pass closed.
Transitions are appended to a sha256-chained journal
(`transitions.jsonl`); state changes ONLY by appending a legal
transition. There is no mutable state column to drift.

## Idempotency

`intent_id = threads:<action>:post:<code>:<batch_id>`. Re-processing
the same candidate in the same batch collapses to the existing intent
(no duplicate lifecycle, no duplicate budget consume). Across batches,
the durable engagement ledger (guard `record` + `engaged` history) makes
re-engagement ALREADY_ENGAGED at the guard.

## Replay semantics

`decision_replay`: given a stored decision record, recompute the
decision from the stored candidate, envelope, guard version, and ledger
snapshot, and compare. Replay RECOMPUTES; it never re-executes and
never mutates. A replay mismatch is an integrity incident.

## What "reconcile, never replay" means

Reconcile (`th-si-reconcile.py`) is the only authorized path back from
uncertain states. It reads EXTERNAL state (the adapter's read path, the
verification observation) and moves the intent to a terminal state or to
SCHEDULED for exactly one more attempt. It never re-sends a mutation
whose external effect is unknown.
