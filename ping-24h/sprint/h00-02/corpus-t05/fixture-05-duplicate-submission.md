# T-05 fixture 05: duplicate submission

Status: FIXTURE ONLY. NOT wired into any suite. Do not execute against production dispatch.

Corpus: Wave B HOLD/recovery (T-05). Run in T-06 against f01, S5, classifyUnknownExecution.

Reference vocabulary: f01 identity stability (never reminted; retries reuse the row);
conditional claim (status 'created' AND retry_eligible; second claim matches zero rows);
attempt-fencing.ts fencing-token CAS.

## Setup

1. The same logical work is submitted twice: double-clicked UI submit, retried HTTP
   POST, or two scheduler polls racing on the same intent. Both submissions carry
   the same intent identity (idempotency key / intentId).
2. First submission creates mission row M1: status 'created', retry_eligibility TRUE.

## Trigger

Second submission arrives while M1 is 'created', 'assigned', 'running', or HOLD.

## Invariant under test

UNKNOWN EFFECT → HOLD → RECONCILE → PROVE EFFECT / PROVE ABSENCE / HUMAN DECISION

The duplicate is an UNKNOWN EFFECT risk: if both rows dispatch, the consequential
effect executes twice. The invariant's PROVE ABSENCE arm covers the duplicate's
second effect (its effect must be proven absent).

## Expected correct behavior

- Exactly ONE logical mission row exists for the intent identity. The second
  submission dedups onto M1 (returns the existing mission reference); no second
  row is created, or a second row is created in a terminal dedup state that can
  never dispatch.
- If a second row is created by a race: the conditional claim guarantees only one
  claim succeeds; fencing-token CAS guarantees at most one effectful attempt.
- Final state: effect_count exactly 1 if the effect executed; one row carries the
  reconciled outcome (SUCCEEDED), the duplicate row (if any) carries a dedup
  marker pointing at the winner, never its own effect.
- Identity is stable across HOLD, restarts, and re-attempts: the winner row is
  never reminted.

## Known hostile outcome (must FAIL the fixture)

Two rows both reaching 'running' and both executing the effect (fencing absent),
or the duplicate submission resetting a HOLD row to 'created' (re-opens an
unknown-outcome mission to redispatch). Either doubles a consequential effect.
