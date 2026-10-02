# Recovery Protocol - Threads Social Interdependence

## Principle

Reconcile, never replay. A mutation whose external effect is unknown is
never re-sent blindly. Recovery reads the world first, then moves the
intent to a terminal state or authorizes exactly one more attempt.

## The reconcile tool

```sh
bin/th-si-reconcile.py --json
```

It is safe to run any time; with no uncertain intents it is a no-op.

## Per-state recovery

| Uncertain state | Reconcile action |
|---|---|
| `DISPATCHED` (crash after dispatch) | Read external state. Mutation observed -> VERIFYING -> verify. No mutation -> SAFE_RETRY or SCHEDULED (one attempt). Unreadable -> UNKNOWN_EXECUTION (stays; human sees it). |
| `ATTEMPTING` (crash mid-executor) | Same as DISPATCHED. The executor result is hearsay until read-back. |
| `VERIFYING` (crash mid-verification) | Re-run read-back. Observed liked -> VERIFIED_SUCCESS. Not observed -> FAILED_RETRYABLE (attempts remain) or FAILED_TERMINAL. |
| `FAILED_RETRYABLE` | If attempts remain -> SCHEDULED (exactly one more). Else FAILED_TERMINAL. |
| `SAFE_RETRY` | After safe mode clears -> SCHEDULED. |
| `UNKNOWN_EXECUTION` | Read external state. Proved no mutation -> SCHEDULED (one attempt). Proved mutation -> verify path. Unreadable -> stays UNKNOWN_EXECUTION (never auto-resolved by guessing). |
| `QUEUED` | Budget was never consumed; -> SCHEDULED directly (no budget double-consume). |

## What reconcile NEVER does

- Re-dispatch a mutation whose external effect is unknown
  (`NO_BLIND_RETRY_AFTER_UNKNOWN_EXTERNAL_MUTATION`).
- Invent eligibility or re-decide (decisions are terminal records).
- Change the envelope, ceilings, or learner config.
- Run while a lease is live (refuses; a live worker owns the pass).
- Resolve UNKNOWN_EXECUTION by assumption: unreadable stays
  unreadable, surfaced to the human.

## Crash hooks and testing

`th-si-cycle.py` honors `--crash-after <STATE>` (test only): it exits
mid-phase so `test_failure_injection` can prove every uncertain state
is recoverable. The 8 failure-injection tests cover: crash after
DISPATCHED, ATTEMPTING, VERIFYING, QUEUED budget accounting, lease
refusal, executor timeout with external success (blind retry forbidden),
executor timeout without external success (safe retry allowed), and the
no-op case.

## Platform flags during recovery

If reconcile's read observes a checkpoint, action block, or rate limit,
it cancels the intent (CANCELLED), appends the flag to
`adapter_flags.jsonl`, and the watchdog opens the platform breaker.
Per Nolan's standing rule, a platform flag is the ONLY thing that
scales back the surface.
