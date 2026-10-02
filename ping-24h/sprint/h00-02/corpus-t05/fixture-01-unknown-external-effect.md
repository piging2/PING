# T-05 fixture 01: unknown external effect

Status: FIXTURE ONLY. NOT wired into any suite. Do not execute against production dispatch.

Corpus: Wave B HOLD/recovery (T-05). Run in T-06 against f01, S5, classifyUnknownExecution.

Reference vocabulary: f01 mission_runtime.js (status, retry_eligibility, effect_count,
outcome UNKNOWN | SUCCEEDED | FAILED | SAFE_TO_RETRY, hold_record, reconciliation_required).

## Setup

1. A mission row exists in ping_missions with status 'created', retry_eligibility TRUE,
   effect_count 0, outcome NULL.
2. The mission targets a CONSEQUENTIAL external effect (non-idempotent by default
   assumption): sending a customer email, submitting a form, posting a payment.
3. The worker claims the mission (status 'assigned', then 'running'), dispatches the
   effect through the effect channel, and the acknowledgement path fails:
   timeout, transport drop, or channel response lost. Effect actually happened; the
   system cannot prove it from this vantage point.

## Trigger

Dispatch attempt completes on the effect side; acknowledgement never arrives.
The claim/lease window closes with outcome unknown.

## Invariant under test

UNKNOWN EFFECT → HOLD → RECONCILE → PROVE EFFECT / PROVE ABSENCE / HUMAN DECISION

## Expected correct behavior

- The mission lands in HOLD with retry_eligibility = FALSE (structural
  non-dispatchability, not a status-label convention). HOLD is never claimable by
  the scheduler, even if status were mis-set.
- hold_record captures: dispatch attempted at <ts>, ack missing, effect possibly
  occurred, reconciler identity, evidence gathered.
- Reconciliation resolves exactly one way:
  - PROVE EFFECT: independent evidence shows the effect occurred exactly once
    (channel receipt, idempotency-key lookup, provider log). Then outcome SUCCEEDED,
    reconciliation_required FALSE, effect_count 1. Never re-executed.
  - PROVE ABSENCE: independent evidence shows the effect never occurred
    (channel never received it, dead-letter proof). Then outcome SAFE_TO_RETRY;
    the re-attempt reuses the same row (identity stable), effect_count must read
    exactly 1 after the single real execution.
  - HUMAN DECISION: evidence cannot settle the question. Then continued HOLD with
    the human-decision request attached. The machine does not guess.
- Binary scoring for T-06: never-redispatch-unknown-consequential-effect = PASS only
  if effect_count is exactly 1 at the end and no second real execution occurred.

## Known hostile outcome (must FAIL the fixture)

Any path that retries the effect on the timeout path alone: automatic redispatch
from the lease-expiry/timeout handler without reconciliation. This is the
reaper-gap class: HOLD → created → redispatch ~60s later executes a consequential
effect a second time. A redispatch without PROVE ABSENCE is the failure mode.
