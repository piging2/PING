# T-05 fixture 04: death after result before journaling

Status: FIXTURE ONLY. NOT wired into any suite. Do not execute against production dispatch.

Corpus: Wave B HOLD/recovery (T-05). Run in T-06 against f01, S5, classifyUnknownExecution.

Reference vocabulary: journal as the evidence authority (typed decisions journaled);
f01 _failMission gate (fail path emits MISSION_FAILURE_DERIVED as evidence, never HOLD);
proven lifecycle OPEN → KNOWN_PERMANENT → RESOLVED → REOPENED (13/13).

## Setup

1. A mission row exists: status 'running', effect_count 1 (the effect is PROVEN,
   e.g. idempotent read or the effect's own receipt is in hand).
2. The worker computes the result and holds it in memory / local scratch, but is
   KILLED before the journal write commits: the authoritative outcome record was
   never journaled.
3. The journal shows the mission as unresolved; the result exists only in the
   dead worker's unrecovered local state.

## Trigger

Orphan detection finds a 'running' row, effect proven (effect_count 1), result
unrecorded, worker dead.

## Invariant under test

UNKNOWN EFFECT → HOLD → RECONCILE → PROVE EFFECT / PROVE ABSENCE / HUMAN DECISION

Note: the effect is PROVEN here; the unknown is the RESULT's journaling. The
invariant still applies because the mission outcome is unknown to the system.

## Expected correct behavior

- HOLD with retry_eligibility = FALSE (no re-execution of a proven effect, ever).
- Reconciliation recovers or re-derives the result WITHOUT re-executing the
  effect: re-read from the effect channel, replay from idempotency-key
  artifacts, or re-derive deterministically from inputs.
- The recovered result is journaled exactly once (single commit; journal
  dedup on mission identity). Outcome then resolves to SUCCEEDED with the
  journaled evidence attached, reconciliation_required FALSE.
- If the result cannot be recovered or re-derived deterministically:
  HUMAN DECISION (continued HOLD with a recovery request), NOT a fabricated
  result and NOT a silent FAILED. The _failMission gate emits derived failure
  records only for proven failures; an unjournaled-but-proven effect is not one.

## Known hostile outcome (must FAIL the fixture)

Re-executing the effect to "recompute" the result (double effect), or journaling
two result records for one mission (duplicate journaling breaks the evidence
authority), or marking FAILED on a proven effect (violates UNKNOWN never
collapses to FAILED).
