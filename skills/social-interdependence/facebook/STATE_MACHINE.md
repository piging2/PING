# State Machine

Intent states, the legal transitions between them, and what each transition means. The table lives in `si_fb_invariants.py` as `ALLOWED_TRANSITIONS`; `transition()` in the orchestrator checks it before persisting anything. An illegal transition raises `ILLEGAL_STATE_TRANSITION` and nothing is written. The state machine is data enforced by code, not a diagram in a doc.

## States

**Decision stages (on decision records, never on intents):** DISCOVERED, NORMALIZED, EVALUATED, ELIGIBLE, REJECTED. A candidate that does not proceed ends here; no intent is created.

**Intent states:**

| State | Meaning |
|---|---|
| INTENT_CREATED | Durable intent persisted, eligibility envelope stamped, budget consumed. No external effect yet. |
| QUEUED | Admitted to the dispatch queue. |
| SCHEDULED | Dispatch lease acquired; dispatch-time gates running. |
| DISPATCHED | Envelope verified, eligibility re-evaluated live, authority re-checked, handed to the adapter. |
| ATTEMPTING | Adapter executing. The only state where external effect may occur. |
| VERIFYING | Adapter evidence recorded; canonical outcome not yet decided. |
| UNKNOWN | Execution outcome uncertain (fault, crash, timeout). Never re-executed blindly. |
| VERIFIED_SUCCESS | Read-after-write observed the effect. Terminal. |
| VERIFIED_NOOP | Read-after-write showed the effect already present (idempotent pre-read hit). Terminal. |
| FAILED_RETRYABLE | Proven no mutation (or verification failed); may be re-queued. |
| FAILED_TERMINAL | Will not succeed on retry (e.g. unsupported action). Terminal. |
| SAFE_RETRY | Read-back proved no external effect. This intent closes; a fresh intent lineage may be created. |
| DEFERRED | Safe mode or saturation stopped dispatch before any attempt. Resumable. |
| CANCELLED | Operator-cancelled. Terminal. |

## Transition table

```
ELIGIBLE            -> INTENT_CREATED
INTENT_CREATED      -> QUEUED
QUEUED              -> QUEUED | SCHEDULED | DEFERRED
SCHEDULED           -> QUEUED | DISPATCHED
DISPATCHED          -> ATTEMPTING | UNKNOWN
ATTEMPTING          -> VERIFYING | UNKNOWN | FAILED_RETRYABLE
VERIFYING           -> VERIFIED_SUCCESS | VERIFIED_NOOP | FAILED_RETRYABLE | FAILED_TERMINAL
UNKNOWN             -> UNKNOWN | VERIFIED_SUCCESS | VERIFIED_NOOP | SAFE_RETRY | FAILED_TERMINAL
DEFERRED            -> QUEUED
FAILED_RETRYABLE    -> QUEUED
SAFE_RETRY          -> (none; closed. Fresh intent lineage only.)
VERIFIED_SUCCESS    -> (none; absorbing)
VERIFIED_NOOP       -> (none; absorbing)
FAILED_TERMINAL     -> (none; absorbing)
CANCELLED           -> (none; absorbing)
```

Notes:

- `QUEUED -> QUEUED` and `SCHEDULED -> QUEUED` are reconcile requeues: the intent never dispatched, so it returns to the queue with its evidence intact.
- `DISPATCHED -> UNKNOWN` is the resume path: after a crash, an intent found in DISPATCHED is treated as uncertain until read-back says otherwise.
- `UNKNOWN -> UNKNOWN` records a failed read-back: the uncertainty is re-affirmed with fresh evidence, not silently kept.
- `SAFE_RETRY` has no outgoing transition by design. The retry is a NEW intent (new batch_id, new intent_id), never this one re-executed. This is the machine form of "never silently retry an uncertain non-idempotent mutation."
- Terminal states are absorbing. There is no transition out, and the check enforces it.

## The fold (decision replay)

`st.fold_intents()` folds the append-only `intents.jsonl` stream (intent records, transition records, adapter-evidence records) into per-intent current state plus full history. The fold is deterministic: the same record stream always yields the same state. Resume, reconcile, and the duplicate checks all read the fold, never a cached state. Replay here is decision replay: what was decided, when, on what evidence, through which transitions. Mutations are never replayed.

## Duplicate protection (two layers)

1. **Per intent_id.** The id is deterministic (`facebook:<action>:post:<id>:<batch_id>`). Creating an intent whose id already has a non-closed state is refused. Re-running a batch whose intents are terminal reports the terminal states idempotently: nothing re-created, no budget re-consumed, the platform never touched.
2. **Per target, cross-batch.** `target_in_flight()` refuses a new intent for a post that already has an in-flight intent under a different batch. The only states that do not block a fresh intent are terminal states and SAFE_RETRY (proven no effect).

## Within-batch duplicates

The orchestrator threads the guard's `batch_seen` set through evaluation, so the second occurrence of the same post in one batch gets the guard's DUPLICATE verdict and is dropped before any intent exists.
