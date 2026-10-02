# T-05 fixture 07: restart with HOLD present

Status: FIXTURE ONLY. NOT wired into any suite. Do not execute against production dispatch.

Corpus: Wave B HOLD/recovery (T-05). Run in T-06 against f01, S5, classifyUnknownExecution.

Reference vocabulary: f01 HOLD invariant (HOLD is structurally non-claimable;
conditional claim and getPending() both require retry_eligibility, which HOLD
clears); cross-restart dedup guard (conditional on running/assigned); identity
stable across HOLD, restarts, re-attempts.

## Setup

1. A mission row exists in HOLD: status 'HOLD' (or parked), retry_eligibility FALSE,
   effect_count 0 or 1, hold_record with notes merged, outcome UNKNOWN,
   reconciliation_required TRUE.
2. The scheduler process restarts (deploy, crash, reboot). A second scheduler
   instance may also start concurrently during the restart window.

## Trigger

Post-restart scheduler boot, and concurrent-scheduler overlap: both attempt to
claim pending work.

## Invariant under test

UNKNOWN EFFECT → HOLD → RECONCILE → PROVE EFFECT / PROVE ABSENCE / HUMAN DECISION

The restart must not shortcut the invariant: HOLD is the "still unknown" marker,
and a restart is not reconciliation.

## Expected correct behavior

- The HOLD row survives the restart byte-identical: same mission_id, same
  effect_count, same hold_record, still retry_eligibility FALSE, still
  reconciliation_required TRUE.
- Neither the restarted scheduler nor a concurrent second scheduler can claim
  the HOLD row: the conditional claim requires retry_eligibility, which HOLD
  clears structurally. Non-dispatchability holds even if a code path mis-reads
  status, because the structural gate is independent of the label.
- The restart does not mint a new row for the same intent (cross-restart dedup
  guard: conditional on running/assigned state; the HOLD row is the single
  canonical record).
- After the restart, reconciliation can proceed from the preserved hold_record:
  PROVE EFFECT / PROVE ABSENCE / HUMAN DECISION, each moving the row only via
  reconciliation-only transitions (SUCCEEDED, FAILED via proven-failures-only
  gate, SAFE_TO_RETRY, or continued HOLD).

## Known hostile outcome (must FAIL the fixture)

Restart re-seeds or replays the mission table from an intent queue and creates a
fresh 'created' row for the held intent (identity reminted, effect double-risk),
or the boot path resets retry_eligibility as a "cleanup" (re-opens HOLD to
dispatch), or two schedulers both claim during overlap (conditional claim broken).
