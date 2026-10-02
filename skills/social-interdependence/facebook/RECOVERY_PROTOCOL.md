# Recovery Protocol

How the slice recovers from crashes, faults, and platform failures. The rule that governs everything: **reconcile, never replay.** An uncertain external mutation is never re-executed. Recovery reads external state and decides from what it observes.

## Crash points and what survives them

The orchestrator is kill-safe between every transition because all state is append-only and fsync'd before the next step. The tested crash points:

| Crash point | Durable state at kill | Recovery |
|---|---|---|
| after_decision | Decision record only, no intent | Fresh batch re-run; exactly one mutation |
| after_intent | Intent in INTENT_CREATED | Reconcile requeues; resume drives to terminal; one mutation |
| before_execute | Intent in INTENT_CREATED/SCHEDULED | Same as above; the adapter was never touched |
| after_execute | Intent executed, evidence maybe lost | Read-back: effect present -> VERIFIED_SUCCESS; never a second execute |
| after_verify | Intent terminal, observation maybe lost | Observation re-derived from the transition stream; no re-execution |

Each crash point is covered by a kill test: crash, reconcile, resume, then assert exactly one external mutation and an honest terminal state.

## The UNKNOWN state

UNKNOWN means "the adapter was asked, and we cannot prove what happened." It is entered on: adapter faults (timeout, crash mid-request), exceptions during execute, or resume finding an intent in DISPATCHED/ATTEMPTING after a crash. It is resolved ONLY by `recover_unknown`, which reads external state:

- **Effect present** (post liked / comment visible): transition UNKNOWN -> VERIFIED_SUCCESS, with the read-after-write verification record. The adapter's lost acknowledgement is irrelevant; the observation is what counts.
- **Effect absent**: transition UNKNOWN -> SAFE_RETRY. Read-back proved no external effect. This intent is never re-executed; the scheduler may create a fresh intent (new batch lineage) for the target.
- **Read-back impossible** (platform down, read raises): transition UNKNOWN -> UNKNOWN, recording the failed read as fresh evidence. The intent stays UNKNOWN. No guess, no retry, no inference. It will be tried again by the next reconcile, and the next, until the platform answers or an operator cancels it.

## Fault shapes and their honest outcomes

| Fault | First outcome | After recovery |
|---|---|---|
| Timeout before the request reached Facebook | UNKNOWN -> SAFE_RETRY (read-back: no effect) | Fresh intent may be created; this one never re-executes |
| Crash during the request (mutated, acknowledgement lost) | UNKNOWN -> VERIFIED_SUCCESS (read-back: effect present) | Done; exactly one mutation |
| Timeout after success | UNKNOWN -> VERIFIED_SUCCESS (read-back: effect present) | Done; exactly one mutation |
| Adapter lies about success | FAILED_RETRYABLE + verification_failure event | Watchdog counts it; 3 such failures open the breaker |
| Checkpoint/abort signal | FAILED_RETRYABLE, `attempted: true`, no mutation | Resume re-drives through the full gate chain |
| Expired credential | FAILED_RETRYABLE, `attempted: false` | Resume re-drives after re-login; never a blind retry |
| Platform outage at dispatch | DEFERRED (safe mode; the adapter was never touched) | Resume when health returns |
| Platform dies mid-pass (probe OK, execute/read fail) | UNKNOWN stays UNKNOWN | Waits for the platform; no guess |

## Reconcile procedure (`si_fb_reconcile.py run`)

1. Release dead dispatch leases (holder gone or expired).
2. For intents in INTENT_CREATED/QUEUED/SCHEDULED: requeue (transition back to QUEUED with the reason recorded). They never dispatched; there is nothing to recover.
3. For intents in DISPATCHED/ATTEMPTING: transition to UNKNOWN (outcome uncertain after crash), then `recover_unknown`.
4. For intents in UNKNOWN/VERIFYING: `recover_unknown` / re-run verification against current external state.
5. Terminal intents: untouched. Observations are never rewritten.

`--promote-deferred` moves DEFERRED intents back to QUEUED (safe mode cleared).

## Resume procedure (`orchestrator.py resume`)

Re-drives every non-terminal intent of the batch through `drive_intent`, which dispatches on current state: INTENT_CREATED/QUEUED/SCHEDULED go through the full dispatch gate chain (envelope, live eligibility, authority, breakers, lease); DISPATCHED/ATTEMPTING/UNKNOWN go through read-back recovery only, never a second execute; DEFERRED/FAILED_RETRYABLE re-enter the queue.

## What recovery never does

- Never re-executes an intent in UNKNOWN.
- Never deletes or rewrites a transition, observation, or decision record.
- Never invents evidence: if the platform cannot be read, the state stays UNKNOWN with the failed read recorded.
- Never treats "no record of failure" as "success": only an orchestrator read-after-write observation of the effect counts.
